/// <reference types="vite/client" />

// Declare the WASM module from public folder
declare module '/wasm/spark_note_core.js' {
    interface WasmSparkNote {
        value: bigint;
        secret: Uint8Array;
        commitment: Uint8Array;
        free(): void;
    }

    export function createNote(value: bigint, secret: Uint8Array): WasmSparkNote;
    export function noteCommitment(note: WasmSparkNote): Uint8Array;
    export function generateNullifier(note: WasmSparkNote, secret: Uint8Array): Uint8Array;
    export function isNullifierSpent(nullifier: Uint8Array, spentSet: unknown): boolean;

    export default function init(module?: ArrayBuffer | WebAssembly.Module): Promise<void>;
}
