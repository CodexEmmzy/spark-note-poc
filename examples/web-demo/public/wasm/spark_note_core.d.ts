/* tslint:disable */
/* eslint-disable */

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly ffi_spark_note_core_uniffi_contract_version: () => number;
    readonly ffi_spark_note_core_rustbuffer_alloc: (a: number, b: bigint, c: number) => void;
    readonly ffi_spark_note_core_rustbuffer_from_bytes: (a: number, b: number, c: number) => void;
    readonly ffi_spark_note_core_rustbuffer_free: (a: number, b: number) => void;
    readonly ffi_spark_note_core_rustbuffer_reserve: (a: number, b: number, c: bigint, d: number) => void;
    readonly ffi_spark_note_core_rust_future_poll_u8: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_u8: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_u8: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_u8: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_i8: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_i8: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_i8: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_i8: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_u16: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_u16: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_u16: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_u16: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_i16: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_i16: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_i16: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_i16: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_u32: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_u32: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_u32: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_u32: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_i32: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_i32: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_i32: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_i32: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_u64: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_u64: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_u64: (a: bigint, b: number) => bigint;
    readonly ffi_spark_note_core_rust_future_free_u64: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_i64: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_i64: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_i64: (a: bigint, b: number) => bigint;
    readonly ffi_spark_note_core_rust_future_free_i64: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_f32: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_f32: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_f32: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_f32: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_f64: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_f64: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_f64: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_f64: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_pointer: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_pointer: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_pointer: (a: bigint, b: number) => number;
    readonly ffi_spark_note_core_rust_future_free_pointer: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_rust_buffer: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_rust_buffer: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_rust_buffer: (a: number, b: bigint, c: number) => void;
    readonly ffi_spark_note_core_rust_future_free_rust_buffer: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_poll_void: (a: bigint, b: number, c: bigint) => void;
    readonly ffi_spark_note_core_rust_future_cancel_void: (a: bigint) => void;
    readonly ffi_spark_note_core_rust_future_complete_void: (a: bigint, b: number) => void;
    readonly ffi_spark_note_core_rust_future_free_void: (a: bigint) => void;
    readonly uniffi_spark_note_core_fn_func_uniffi_create_note: (a: number, b: bigint, c: number, d: number) => void;
    readonly uniffi_spark_note_core_checksum_func_uniffi_create_note: () => number;
    readonly uniffi_spark_note_core_fn_func_uniffi_note_commitment: (a: number, b: number, c: number) => void;
    readonly uniffi_spark_note_core_checksum_func_uniffi_note_commitment: () => number;
    readonly uniffi_spark_note_core_fn_func_uniffi_generate_nullifier: (a: number, b: number, c: number, d: number) => void;
    readonly uniffi_spark_note_core_checksum_func_uniffi_generate_nullifier: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
