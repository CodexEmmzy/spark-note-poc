# ILE Labs Spark SDK

[![ILE Labs](https://img.shields.io/badge/Product-ILE%20Labs-blue.svg)](https://ilelabs.io)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange.svg)](https://www.rust-lang.org/)
[![Tezos](https://img.shields.io/badge/Tezos-Ghostnet-blue.svg)](https://tezos.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

**ILE Labs Spark** is a production-grade privacy infrastructure for the Tezos ecosystem. Built by [ILE Labs](https://ilelabs.io), it provides high-performance, ZK-SNARK-powered tools for managing private notes, commitments, and nullifiers.

## Overview

Spark Note enables privacy-preserving transactions on Tezos by decoupling asset ownership from spend events. It leverages state-of-the-art Zero-Knowledge Proofs to ensure value safety and double-spend protection without compromising user privacy.

- **High Performance**: Optimized Pedersen commitments over the Jubjub curve.
- **ZK-SNARKs**: Groth16 proofs for range checks and Merkle inclusion.
- **On-Chain Registry**: Production-ready CameLIGO contracts for on-chain verification.
- **Developer First**: Clean APIs, durable persistence via `sled`, and cross-platform support (WASM/UniFFI).

## Product Suite

### 1. Spark SDK (Rust)
The core engine for privacy logic.
```bash
cargo add spark-note-sdk
```

### 2. Tezos Nullifier Registry
The source of truth for all private transactions.
- **Contract**: `KT1TezosDummyAddressForPOC` (Ghostnet)
- **Entrypoints**: `deposit(commitment, proof)`, `spend(nullifier, proof)`

### 3. Web & Mobile Integration
- **NPM Package**: `@ile-labs/spark-note` (WASM)
- **Native Bindings**: Swift, Kotlin, and Python support via UniFFI.

## Getting Started

### Installation
Add to your `Cargo.toml`:
```toml
[dependencies]
spark-note-sdk = "0.1.0"
```

### Basic Usage
```rust
use spark_note_sdk::{create_note, NoteManager};
use spark_note_sdk::secret::Secret;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Create a private note
    let secret = Secret::new(vec![1; 32]);
    let note = create_note(1000, secret)?;

    // 2. Manage with ILE Labs NoteManager
    let mut manager = NoteManager::open("./storage")?;
    manager.add_note("user_note_1", note)?;

    // 3. Sync with Tezos Ghostnet
    let client = manager.tezos_client().unwrap();
    let result = manager.sync_deposit_to_tezos("user_note_1", "edsk...").await?;
    
    println!("Private Transaction Applied: {}", result.operation_hash);
    Ok(())
}
```

## Running the Demo
Showcase the full ILE Labs Spark lifecycle:
```bash
cargo run --example ghostnet_demo
```

## Roadmap

- [x] **Core Privacy Infrastructure**: Jubjub commitments & Poseidon nullifiers.
- [x] **Tezos Ghostnet Integration**: Live RPC synchronization and scanning.
- [x] **Durable State**: Sled-based persistence for SDK reliability.
- [ ] **On-Chain Groth16 Verifier**: Native Michelson instructions for proof validation.
- [ ] **Cross-Chain Bridging**: Extending Tezos privacy to other ecosystem layers.

## About ILE Labs
ILE Labs is a research and development firm dedicated to building secure, scalable, and privacy-preserving infrastructure for the decentralized web.

## License
Apache License 2.0 - see [LICENSE](LICENSE)
