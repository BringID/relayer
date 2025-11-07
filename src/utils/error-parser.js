const { Interface } = require('ethers')
const logger = require('./logger')
const { BadRequestError } = require('./errors')
const airdropErrorsABI = require('../../contracts/airdrop-errors.json')

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

    try {
      // Get Interface from cache
      const iface = this.interfaces[contractName]
      
      if (!iface) {
        logger.warn(`Interface not found for contract: ${contractName}. Available contracts: ${Object.keys(this.interfaces).join(', ')}`)
        const reason = err?.reason || 'Unknown reason'
        const message = err?.message || 'Unknown message'
        logger.warn(`Error simulating transaction: Reason: ${reason}, Message: ${message}`)
        throw new BadRequestError('Error simulating transaction call', 'SIMULATION_CALL_FAILED')
      }
      
      // Parse error
      const parsed = iface.parseError(errorData)
      
      if (parsed) {
        const errorName = parsed.name
        const errorArgs = parsed.args
        
        logger.warn(`Parsed contract error: ${errorName}`, {
          errorName,
          args: errorArgs.map(arg => arg.toString()),
          signature: parsed.signature
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
      } else {
        // Error data exists but couldn't be parsed
        logger.warn('Error data exists but could not be parsed', { errorData })
        const reason = err?.reason || 'Unknown reason'
        const message = err?.message || 'Unknown message'
        logger.warn(`Error simulating transaction: Reason: ${reason}, Message: ${message}`)
        throw new BadRequestError('Error simulating transaction call', 'SIMULATION_CALL_FAILED')
      }
    } catch (parseErr) {
      // If it's already a BadRequestError, re-throw it
      if (parseErr instanceof BadRequestError) {
        throw parseErr
      }
      
      // Error during parsing (e.g., invalid ABI, etc.)
      logger.error('Error parsing contract error', {
        error: parseErr.message,
        stack: parseErr.stack
      })
      
      const reason = err?.reason || 'Unknown reason'
      const message = err?.message || 'Unknown message'
      logger.warn(`Error simulating transaction: Reason: ${reason}, Message: ${message}`)
      throw new BadRequestError('Error simulating transaction call', 'SIMULATION_CALL_FAILED')
    }
  }
}

// Export singleton instance
module.exports = new ErrorParser()
