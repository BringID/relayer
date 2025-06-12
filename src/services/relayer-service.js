const { ethers } = require('ethers')
const logger = require('../utils/logger')
const taskService = require('./task-service')
const relayerWalletService = require('./relayer-wallet-service')
const transactionTrackerService = require('./transaction-tracker-service')
const { NotFoundError } = require('../utils/errors')

class RelayerService {
  async executeTask ({
    id,
    to,
    data,
    value
  }) {
    const task = await taskService.findById(id)
    if (task?.transactions) {
      logger.info(`Existing task found: ${task.id}. Task status - ${task.status}`)
      return this.getExistingTxHash(task)
    }

    const txParams = { 
      to, 
      data,
      value: ethers.parseUnits(value)
    }


    const promises = [
      relayerWalletService.sendTransaction(txParams), 
      relayerWalletService.getBlockNumber()
    ]
    const [tx, blockNumber] = await Promise.all(promises)

    logger.info('Submitted claim tx: ' + tx.hash)

    if (!task) {
      await taskService.create({
        id,
        data,
        nonce: tx.nonce,
        claimStarted: blockNumber
      })
    }

    // add transaction details to database
    await taskService.addTransaction(id, tx)
    transactionTrackerService.trackPendingTask(id)

    return tx.hash
  }

  getExistingTxHash (task) {
    const completedTx = this._getCompletedTx(task)
    if (!completedTx.length) return this._getLastTxHash(task)

    return completedTx[0].hash
  }

  _getCompletedTx (task) {
    return task.transactions.filter(tx => tx.status === 'completed')
  }

  _getLastTxHash (task) {
    const tx = task.transactions[task.transactions.length - 1]
    const lastTxHash = tx.hash
    return lastTxHash
  }

  async getTask (id) {
    const task = await taskService.findById(id)
    if (!task) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND')
    }

    return {
      txHash: this.getExistingTxHash(task),
      status: task.status
    }
  }
}

module.exports = new RelayerService()
