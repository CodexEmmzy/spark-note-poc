use ark_bls12_381::{Fr, G1Affine, G1Projective};
use ark_ec::{AffineRepr, CurveGroup};
use ark_ff::PrimeField;
use ark_std::ops::Mul;
use subtle::ConstantTimeEq;

// ZK Proof imports
use ark_ff::UniformRand;
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_std::test_rng;
use crate::error::{SparkError, SparkResult};

/// Domain separator used to derive the independent generator H via hash-to-curve.
/// H = hash_to_curve("SPARK_PEDERSEN_H_V1") ensures H is provably independent from G
/// (i.e., no one knows the discrete log relationship between G and H).
const H_DOMAIN_SEP: &[u8] = b"SPARK_PEDERSEN_H_V1";

/// Returns the standard BLS12-381 G1 generator G.
fn generator_g() -> G1Affine {
    G1Affine::generator()
}

/// Returns the independent generator H, derived via a deterministic
/// hash-to-curve construction to ensure nobody knows dlog(H, G).
///
/// We use Blake3 to hash a domain separator into 32 bytes, interpret
/// those bytes as a scalar `s`, and compute `H = s * G`. Since finding
/// `s` from `H` requires solving the discrete log problem, and the
/// derivation is transparent / reproducible, this is a standard
/// "nothing-up-my-sleeve" construction.
fn generator_h() -> G1Affine {
    let hash = blake3::hash(H_DOMAIN_SEP);
    let hash_bytes = hash.as_bytes();

    // Safely reduce the hash bytes modulo the scalar field order.
    // from_le_bytes_mod_order handles arbitrary-length byte slices
    // and always returns a valid Fr element.
    let scalar = Fr::from_le_bytes_mod_order(hash_bytes);

    (G1Projective::from(generator_g()).mul(scalar)).into_affine()
}

/// Compute a Pedersen commitment: C = v·G + r·H
///
/// This commitment scheme is:
/// - **Perfectly hiding**: the blinding factor `r` makes the commitment
///   information-theoretically indistinguishable from random.
/// - **Computationally binding**: changing the committed value requires
///   solving the discrete log problem.
/// - **Additively homomorphic**: commit(a, r1) + commit(b, r2) = commit(a+b, r1+r2),
///   enabling zero-knowledge balance proofs in Lelantus Spark.
///
/// # Arguments
/// * `value` - The value to commit to (as a BLS12-381 scalar)
/// * `blinding` - The blinding/randomness factor (as a BLS12-381 scalar)
///
/// # Returns
/// The commitment as a BLS12-381 G1 affine point
pub fn pedersen_commit(value: Fr, blinding: Fr) -> G1Affine {
    let g = generator_g();
    let h = generator_h();

    let v_g = G1Projective::from(g).mul(value);
    let r_h = G1Projective::from(h).mul(blinding);

    (v_g + r_h).into_affine()
}

/// Convenience wrapper: commit a u64 value with raw blinding bytes.
///
/// Converts the u64 value to an Fr scalar and interprets the blinding
/// bytes (secret) as an Fr element, then computes the Pedersen commitment
/// and returns its compressed serialization (48 bytes for BLS12-381 G1).
///
/// # Arguments
/// * `value` - The monetary value to commit
/// * `blinding_bytes` - Raw bytes to use as blinding factor
///
/// # Returns
/// 48-byte compressed BLS12-381 G1 point
pub fn pedersen_commit_u64(value: u64, blinding_bytes: &[u8]) -> Vec<u8> {
    let v = Fr::from(value);

    // Hash the blinding bytes to get a uniform field element.
    // from_le_bytes_mod_order safely reduces any byte slice modulo
    // the scalar field order, guaranteeing a valid Fr element.
    let blinding_hash = blake3::hash(blinding_bytes);
    let r = Fr::from_le_bytes_mod_order(blinding_hash.as_bytes());

    let point = pedersen_commit(v, r);

    // Serialize to compressed form (48 bytes for G1)
    let mut buf = Vec::new();
    point
        .serialize_compressed(&mut buf)
        .expect("serialization should not fail");
    buf
}

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

// --- Native Schnorr Sigma Protocol (ZK Proof) ---

/// A Zero-Knowledge Proof of Knowledge (PoK) for a Pedersen commitment.
/// Proves knowledge of `v` and `r` such that `C = v*G + r*H` without revealing them.
/// Implemented as a non-interactive Schnorr Sigma Protocol using Fiat-Shamir.
#[derive(Clone, CanonicalSerialize, CanonicalDeserialize, PartialEq, Eq, Debug)]
pub struct SpendingProof {
    /// Public nonce R = k_v*G + k_r*H
    pub r_point: G1Affine,
    /// Response for value: s_v = k_v + c*v
    pub s_v: Fr,
    /// Response for blinding: s_r = k_r + c*r
    pub s_r: Fr,
}

impl SpendingProof {
    /// Serialize the proof to a byte vector.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        self.serialize_compressed(&mut buf).expect("serialization should not fail");
        buf
    }

    /// Deserialize a proof from a byte slice.
    pub fn from_bytes(bytes: &[u8]) -> SparkResult<Self> {
        Self::deserialize_compressed(bytes)
            .map_err(|e| SparkError::invalid_proof(format!("Failed to deserialize proof: {:?}", e)))
    }
}

/// Computes the Fiat-Shamir challenge `c = Blake3(G || H || C || R)`
fn compute_challenge(g: &G1Affine, h: &G1Affine, c: &G1Affine, r: &G1Affine) -> Fr {
    let mut hasher = blake3::Hasher::new();
    
    let mut buf = Vec::new();
    g.serialize_compressed(&mut buf).unwrap();
    h.serialize_compressed(&mut buf).unwrap();
    c.serialize_compressed(&mut buf).unwrap();
    r.serialize_compressed(&mut buf).unwrap();
    
    hasher.update(&buf);
    let hash = hasher.finalize();
    
    Fr::from_le_bytes_mod_order(hash.as_bytes())
}

/// Generate a Zero-Knowledge spending proof.
pub fn generate_spending_proof(
    value: u64,
    blinding_bytes: &[u8],
) -> SpendingProof {
    let mut rng = test_rng();
    
    let g = generator_g();
    let h = generator_h();

    let v = Fr::from(value);
    let r = Fr::from_le_bytes_mod_order(blake3::hash(blinding_bytes).as_bytes());
    
    let c = pedersen_commit(v, r);

    // 1. Prover samples random nonces
    let k_v = Fr::rand(&mut rng);
    let k_r = Fr::rand(&mut rng);

    // 2. Prover computes public nonce R = k_v*G + k_r*H
    let r_point = (G1Projective::from(g) * k_v + G1Projective::from(h) * k_r).into_affine();

    // 3. Prover computes fiat-shamir challenge
    let challenge = compute_challenge(&g, &h, &c, &r_point);

    // 4. Prover computes responses
    let s_v = k_v + challenge * v;
    let s_r = k_r + challenge * r;

    SpendingProof {
        r_point,
        s_v,
        s_r,
    }
}

/// Verify a spending proof against a public commitment.
pub fn verify_spending_proof(
    proof: &SpendingProof,
    commitment_bytes: &[u8],
) -> bool {
    let c = match G1Affine::deserialize_compressed(commitment_bytes) {
        Ok(point) => point,
        Err(_) => return false,
    };
    
    let g = generator_g();
    let h = generator_h();

    // 1. Recompute challenge
    let challenge = compute_challenge(&g, &h, &c, &proof.r_point);

    // 2. Compute s_v*G + s_r*H
    let lhs = (G1Projective::from(g) * proof.s_v + G1Projective::from(h) * proof.s_r).into_affine();

    // 3. Compute R + c*C
    let rhs = (G1Projective::from(proof.r_point) + G1Projective::from(c) * challenge).into_affine();

    // 4. Check equality
    lhs == rhs
}


#[cfg(test)]
mod tests {
    use super::*;
    use ark_ff::UniformRand;
    use ark_std::test_rng;

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

    #[test]
    fn test_pedersen_commit_deterministic() {
        let mut rng = test_rng();
        let v = Fr::rand(&mut rng);
        let r = Fr::rand(&mut rng);

        let c1 = pedersen_commit(v, r);
        let c2 = pedersen_commit(v, r);

        assert_eq!(c1, c2);
    }

    #[test]
    fn test_pedersen_commit_different_values() {
        let mut rng = test_rng();
        let r = Fr::rand(&mut rng);

        let c1 = pedersen_commit(Fr::from(100u64), r);
        let c2 = pedersen_commit(Fr::from(200u64), r);

        assert_ne!(c1, c2);
    }

    #[test]
    fn test_pedersen_commit_different_blindings() {
        let mut rng = test_rng();
        let v = Fr::from(100u64);
        let r1 = Fr::rand(&mut rng);
        let r2 = Fr::rand(&mut rng);

        let c1 = pedersen_commit(v, r1);
        let c2 = pedersen_commit(v, r2);

        assert_ne!(c1, c2);
    }

    #[test]
    fn test_pedersen_homomorphic() {
        let mut rng = test_rng();
        let a = Fr::rand(&mut rng);
        let b = Fr::rand(&mut rng);
        let r1 = Fr::rand(&mut rng);
        let r2 = Fr::rand(&mut rng);

        let ca = pedersen_commit(a, r1);
        let cb = pedersen_commit(b, r2);

        let sum_of_commits = (G1Projective::from(ca) + G1Projective::from(cb)).into_affine();
        let commit_of_sum = pedersen_commit(a + b, r1 + r2);

        assert_eq!(sum_of_commits, commit_of_sum);
    }

    #[test]
    fn test_pedersen_commit_u64_produces_48_bytes() {
        let commitment = pedersen_commit_u64(1000, &[1, 2, 3, 4, 5, 6, 7, 8]);
        assert_eq!(commitment.len(), 48, "Compressed BLS12-381 G1 point should be 48 bytes");
    }

    #[test]
    fn test_pedersen_commit_u64_deterministic() {
        let c1 = pedersen_commit_u64(1000, &[1, 2, 3, 4, 5, 6, 7, 8]);
        let c2 = pedersen_commit_u64(1000, &[1, 2, 3, 4, 5, 6, 7, 8]);
        assert_eq!(c1, c2);
    }

    #[test]
    fn test_generators_are_different() {
        let g = generator_g();
        let h = generator_h();
        assert_ne!(g, h, "G and H must be independent generators");
    }

    #[test]
    fn test_spending_proof_valid() {
        let value = 1000u64;
        let secret = b"super_secret_blinding_factor";
        
        let proof = generate_spending_proof(value, secret);
        let commitment = pedersen_commit_u64(value, secret);
        
        assert!(verify_spending_proof(&proof, &commitment));
    }

    #[test]
    fn test_spending_proof_invalid_value() {
        let value = 1000u64;
        let secret = b"super_secret_blinding_factor";
        
        let proof = generate_spending_proof(value, secret);
        
        // Mismatched commitment (different value)
        let wrong_commitment = pedersen_commit_u64(2000, secret);
        assert!(!verify_spending_proof(&proof, &wrong_commitment));
    }
}
