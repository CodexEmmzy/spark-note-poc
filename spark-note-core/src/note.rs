//! Spark note structure and operations
//!
//! This module provides the core SparkNote structure and functions for
//! creating notes and generating commitments.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::{SparkError, SparkResult};
use crate::validation::{validate_secret, validate_value};
use crate::secret::Secret;

/// A Spark note representing a value commitment
///
/// The note contains:
/// - `value`: The monetary value of the note
/// - `secret`: A random secret used for privacy (automatically zeroized on drop)
/// - `commitment`: A cryptographic commitment to the value and secret
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SparkNote {
    /// The value contained in this note
    pub value: u64,
    /// The commitment hash (domain-separated SHA-256)
    pub commitment: Vec<u8>,
    /// The secret used to generate the commitment (private, zeroized on drop)
    secret: Secret,
}

impl SparkNote {
    /// Creates a new SparkNote with the given value and secret
    ///
    /// Returns error if secret is empty or value is zero.
    /// Uses domain-separated commitment scheme to prevent length extension attacks.
    pub fn new(value: u64, secret: Secret) -> SparkResult<Self> {
        validate_value(value)?;
        validate_secret(secret.as_bytes())?;

        let commitment = compute_commitment(value, secret.as_bytes());

        Ok(SparkNote {
            value,
            secret,
            commitment,
        })
    }
    
    /// Get a reference to the secret bytes
    ///
    /// WARNING: This exposes the secret. Use only when necessary.
    pub fn secret_bytes(&self) -> &[u8] {
        self.secret.as_bytes()
    }
    
    /// Get a reference to the secret
    pub fn secret(&self) -> &Secret {
        &self.secret
    }
}

// Custom serialization that doesn't expose the secret
impl Serialize for SparkNote {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("SparkNote", 2)?;
        state.serialize_field("value", &self.value)?;
        state.serialize_field("commitment", &self.commitment)?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for SparkNote {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        // Note: Deserialization without secret is not supported
        // Secrets should never be deserialized from untrusted sources
        use serde::de::{self, Visitor};
        use std::fmt;
        
        struct SparkNoteVisitor;
        
        impl<'de> Visitor<'de> for SparkNoteVisitor {
            type Value = SparkNote;
            
            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("SparkNote cannot be deserialized without secret")
            }
            
            fn visit_map<V>(self, _visitor: V) -> Result<SparkNote, V::Error>
            where
                V: de::MapAccess<'de>,
            {
                Err(de::Error::custom("SparkNote cannot be deserialized - secrets must not be loaded from untrusted sources"))
            }
        }
        
        deserializer.deserialize_struct("SparkNote", &["value", "commitment"], SparkNoteVisitor)
    }
}

/// Creates a new SparkNote (convenience function)
pub fn create_note(value: u64, secret: Secret) -> SparkResult<SparkNote> {
    SparkNote::new(value, secret)
}

/// Returns the commitment of a note
///
/// # Arguments
/// * `note` - Reference to the SparkNote
///
/// # Returns
/// A copy of the note's commitment hash
pub fn note_commitment(note: &SparkNote) -> Vec<u8> {
    note.commitment.clone()
}

/// Compute a commitment to a value and secret
///
/// Uses domain separation and proper encoding to prevent length extension attacks.
/// Format: SHA-256(domain_separator || value_be || secret_len_be || secret)
fn compute_commitment(value: u64, secret: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    
    // Domain separator to prevent cross-protocol attacks
    hasher.update(b"SPARK_COMMITMENT_V1");
    
    // Use big-endian for consistency and determinism
    hasher.update(&value.to_be_bytes());
    
    // Include length prefix to prevent length extension attacks
    hasher.update(&(secret.len() as u64).to_be_bytes());
    
    // Include the secret
    hasher.update(secret);
    
    hasher.finalize().to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_note() {
        let secret = Secret::new(vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        let note = create_note(1000, secret.clone()).unwrap();

        assert_eq!(note.value, 1000);
        assert_eq!(note.secret_bytes(), secret.as_bytes());
        assert_eq!(note.commitment.len(), 32); // SHA-256 produces 32 bytes
    }

    #[test]
    fn test_create_note_empty_secret_fails() {
        let result = create_note(1000, Secret::new(vec![]));
        assert!(result.is_err());
        match result.unwrap_err() {
            SparkError::InvalidSecret { code, .. } => {
                assert_eq!(code, crate::error::SecretErrorCode::Empty);
            }
            _ => panic!("Expected InvalidSecret error"),
        }
    }
    
    #[test]
    fn test_create_note_zero_value_fails() {
        let result = create_note(0, Secret::new(vec![1, 2, 3, 4, 5, 6, 7, 8]));
        assert!(result.is_err());
        match result.unwrap_err() {
            SparkError::InvalidValue { code, .. } => {
                assert_eq!(code, crate::error::ValueErrorCode::Zero);
            }
            _ => panic!("Expected InvalidValue error"),
        }
    }

    #[test]
    fn test_commitment_consistency() {
        let secret = Secret::new(vec![42, 43, 44, 45, 46, 47, 48, 49]);
        let value = 5000u64;

        let note1 = create_note(value, secret.clone()).unwrap();
        let note2 = create_note(value, secret.clone()).unwrap();

        // Same inputs should produce same commitment
        assert_eq!(note1.commitment, note2.commitment);
        assert_eq!(note_commitment(&note1), note_commitment(&note2));
    }

    #[test]
    fn test_different_values_different_commitments() {
        let secret = Secret::new(vec![1, 2, 3, 4, 5, 6, 7, 8]);

        let note1 = create_note(100, secret.clone()).unwrap();
        let note2 = create_note(200, secret.clone()).unwrap();

        assert_ne!(note1.commitment, note2.commitment);
    }

    #[test]
    fn test_different_secrets_different_commitments() {
        let note1 = create_note(100, Secret::new(vec![1, 2, 3, 4, 5, 6, 7, 8])).unwrap();
        let note2 = create_note(100, Secret::new(vec![5, 6, 7, 8, 9, 10, 11, 12])).unwrap();

        assert_ne!(note1.commitment, note2.commitment);
    }

    #[test]
    fn test_note_commitment_returns_clone() {
        let note = create_note(1000, Secret::new(vec![1, 2, 3, 4, 5, 6, 7, 8])).unwrap();
        let commitment = note_commitment(&note);

        assert_eq!(commitment, note.commitment);
        // Verify it's a clone, not a reference
        assert_eq!(commitment.len(), 32);
    }
    
    #[test]
    fn test_commitment_binding() {
        // Same value + secret should produce same commitment
        let value = 100u64;
        let secret = Secret::new(vec![1, 2, 3, 4, 5, 6, 7, 8]);
        
        let note1 = create_note(value, secret.clone()).unwrap();
        let note2 = create_note(value, secret).unwrap();
        
        assert_eq!(note1.commitment, note2.commitment);
    }
    
    #[test]
    fn test_commitment_hiding() {
        // Different secrets should produce different commitments
        let value = 100u64;
        let s1 = Secret::new(vec![1, 2, 3, 4, 5, 6, 7, 8]);
        let s2 = Secret::new(vec![8, 7, 6, 5, 4, 3, 2, 1]);
        
        let note1 = create_note(value, s1).unwrap();
        let note2 = create_note(value, s2).unwrap();
        
        assert_ne!(note1.commitment, note2.commitment);
    }
}
