//! Cryptographic utilities
//!
//! This module provides cryptographic utilities including
//! constant-time comparison operations.

use subtle::ConstantTimeEq;

/// Constant-time comparison of two byte slices
///
/// Returns true if slices are equal, false otherwise.
/// Execution time does not depend on slice contents, preventing timing attacks.
///
/// # Arguments
/// * `a` - First byte slice
/// * `b` - Second byte slice
///
/// # Returns
/// `true` if slices are equal, `false` otherwise
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.ct_eq(b).into()
}

/// Constant-time comparison for fixed-size arrays
///
/// # Arguments
/// * `a` - First array
/// * `b` - Second array
///
/// # Returns
/// `true` if arrays are equal, `false` otherwise
pub fn constant_time_eq_array<const N: usize>(a: &[u8; N], b: &[u8; N]) -> bool {
    a.ct_eq(b).into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constant_time_eq_equal() {
        let a = vec![1, 2, 3, 4, 5];
        let b = vec![1, 2, 3, 4, 5];
        
        assert!(constant_time_eq(&a, &b));
    }

    #[test]
    fn test_constant_time_eq_different() {
        let a = vec![1, 2, 3, 4, 5];
        let b = vec![1, 2, 3, 4, 6];
        
        assert!(!constant_time_eq(&a, &b));
    }

    #[test]
    fn test_constant_time_eq_different_length() {
        let a = vec![1, 2, 3, 4, 5];
        let b = vec![1, 2, 3];
        
        assert!(!constant_time_eq(&a, &b));
    }

    #[test]
    fn test_constant_time_eq_array() {
        let a = [1, 2, 3, 4, 5];
        let b = [1, 2, 3, 4, 5];
        let c = [1, 2, 3, 4, 6];
        
        assert!(constant_time_eq_array(&a, &b));
        assert!(!constant_time_eq_array(&a, &c));
    }
}

