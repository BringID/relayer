const { Interface } = require('ethers')
const logger = require('./logger')
const { BadRequestError } = require('./errors')
const airdropErrorsABI = require('../../contracts/airdrop-errors.json')
const semaphoreErrorsABI = require('../../contracts/semaphore-errors.json')
const registryErrorsABI = require('../../contracts/registry-errors.json')

// Mapping contract error names to application error codes and messages
const ERROR_MAPPING = {
  // Registry (CredentialRegistry) custom errors – all 41
  AlreadyExpired: { code: 'ALREADY_EXPIRED', message: () => 'Credential already expired' },
  AlreadyRegistered: { code: 'ALREADY_REGISTERED', message: () => 'Credential already registered' },
  AppIdMismatch: { code: 'APP_ID_MISMATCH', message: () => 'App ID mismatch' },
  AppNotActive: { code: 'APP_NOT_ACTIVE', message: () => 'App is not active' },
  AppNotSuspended: { code: 'APP_NOT_SUSPENDED', message: () => 'App is not suspended' },
  AttestationExpired: { code: 'ATTESTATION_EXPIRED', message: () => 'Attestation expired' },
  CommitmentMismatch: { code: 'COMMITMENT_MISMATCH', message: () => 'Commitment mismatch' },
  CredentialGroupExists: { code: 'CREDENTIAL_GROUP_EXISTS', message: () => 'Credential group already exists' },
  CredentialGroupInactive: { code: 'CREDENTIAL_GROUP_INACTIVE', message: () => 'Credential group is not active' },
  CredentialGroupNotActive: { code: 'CREDENTIAL_GROUP_NOT_ACTIVE', message: () => 'Credential group is not active' },
  CredentialGroupNotFound: { code: 'CREDENTIAL_GROUP_NOT_FOUND', message: () => 'Credential group not found' },
  CredentialGroupNotSuspended: { code: 'CREDENTIAL_GROUP_NOT_SUSPENDED', message: () => 'Credential group is not suspended' },
  DuplicateCredentialGroup: { code: 'DUPLICATE_CREDENTIAL_GROUP', message: () => 'Duplicate credential group' },
  FutureAttestation: { code: 'FUTURE_ATTESTATION', message: () => 'Attestation is dated in the future' },
  GroupMismatch: { code: 'GROUP_MISMATCH', message: () => 'Credential group mismatch' },
  InvalidAdminAddress: { code: 'INVALID_ADMIN_ADDRESS', message: () => 'Invalid admin address' },
  InvalidAttestationSigLength: { code: 'INVALID_ATTESTATION_SIG_LENGTH', message: () => 'Invalid attestation signature length' },
  InvalidCommitment: { code: 'INVALID_COMMITMENT', message: () => 'Invalid commitment' },
  InvalidProof: { code: 'INVALID_PROOF', message: () => 'Invalid proof' },
  InvalidScorerAddress: { code: 'INVALID_SCORER_ADDRESS', message: () => 'Invalid scorer address' },
  InvalidScorerContract: { code: 'INVALID_SCORER_CONTRACT', message: () => 'Invalid scorer contract' },
  InvalidTrustedVerifier: { code: 'INVALID_TRUSTED_VERIFIER', message: () => 'Invalid trusted verifier' },
  InvalidVerifierAddress: { code: 'INVALID_VERIFIER_ADDRESS', message: () => 'Invalid verifier address' },
  NoExpirySet: { code: 'NO_EXPIRY_SET', message: () => 'No expiry set' },
  NoPendingRecovery: { code: 'NO_PENDING_RECOVERY', message: () => 'No pending recovery' },
  NoSemaphoreGroup: { code: 'NO_SEMAPHORE_GROUP', message: () => 'No Semaphore group' },
  NotAppAdmin: { code: 'NOT_APP_ADMIN', message: () => 'Caller is not the app admin' },
  NotPendingAdmin: { code: 'NOT_PENDING_ADMIN', message: () => 'Caller is not the pending admin' },
  NotRegistered: { code: 'NOT_REGISTERED', message: () => 'Credential is not registered' },
  NotYetExpired: { code: 'NOT_YET_EXPIRED', message: () => 'Credential is not yet expired' },
  RecoveryAlreadyPending: { code: 'RECOVERY_ALREADY_PENDING', message: () => 'Recovery already pending' },
  RecoveryDisabled: { code: 'RECOVERY_DISABLED', message: () => 'Recovery is disabled' },
  RecoveryPending: { code: 'RECOVERY_PENDING', message: () => 'Recovery is pending' },
  RecoveryTimelockNotExpired: { code: 'RECOVERY_TIMELOCK_NOT_EXPIRED', message: () => 'Recovery timelock has not expired' },
  ScopeMismatch: { code: 'SCOPE_MISMATCH', message: () => 'Scope mismatch' },
  UntrustedVerifier: { code: 'UNTRUSTED_VERIFIER', message: () => 'Verifier is not trusted' },
  VerifierNotTrusted: { code: 'VERIFIER_NOT_TRUSTED', message: () => 'Verifier is not trusted' },
  WrongChain: { code: 'WRONG_CHAIN', message: () => 'Wrong chain' },
  WrongRegistryAddress: { code: 'WRONG_REGISTRY_ADDRESS', message: () => 'Wrong registry address' },
  ZeroCredentialGroupId: { code: 'ZERO_CREDENTIAL_GROUP_ID', message: () => 'Credential group ID is zero' },
  ZeroDuration: { code: 'ZERO_DURATION', message: () => 'Duration is zero' },
  ZeroMerkleTreeDuration: { code: 'ZERO_MERKLE_TREE_DURATION', message: () => 'Merkle tree duration is zero' },
  // Airdrop errors
  AirdropClaimed: {
    code: 'AIRDROP_ALREADY_CLAIMED',
    message: (args) => `Airdrop already claimed for address: ${args[0]}`
  },
  AirdropStopped: {
    code: 'AIRDROP_STOPPED',
    message: () => 'Airdrop is currently stopped'
  },
  AmountIsZero: {
    code: 'AMOUNT_IS_ZERO',
    message: () => 'Amount is zero'
  },
  InsufficientScore: {
    code: 'INSUFFICIENT_SCORE',
    message: (args) => `Insufficient score: ${args[0]}. Required threshold not met`
  },
  ThresholdIsZero: {
    code: 'THRESHOLD_IS_ZERO',
    message: () => 'Threshold is zero'
  },
  TransferFailed: {
    code: 'TRANSFER_FAILED',
    message: () => 'Token transfer failed'
  },
  // Semaphore errors
  LeafAlreadyExists: {
    code: 'LEAF_ALREADY_EXISTS',
    message: () => 'Leaf already exists in the Merkle tree'
  },
  LeafCannotBeZero: {
    code: 'LEAF_CANNOT_BE_ZERO',
    message: () => 'Leaf cannot be zero'
  },
  LeafDoesNotExist: {
    code: 'LEAF_DOES_NOT_EXIST',
    message: () => 'Leaf does not exist in the Merkle tree'
  },
  LeafGreaterThanSnarkScalarField: {
    code: 'LEAF_GREATER_THAN_SNARK_SCALAR_FIELD',
    message: () => 'Leaf value is greater than SNARK scalar field'
  },
  Semaphore__CallerIsNotTheGroupAdmin: {
    code: 'CALLER_IS_NOT_THE_GROUP_ADMIN',
    message: () => 'Caller is not the group admin'
  },
  Semaphore__CallerIsNotThePendingGroupAdmin: {
    code: 'CALLER_IS_NOT_THE_PENDING_GROUP_ADMIN',
    message: () => 'Caller is not the pending group admin'
  },
  Semaphore__GroupDoesNotExist: {
    code: 'GROUP_DOES_NOT_EXIST',
    message: () => 'Group does not exist'
  },
  Semaphore__GroupHasNoMembers: {
    code: 'GROUP_HAS_NO_MEMBERS',
    message: () => 'Group has no members'
  },
  Semaphore__InvalidProof: {
    code: 'INVALID_PROOF',
    message: () => 'Invalid Semaphore proof'
  },
  Semaphore__MerkleTreeDepthIsNotSupported: {
    code: 'MERKLE_TREE_DEPTH_IS_NOT_SUPPORTED',
    message: () => 'Merkle tree depth is not supported'
  },
  Semaphore__MerkleTreeRootIsExpired: {
    code: 'MERKLE_TREE_ROOT_IS_EXPIRED',
    message: () => 'Merkle tree root is expired'
  },
  Semaphore__MerkleTreeRootIsNotPartOfTheGroup: {
    code: 'MERKLE_TREE_ROOT_IS_NOT_PART_OF_THE_GROUP',
    message: () => 'Merkle tree root is not part of the group'
  },
  Semaphore__YouAreUsingTheSameNullifierTwice: {
    code: 'SAME_NULLIFIERS_USED_TWICE',
    message: () => 'The same nullifier is being used twice'
  },
  WrongSiblingNodes: {
    code: 'WRONG_SIBLING_NODES',
    message: () => 'Wrong sibling nodes in Merkle proof'
  }
}

class ErrorParser {
  constructor () {
    // Load ABI once during initialization
    this.interfaces = {}
    this._loadABIs()
  }

  _loadABIs () {
    try {
      this.interfaces.registry = new Interface(registryErrorsABI)
      logger.info('Loaded ABI for contract: registry')
    } catch (err) {
      logger.error(`Failed to load ABI: ${err.message}`)
    }

    try {
      this.interfaces.airdrop = new Interface(airdropErrorsABI)
      logger.info('Loaded ABI for contract: airdrop')
    } catch (err) {
      logger.error(`Failed to load ABI: ${err.message}`)
    }

    try {
      this.interfaces.semaphore = new Interface(semaphoreErrorsABI)
      logger.info('Loaded ABI for contract: semaphore')
    } catch (err) {
      logger.error(`Failed to load ABI: ${err.message}`)
    }
  }

  parseContractError (err, contractName = 'airdrop') {
    // Extract error data - check multiple possible locations
    const errorData = err?.data ?? err?.error?.data ?? err?.revert?.data

    if (!errorData) {
      // No parseable error data available, throw generic error
      const reason = err?.reason || 'Unknown reason'
      const message = err?.message || 'Unknown message'
      logger.warn(`Error simulating transaction: Reason: ${reason}, Message: ${message}`)
      throw new BadRequestError('Error simulating transaction call', 'SIMULATION_CALL_FAILED')
    }

    // Try each interface in order; first successful parse wins
    const interfacesToTry = ['registry', 'airdrop', 'semaphore']
    let lastParseError = null
    
    for (const interfaceName of interfacesToTry) {
      try {
        const iface = this.interfaces[interfaceName]
        
        if (!iface) {
          continue // Skip if interface not available
        }
        
        // Try to parse error with this interface
        const parsed = iface.parseError(errorData)
        
        if (parsed) {
          const errorName = parsed.name
          const errorArgs = parsed.args
          
          logger.warn(`Parsed contract error: ${errorName} (from ${interfaceName})`, {
            errorName,
            args: errorArgs.map(arg => arg.toString()),
            signature: parsed.signature,
            interfaceName
          })
          
          const errorMapping = ERROR_MAPPING[errorName]
          
          if (errorMapping) {
            // Use mapped error code and message
            const message = typeof errorMapping.message === 'function'
              ? errorMapping.message(errorArgs)
              : errorMapping.message
            
            throw new BadRequestError(message, errorMapping.code)
          } else {
            // Unknown error, but we parsed it
            logger.warn(`Unknown contract error: ${errorName}. Using generic error code.`)
            throw new BadRequestError(
              `Contract error: ${errorName}`,
              'CONTRACT_ERROR'
            )
          }
        }
      } catch (parseErr) {
        // If it's already a BadRequestError, re-throw it (successful parse)
        if (parseErr instanceof BadRequestError) {
          throw parseErr
        }
        
        // Save the error and try next interface
        lastParseError = parseErr
        continue
      }
    }

    // If we get here, none of the interfaces could parse the error
    try {
      // Check if we have a specific interface for the contract name
      const iface = this.interfaces[contractName]
      
      if (!iface) {
        logger.warn(`Interface not found for contract: ${contractName}. Available contracts: ${Object.keys(this.interfaces).join(', ')}`)
        const reason = err?.reason || 'Unknown reason'
        const message = err?.message || 'Unknown message'
        logger.warn(`Error simulating transaction: Reason: ${reason}, Message: ${message}`)
        throw new BadRequestError('Error simulating transaction call', 'SIMULATION_CALL_FAILED')
      }
    } catch (checkErr) {
      // Fall through to generic error
    }
    
    // Error data exists but couldn't be parsed by any interface
    logger.warn('Error data exists but could not be parsed by any interface', { 
      errorData,
      triedInterfaces: interfacesToTry,
      lastError: lastParseError?.message
    })
    const reason = err?.reason || 'Unknown reason'
    const message = err?.message || 'Unknown message'
    logger.warn(`Error simulating transaction: Reason: ${reason}, Message: ${message}`)
    throw new BadRequestError('Error simulating transaction call', 'SIMULATION_CALL_FAILED')
  }
}

// Export singleton instance
module.exports = new ErrorParser()
