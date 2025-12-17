# Spark Note SDK

A proof-of-concept SDK demonstrating note creation, nullifier generation, and commitment operations for privacy-preserving transactions.

[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

This project implements a simplified Spark protocol for note management:

- **Notes**: Value commitments with cryptographic hiding
- **Nullifiers**: Unique identifiers to prevent double-spending
- **Commitments**: SHA-256 hashes binding values to secrets

## Quick Start

### JavaScript/TypeScript

```typescript
import { SparkSDK } from '@spark-note-poc/sdk';

const sdk = new SparkSDK();
await sdk.init();

// Create a note
const secret = crypto.getRandomValues(new Uint8Array(32));
const note = await sdk.createNote(1000n, secret);

// Generate nullifier for spending
const nullifier = await sdk.generateNullifier(note, secret);

// Check if already spent
const isSpent = await sdk.isNullifierSpent(nullifier, spentNullifiers);
```

### Rust

```rust
use spark_note_core::{create_note, generate_nullifier, is_nullifier_spent};
use std::collections::HashSet;

// Create a note
let secret = vec![1, 2, 3, 4, 5, 6, 7, 8];
let note = create_note(1000, secret.clone())?;

// Generate nullifier
let nullifier = generate_nullifier(&note, secret);

// Check if spent
let spent_set: HashSet<Vec<u8>> = HashSet::new();
let is_spent = is_nullifier_spent(&nullifier, &spent_set);
```

## Project Structure

```
spark-note-poc/
├── spark-note-core/        # Rust core library
│   ├── src/
│   │   ├── lib.rs          # UniFFI exports
│   │   ├── note.rs         # SparkNote struct
│   │   ├── nullifier.rs    # Nullifier functions
│   │   └── wasm.rs         # WASM bindings
│   └── pkg/                # wasm-pack output
├── bindings/javascript/    # TypeScript SDK
│   ├── src/
│   │   └── index.ts        # SparkSDK class
│   └── wasm/               # WASM files
└── examples/web-demo/      # React demo app
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    JavaScript SDK                        │
│              (@spark-note-poc/sdk)                       │
├─────────────────────────────────────────────────────────┤
│                   WASM Bindings                          │
│              (wasm-bindgen exports)                      │
├─────────────────────────────────────────────────────────┤
│                   Rust Core                              │
│            (spark-note-core crate)                       │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  note.rs  │  │ nullifier.rs │  │ Crypto (sha2,   │   │
│  │ SparkNote │  │  Nullifier   │  │  blake3)        │   │
│  └───────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Building from Source

### Prerequisites

- Rust 1.70+
- Node.js 18+
- wasm-pack

### Build Rust Core

```bash
cd spark-note-core
cargo build --release
cargo test
```

### Build WASM

```bash
cd spark-note-core
wasm-pack build --target web --features wasm
```

### Build JavaScript SDK

```bash
cd bindings/javascript
npm install
npm run build
```

### Run Demo

```bash
cd examples/web-demo
npm install
npm run dev
```

## API Reference

### SparkNote

| Field | Type | Description |
|-------|------|-------------|
| value | u64/bigint | Monetary value |
| secret | Vec<u8>/Uint8Array | Random secret |
| commitment | Vec<u8>/Uint8Array | SHA-256 hash |

### Functions

| Function | Description |
|----------|-------------|
| `createNote(value, secret)` | Create new note with commitment |
| `generateNullifier(note, secret)` | Generate BLAKE3 nullifier |
| `isNullifierSpent(nullifier, spentSet)` | Check if nullifier is spent |

## License

MIT License - see [LICENSE](LICENSE)
