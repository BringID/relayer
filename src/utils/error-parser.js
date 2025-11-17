const { Interface } = require('ethers')
const logger = require('./logger')
const { BadRequestError } = require('./errors')
const airdropErrorsABI = require('../../contracts/airdrop-errors.json')
const semaphoreErrorsABI = require('../../contracts/semaphore-errors.json')

// Mapping contract error names to application error codes and messages
const ERROR_MAPPING = {
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
      // No error data available, throw generic error
      const reason = err?.reason || 'Unknown reason'
      const message = err?.message || 'Unknown message'
      logger.warn(`Error simulating transaction: Reason: ${reason}, Message: ${message}`)
      throw new BadRequestError('Error simulating transaction call', 'SIMULATION_CALL_FAILED')
    }

    // Try to parse error through all available interfaces
    // Since airdrop inherits from Semaphore, errors can come from either contract
    const interfacesToTry = contractName === 'airdrop' 
      ? ['airdrop', 'semaphore'] 
      : [contractName]
    
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
