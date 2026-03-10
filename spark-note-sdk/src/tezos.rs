//! Tezos blockchain integration
//! 
//! This module provides a client for interacting with the Tezos blockchain,
//! specifically for depositing commitments and spending nullifiers on-chain.

use serde::{Deserialize, Serialize};
use reqwest::Client;
use crate::error::SparkResult;
use crate::manager::PublicNote;

/// Result of a Tezos operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TezosOperationResult {
    pub operation_hash: String,
    pub status: String,
}

/// A client for the Tezos NullifierRegistry contract
#[derive(Debug)]
pub struct TezosClient {
    #[allow(dead_code)]
    rpc_node: String,
    #[allow(dead_code)]
    contract_address: String,
    #[allow(dead_code)]
    client: Client,
}

impl TezosClient {
    /// Create a new TezosClient
    pub fn new(rpc_node: &str, contract_address: &str) -> Self {
        Self {
            rpc_node: rpc_node.to_string(),
            contract_address: contract_address.to_string(),
            client: Client::new(),
        }
    }

    /// Deposit a commitment on-chain
    pub async fn deposit(
        &self,
        note: &PublicNote,
        proof: &[u8],
        secret_key: &str,
    ) -> SparkResult<TezosOperationResult> {
        println!("Depositing commitment {} to Tezos contract {}...", 
                hex::encode(&note.commitment), self.contract_address);
        
        // Get current head for branch
        let branch = self.get_head_hash().await?;
        
        // Get sender address from secret key (simplified - in real impl use proper key derivation)
        let sender_address = self.derive_address_from_secret(secret_key)?;
        
        // Get counter for the sender
        let counter = self.get_counter(&sender_address).await?;
        let next_counter = counter + 1;
        
        // Forge the operation (simplified Michelson call)
        let operation = self.forge_deposit_operation(&branch, next_counter, note, proof)?;
        
        // Sign the operation
        let signature = self.sign_operation(&operation, secret_key)?;
        
        // Inject the operation
        let op_hash = self.inject_operation(&operation, &signature).await?;
        
        Ok(TezosOperationResult {
            operation_hash: op_hash,
            status: "pending".to_string(),
        })
    }

    /// Spend a nullifier on-chain
    pub async fn spend(
        &self,
        nullifier: &[u8],
        proof: &[u8],
        secret_key: &str,
    ) -> SparkResult<TezosOperationResult> {
         println!("Spending nullifier {} on Tezos contract {}...", 
                 hex::encode(nullifier), self.contract_address);

         let branch = self.get_head_hash().await?;
         let sender_address = self.derive_address_from_secret(secret_key)?;
         let counter = self.get_counter(&sender_address).await?;
         let next_counter = counter + 1;
         
         let operation = self.forge_spend_operation(&branch, next_counter, nullifier, proof)?;
         let signature = self.sign_operation(&operation, secret_key)?;
         let op_hash = self.inject_operation(&operation, &signature).await?;
         
         Ok(TezosOperationResult {
             operation_hash: op_hash,
             status: "pending".to_string(),
         })
    }

    /// Helper to get the current head hash (branch) from RPC
    async fn get_head_hash(&self) -> SparkResult<String> {
        let url = format!("{}/chains/main/blocks/head/hash", self.rpc_node);
        let resp = self.client.get(url).send().await
            .map_err(|e| crate::error::SparkError::OperationError { message: e.to_string() })?;
        let hash: String = resp.json().await
            .map_err(|e| crate::error::SparkError::OperationError { message: e.to_string() })?;
        Ok(hash)
    }

    /// Fetch the full storage of the contract
    pub async fn get_contract_storage(&self) -> SparkResult<serde_json::Value> {
        let url = format!("{}/chains/main/blocks/head/context/contracts/{}/storage", self.rpc_node, self.contract_address);
        let resp = self.client.get(url).send().await
            .map_err(|e| crate::error::SparkError::OperationError { message: e.to_string() })?;
        let storage: serde_json::Value = resp.json().await
            .map_err(|e| crate::error::SparkError::OperationError { message: e.to_string() })?;
        Ok(storage)
    }

    /// Fetch keys from a BigMap (Simulation of Indexer/RPC query)
    /// In a real scenario, this would iterate over the big_map keys via TzKT or a node with indexer.
    pub async fn get_big_map_keys(&self, _big_map_id: i64) -> SparkResult<Vec<Vec<u8>>> {
        // --- Ghostnet Indexer Logic ---
        // let url = format!("https://api.ghostnet.tzkt.io/v1/bigmaps/{}/keys", big_map_id);
        
        // For POC, return dummy keys that represent "found" commitments
        Ok(vec![
            vec![0u8; 32],
            vec![1u8; 32],
        ])
    }

    /// Fetch deposit events (commitments) from the contract storage
    /// For CameLIGO big_maps, we would query the big_map contents via RPC or Indexer.
    pub async fn fetch_deposit_events(&self) -> SparkResult<Vec<Vec<u8>>> {
        println!("Fetching commitments from Tezos contract {}...", self.contract_address);
        
        // 1. Get storage to find the commitments big_map ID
        let storage = self.get_contract_storage().await.unwrap_or_default();
        
        // Michelson storage for our CameLIGO contract usually looks like:
        // Pair (Pair (Big_map_ID commitments) (Big_map_ID nullifiers)) (Bytes vk_hash)
        // We simulate finding the ID 123 here.
        let big_map_id = storage.get("args").and_then(|a| a.get(0)).and_then(|a| a.get("args")).and_then(|a| a.get(0)).and_then(|a| a.as_i64()).unwrap_or(123);
        
        self.get_big_map_keys(big_map_id).await
    }

    /// Get the counter for an address
    async fn get_counter(&self, address: &str) -> SparkResult<u64> {
        let url = format!("{}/chains/main/blocks/head/context/contracts/{}/counter", self.rpc_node, address);
        let resp = self.client.get(url).send().await
            .map_err(|e| crate::error::SparkError::OperationError { message: format!("Failed to get counter: {}", e) })?;
        let counter_str: String = resp.json().await
            .map_err(|e| crate::error::SparkError::OperationError { message: format!("Failed to parse counter: {}", e) })?;
        counter_str.parse::<u64>()
            .map_err(|e| crate::error::SparkError::OperationError { message: format!("Invalid counter: {}", e) })
    }

    /// Derive address from secret key (simplified)
    fn derive_address_from_secret(&self, _secret_key: &str) -> SparkResult<String> {
        // In real implementation, derive from ed25519 public key
        // For POC, return a dummy address
        Ok("tz1DummyAddressForPOC".to_string())
    }

    /// Forge a deposit operation
    fn forge_deposit_operation(&self, branch: &str, counter: u64, note: &PublicNote, proof: &[u8]) -> SparkResult<serde_json::Value> {
        // Simplified Michelson operation forging
        let operation = serde_json::json!({
            "branch": branch,
            "contents": [{
                "kind": "transaction",
                "source": "tz1DummyAddressForPOC",
                "fee": "10000",
                "counter": counter.to_string(),
                "gas_limit": "20000",
                "storage_limit": "1000",
                "amount": "0",
                "destination": self.contract_address,
                "parameters": {
                    "entrypoint": "deposit",
                    "value": {
                        "prim": "Pair",
                        "args": [
                            {"bytes": hex::encode(&note.commitment)},
                            {"bytes": hex::encode(proof)}
                        ]
                    }
                }
            }]
        });
        Ok(operation)
    }

    /// Sign an operation (simplified)
    fn sign_operation(&self, _operation: &serde_json::Value, _secret_key: &str) -> SparkResult<String> {
        // In real implementation, hash and sign with ed25519
        // For POC, return dummy signature
        Ok("edsigDummySignatureForPOC".to_string())
    }

    /// Inject an operation
    async fn inject_operation(&self, operation: &serde_json::Value, signature: &str) -> SparkResult<String> {
        let signed_op = serde_json::json!({
            "signed_operation": {
                "operation": operation,
                "signature": signature
            }
        });

        let url = format!("{}/injection/operation", self.rpc_node);
        let resp = self.client.post(url)
            .json(&signed_op)
            .send().await
            .map_err(|e| crate::error::SparkError::OperationError { message: format!("Failed to inject operation: {}", e) })?;
        
        if resp.status().is_success() {
            let op_hash: String = resp.json().await
                .map_err(|e| crate::error::SparkError::OperationError { message: format!("Failed to parse operation hash: {}", e) })?;
            Ok(op_hash)
        } else {
            Err(crate::error::SparkError::OperationError { 
                message: format!("Injection failed with status: {}", resp.status()) 
            })
        }
    }

    /// Forge a spend operation
    fn forge_spend_operation(&self, branch: &str, counter: u64, nullifier: &[u8], proof: &[u8]) -> SparkResult<serde_json::Value> {
        let operation = serde_json::json!({
            "branch": branch,
            "contents": [{
                "kind": "transaction",
                "source": "tz1DummyAddressForPOC",
                "fee": "10000",
                "counter": counter.to_string(),
                "gas_limit": "20000",
                "storage_limit": "1000",
                "amount": "0",
                "destination": self.contract_address,
                "parameters": {
                    "entrypoint": "spend",
                    "value": {
                        "prim": "Pair",
                        "args": [
                            {"bytes": hex::encode(nullifier)},
                            {"bytes": hex::encode(proof)}
                        ]
                    }
                }
            }]
        });
        Ok(operation)
    }
}
