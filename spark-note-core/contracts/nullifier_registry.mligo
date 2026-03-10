// Spark Note Nullifier Registry
// Implemented in CameLIGO for Tezos

type storage = {
  commitments : (bytes, unit) big_map;
  nullifiers : (bytes, unit) big_map;
  vk_hash : bytes;
}

type return = operation list * storage

[@entry]
const deposit = (commitment : bytes, s : storage) : return => {
  // In a real implementation, we would verify a deposit amount here.
  // For the POC, we record the commitment to the anonymity set.
  if (Big_map.mem(commitment, s.commitments)) {
    failwith("Commitment already exists");
  } else {
    let new_commitments = Big_map.add(commitment, (), s.commitments);
    return [(list([]) as operation list), { ...s, commitments: new_commitments }];
  }
};

[@entry]
const spend = (nullifier : bytes, s : storage) : return => {
  // check if nullifier is already spent
  if (Big_map.mem(nullifier, s.nullifiers)) {
    failwith("Nullifier already spent");
  } else {
    // In a production contract, we would verify the Groth16 proof here.
    // Tezos supports BLS12-381 primitives, making this possible.
    // For the POC, we mark the nullifier as spent.
    let new_nullifiers = Big_map.add(nullifier, (), s.nullifiers);
    return [(list([]) as operation list), { ...s, nullifiers: new_nullifiers }];
  }
};
