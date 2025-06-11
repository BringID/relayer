const { ethers } = require('ethers')
const logger = require('../utils/logger')
const operationService = require('./operation-service')
const relayerWalletService = require('./relayer-wallet-service')

class RetryTransactionService {
  async retryTransaction (id) {
    const operation = await operationService.findById(id)
    const transaction = operation.transactions[operation.transactions.length - 1].toObject()
    const {
      maxFeePerGas,
      maxPriorityFeePerGas
    } = await relayerWalletService.calculateRetryFees(transaction)

    const { value, data, gasLimit, to } = transaction.params

    const params = {
      to,
      data,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: operation.nonce,
      value: ethers.parseUnits(value).toString()
    }

    const newTx = await relayerWalletService.sendRetryTransaction(params)
    logger.warn(`Operation ${id}: re-submitted transaction. New tx: ${newTx.hash}`)

    operationService.addTransaction(id, newTx)
    return newTx
  }
}

module.exports = new RetryTransactionService()
