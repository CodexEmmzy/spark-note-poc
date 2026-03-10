# ILE Labs Spark SDK

[![ILE Labs](https://img.shields.io/badge/Product-ILE%20Labs-blue.svg)](https://ilelabs.org)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://www.rust-lang.org/)
[![Tezos](https://img.shields.io/badge/Tezos-Ghostnet-blue.svg)](https://tezos.com/)[![Tests](https://img.shields.io/badge/Tests-76%20passed-brightgreen.svg)](https://github.com/ILE-Labs/spark-note-poc)[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

**ILE Labs Spark** is a production-grade privacy infrastructure for the Tezos ecosystem. Built by [ILE Labs](https://ilelabs.org), it provides high-performance, ZK-SNARK-powered tools for managing private notes, commitments, and nullifiers.

## Overview

Spark Note enables privacy-preserving transactions on Tezos by decoupling asset ownership from spend events. It leverages state-of-the-art Zero-Knowledge Proofs to ensure value safety and double-spend protection without compromising user privacy.

- **High Performance**: Optimized Pedersen commitments over the Jubjub curve.
- **ZK-SNARKs**: Groth16 proofs for range checks and Merkle inclusion.
- **On-Chain Registry**: Production-ready CameLIGO contracts for on-chain verification.
- **Developer First**: Clean APIs, durable persistence via `sled`, and cross-platform support (WASM/UniFFI).

## Status

✅ **Core ZK-SNARK Implementation**: Groth16 proofs with Jubjub commitments and Poseidon hashing  
✅ **Cryptographic Primitives**: Pedersen commitments, nullifier generation, Merkle trees  
✅ **Tezos Integration**: RPC client with operation forging and injection  
✅ **Persistence**: Sled-based durable storage for notes and nullifiers  
✅ **Testing**: 76 comprehensive tests including property-based testing  
✅ **Documentation**: Complete API docs with working examples  

 **In Progress**: WASM bindings, UniFFI native bindings, production deployment  
 **Next Steps**: Trusted setup ceremony, contract deployment, performance optimization

## Getting Started

### Installation
Add ILE Labs Spark to your Rust project by including it in your `Cargo.toml`:

```toml
[dependencies]
spark-note-sdk = "0.1.0"
```

For the latest development version, use:

```toml
[dependencies]
spark-note-sdk = { git = "https://github.com/ILE-Labs/spark-note-poc", branch = "master" }
```

### Quick Start
ILE Labs Spark provides a simple API for creating and managing private notes on Tezos. Here's how to get started:

```rust
use spark_note_sdk::{create_note, NoteManager, TezosClient};
use spark_note_sdk::secret::Secret;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the SDK with persistent storage
    let mut manager = NoteManager::open("./spark-storage")?;
    
    // Create a private note with a value of 1000 tez
    let secret = Secret::new(vec![1; 32]); // In production, use secure randomness
    let note = create_note(1000, secret)?;
    
    // Store the note securely
    manager.add_note("my-private-note", note)?;
    
    // Connect to Tezos Ghostnet
    let tezos_client = TezosClient::new("https://rpc.ghostnet.teztnets.com")?;
    
    // Deposit the note to the blockchain (requires your Tezos account)
    let deposit_result = manager.sync_deposit_to_tezos(
        "my-private-note", 
        "edsk..." // Your Tezos private key
    ).await?;
    
    println!("Deposit successful! Operation hash: {}", deposit_result.operation_hash);
    
    // Later, spend the note privately
    let spend_result = manager.spend_note(
        "my-private-note",
        500, // Spend 500 tez
        "tz1..." // Recipient address
    ).await?;
    
    println!("Private spend completed: {}", spend_result.operation_hash);
    Ok(())
}
```

### API Overview

#### Core Components
- **`NoteManager`**: Main interface for managing private notes and blockchain interactions
- **`SparkNote`**: Represents a private note with value and cryptographic commitments
- **`TezosClient`**: Handles communication with Tezos RPC endpoints
- **`Secret`**: Secure key management for note creation and spending

#### Key Methods
- `create_note(value, secret)`: Create a new private note
- `NoteManager::open(path)`: Initialize persistent storage
- `add_note(id, note)`: Store a note securely
- `sync_deposit_to_tezos(note_id, private_key)`: Deposit note to blockchain
- `spend_note(note_id, amount, recipient)`: Spend part of a note privately

### Advanced Usage

#### Custom Tezos Networks
```rust
let mainnet_client = TezosClient::new("https://rpc.tzbeta.net")?;
let custom_client = TezosClient::new("https://your-custom-rpc.com")?;
```

#### Batch Operations
```rust
// Create multiple notes
let notes = (0..10).map(|i| create_note(100 * i, Secret::random())).collect::<Result<Vec<_>, _>>()?;

// Batch deposit
for (i, note) in notes.into_iter().enumerate() {
    manager.add_note(&format!("note-{}", i), note)?;
    manager.sync_deposit_to_tezos(&format!("note-{}", i), private_key).await?;
}
```

#### Error Handling
The SDK uses `Result<T, SparkError>` for all operations. Common errors include:
- `CryptoError`: Cryptographic operation failures
- `TezosError`: Blockchain interaction issues
- `StorageError`: Persistence layer problems

```rust
match manager.sync_deposit_to_tezos("note-id", private_key).await {
    Ok(result) => println!("Success: {}", result.operation_hash),
    Err(SparkError::TezosError(e)) => println!("Blockchain error: {}", e),
    Err(e) => println!("Other error: {}", e),
}
```

## Examples

### Running the Ghostnet Demo
Experience the full ILE Labs Spark workflow with our comprehensive demo:

```bash
# Clone the repository
git clone https://github.com/ILE-Labs/spark-note-poc.git
cd spark-note-poc

# Run the Ghostnet demonstration
cargo run --example ghostnet_demo
```

This demo showcases:
- Private note creation with cryptographic commitments
- ZK-SNARK proof generation for spending
- Tezos blockchain integration with operation injection
- End-to-end privacy-preserving transaction flow

### Web Demo
For web integration, check out our WASM example:

```bash
cd examples/web-demo
npm install
npm run dev
```

This demonstrates how ILE Labs Spark can be used in browser environments for decentralized applications.

## Roadmap

ILE Labs Spark is designed for production deployment across the Tezos ecosystem. Our development roadmap focuses on enterprise-grade features and cross-platform compatibility.

###  Completed Features
- **Core Privacy Infrastructure**: Jubjub curve Pedersen commitments with Poseidon hashing
- **ZK-SNARK Circuits**: Groth16 spending proofs with full Merkle inclusion verification
- **Tezos RPC Integration**: Complete operation lifecycle (forge, sign, inject)
- **Durable State Management**: Sled-based persistence for high-reliability deployments
- **Comprehensive Testing**: 76 automated tests including property-based cryptography validation
- **Developer Experience**: Full Rust API documentation and working examples

###  In Development
- **On-Chain Verification**: Native Michelson Groth16 verifier contracts
- **WASM Bindings**: NPM package for seamless web integration
- **Native SDKs**: Swift, Kotlin, and Python bindings via UniFFI
- **Production Deployment**: Trusted setup ceremony and mainnet contract deployment

###  Planned Features
- **Multi-Asset Support**: Extend beyond tez to support FA2 tokens
- **Batch Transactions**: Optimize for high-throughput privacy operations
- **Hardware Security**: Integration with HSMs and secure enclaves
- **Audit & Compliance**: Third-party security audit and regulatory compliance tools

### Contributing
ILE Labs welcomes contributions to Spark. See our [Contributing Guide](CONTRIBUTING.md) for details on development setup and coding standards.

For enterprise inquiries or custom integrations, contact us at [contact@ilelabs.org](mailto:contact@ilelabs.org).



## License
Apache License 2.0 - see [LICENSE](LICENSE)
