const { ethers } = require('ethers')
const logger = require('../utils/logger')
const operationService = require('./operation-service')
const relayerWalletService = require('./relayer-wallet-service')

class RetryTransactionService {
  async retryTransaction (id) {
    const operation = await operationService.findById(id)
    const newTx = await this.prepareAndSendTransaction(operation)
    operationService.addTransaction(id, newTx)
    return newTx
  }

  async prepareAndSendTransaction (operation) {
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
      nonce: operation.nonce,
      maxPriorityFeePerGas,
      value: ethers.parseUnits(value).toString()
    }

    const newTx = await relayerWalletService.sendRetryTransaction(params)
    logger.warn(`Operation ${operation.id}: re-submitted transaction. New tx: ${newTx.hash}`)
    return newTx
  }
}

module.exports = new RetryTransactionService()
