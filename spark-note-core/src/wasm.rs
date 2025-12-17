//! WebAssembly bindings for Spark Note Core
//!
//! This module provides JavaScript-compatible exports via wasm-bindgen.

use wasm_bindgen::prelude::*;

use crate::note::{self, SparkNote};
use crate::nullifier;
use crate::secret::Secret;
use crate::validation::{validate_secret, validate_value};

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// JavaScript-compatible SparkNote wrapper
#[wasm_bindgen]
pub struct WasmSparkNote {
    inner: SparkNote,
}

#[wasm_bindgen]
impl WasmSparkNote {
    /// Get the note's value
    #[wasm_bindgen(getter)]
    pub fn value(&self) -> u64 {
        self.inner.value
    }

    /// Get the note's secret as Uint8Array
    ///
    /// # Security Warning
    ///
    /// This method clones the secret bytes, creating a non-zeroized copy in JavaScript.
    /// The Rust-side secret will still be zeroized on drop, but the JavaScript copy
    /// will remain in memory until garbage collected.
    ///
    /// **Important**: Secrets should generally not be exposed to JavaScript. This method
    /// exists only for testing/debugging purposes. Production code should avoid calling
    /// this method.
    ///
    /// # Returns
    ///
    /// A `Vec<u8>` containing the secret bytes. **Handle with extreme care.**
    #[wasm_bindgen(getter)]
    pub fn secret(&self) -> Vec<u8> {
        self.inner.secret_bytes().to_vec()
    }

    /// Get the note's commitment as Uint8Array
    #[wasm_bindgen(getter)]
    pub fn commitment(&self) -> Vec<u8> {
        self.inner.commitment.clone()
    }

    /// Serialize the note to JSON string
    #[wasm_bindgen(js_name = toJSON)]
    pub fn to_json(&self) -> Result<String, JsError> {
        serde_json::to_string(&self.inner)
            .map_err(|e| JsError::new(&format!("Serialization error: {:?}", e)))
    }

    /// Deserialize a note from JSON string
    ///
    /// WARNING: This will not deserialize secrets. Secrets should never be
    /// deserialized from untrusted sources. Use create_note instead.
    #[wasm_bindgen(js_name = fromJSON)]
    pub fn from_json(json: &str) -> Result<WasmSparkNote, JsError> {
        // SparkNote deserialization is disabled for security
        // Secrets should never be loaded from JSON
        Err(JsError::new("SparkNote cannot be deserialized - secrets must not be loaded from untrusted sources. Use create_note() instead."))
    }
}

impl Drop for WasmSparkNote {
    fn drop(&mut self) {
        // Secret will be automatically zeroized when inner SparkNote is dropped
        // No explicit cleanup needed
    }
}

/// Create a new SparkNote with the given value and secret
///
/// @param value - The monetary value of the note (u64)
/// @param secret - A random secret as Uint8Array (must not be empty)
/// @returns WasmSparkNote - The created note
/// @throws Error if the secret is empty or value is invalid
#[wasm_bindgen(js_name = createNote)]
pub fn create_note(value: u64, secret: Vec<u8>) -> Result<WasmSparkNote, JsError> {
    // Validate inputs FIRST before creating Secret
    validate_value(value)
        .map_err(|e| JsError::new(&format!("Invalid value: {} (value: {})", e.detailed_message(), value)))?;
    
    validate_secret(&secret)
        .map_err(|e| JsError::new(&format!("Invalid secret: {} (length: {})", e.detailed_message(), secret.len())))?;
    
    let secret = Secret::from(secret);
    let inner = note::create_note(value, secret)
        .map_err(|e| {
            // Preserve full error context using detailed_message
            JsError::new(&format!(
                "Failed to create note: {} (value: {}, secret_len: {})",
                e.detailed_message(), value, secret.len()
            ))
        })?;
    Ok(WasmSparkNote { inner })
}

/// Get the commitment hash of a note
///
/// @param note - The SparkNote to get commitment from
/// @returns Uint8Array - The 32-byte commitment hash
#[wasm_bindgen(js_name = noteCommitment)]
pub fn note_commitment(note: &WasmSparkNote) -> Vec<u8> {
    note::note_commitment(&note.inner)
}

/// Generate a nullifier for spending a note
///
/// @param note - The SparkNote to generate nullifier for
/// @param secret - The spending secret as Uint8Array
/// @returns Uint8Array - The 32-byte nullifier hash
#[wasm_bindgen(js_name = generateNullifier)]
pub fn generate_nullifier(note: &WasmSparkNote, secret: Vec<u8>) -> Vec<u8> {
    let secret = Secret::from(secret);
    nullifier::generate_nullifier(&note.inner, &secret).to_vec()
}

/// Check if a nullifier has been spent
///
/// @param nullifier - The nullifier to check as Uint8Array
/// @param spent_set - Array of spent nullifiers (each as Uint8Array)
/// @returns boolean - True if nullifier is in the spent set
#[wasm_bindgen(js_name = isNullifierSpent)]
pub fn is_nullifier_spent(nullifier: Vec<u8>, spent_set: JsValue) -> Result<bool, JsError> {
    use std::collections::HashSet;

    let spent_array: Vec<Vec<u8>> =
        serde_wasm_bindgen::from_value(spent_set)
            .map_err(|e| JsError::new(&format!("Failed to deserialize spent set: {:?}", e)))?;

    let spent_hash_set: HashSet<Vec<u8>> = spent_array.into_iter().collect();

    Ok(nullifier::is_nullifier_spent(&nullifier, &spent_hash_set))
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_create_note_wasm() {
        let secret = vec![1, 2, 3, 4, 5, 6, 7, 8];
        let note = create_note(1000, secret).unwrap();
        assert_eq!(note.value(), 1000);
        assert_eq!(note.commitment().len(), 32);
    }

    #[wasm_bindgen_test]
    fn test_generate_nullifier_wasm() {
        let secret = vec![1, 2, 3, 4, 5, 6, 7, 8];
        let note = create_note(1000, secret.clone()).unwrap();
        let nullifier = generate_nullifier(&note, secret);
        assert_eq!(nullifier.len(), 32);
    }
}
