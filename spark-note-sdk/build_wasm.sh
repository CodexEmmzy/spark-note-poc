#!/bin/bash
# Spark Note WASM Build & Package Script

set -e

# 1. Build WASM with wasm-pack
echo "Building WASM module..."
wasm-pack build --target bundler --scope ile-labs

# 2. Add professional metadata to package.json
echo "Updating package.json..."
cat <<EOF > pkg/package.json
{
  "name": "@ile-labs/spark-note",
  "version": "0.1.0",
  "description": "ILE Labs Spark: High-performance privacy SDK for Tezos (Lelantus Spark)",
  "main": "spark_note_core.js",
  "types": "spark_note_core.d.ts",
  "repository": {
    "type": "git",
    "url": "https://github.com/codex-emmzy/spark-note-poc"
  },
  "keywords": [
    "tezos",
    "privacy",
    "zk-snark",
    "wasm"
  ],
  "author": "Spark Note Team",
  "license": "MIT"
}
EOF

echo "WASM Package ready in spark-note-core/pkg/"
