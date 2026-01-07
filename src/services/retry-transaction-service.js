const { ethers } = require('ethers')
const logger = require('../utils/logger')
const operationService = require('./operation-service')
const relayerWalletService = require('./relayer-wallet-service')
const stageConfig = require('../../stage-config')

class RetryTransactionService {
  async retryTransaction (id) {
    const operation = await operationService.findById(id)
    const newTx = await this.prepareAndSendTransaction(operation)
    operationService.addTransaction(id, newTx)
    return newTx
  }

  async prepareAndSendTransaction (operation) {
    const transaction = operation.transactions[operation.transactions.length - 1].toObject()
    const retryFees = await relayerWalletService.calculateRetryFees(transaction)

    const { value, data, gasLimit, to } = transaction.params

    const params = {
      to,
      data,
      gasLimit,
      nonce: operation.nonce,
      value: ethers.parseUnits(value).toString()
    }

    if (stageConfig.NON_EIP_1559 === 'true') {
      params.gasPrice = retryFees.gasPrice
    } else {
      params.maxFeePerGas = retryFees.maxFeePerGas
      params.maxPriorityFeePerGas = retryFees.maxPriorityFeePerGas
    }

    const newTx = await relayerWalletService.sendRetryTransaction(params)
    logger.warn(`Operation ${operation.id}: re-submitted transaction. New tx: ${newTx.hash}`)
    return newTx
  }
}

module.exports = new RetryTransactionService()
