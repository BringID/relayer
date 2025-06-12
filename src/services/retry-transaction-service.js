const { ethers } = require('ethers')
const logger = require('../utils/logger')
const taskService = require('./task-service')
const relayerWalletService = require('./relayer-wallet-service')

class RetryTransactionService {
  async retryTransaction (id) {
    const task = await taskService.findById(id)
    const newTx = await this.prepareAndSendTransaction(task)
    taskService.addTransaction(id, newTx)
    return newTx
  }

  async prepareAndSendTransaction (task) {
    const transaction = task.transactions[task.transactions.length - 1].toObject()
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
      nonce: task.nonce,
      maxPriorityFeePerGas,
      value: ethers.parseUnits(value).toString()
    }

    const newTx = await relayerWalletService.sendRetryTransaction(params)
    logger.warn(`Task ${task.id}: re-submitted transaction. New tx: ${newTx.hash}`)
    return newTx
  }
}

module.exports = new RetryTransactionService()
