const logger = require('../utils/logger')
const relayerWalletService = require('./relayer-wallet-service')
const operationService = require('./operation-service')

class RelayerService {
  async addTaskAndSendTx ({
    to,
    data,
    taskId,
    value
  }) {
    console.log('addTaskAndSendTx', to, data, taskId, value)
    const operation = await operationService.findById(taskId)
    if (operation?.transactions) {
      logger.info(`Existing operation found: ${operation.id}. Operation status - ${operation.status}`)
      return this.getExistingTxHash(operation)
    }

    const txParams = {
      to,
      data,
      value
    }

    // send claim transaction to blockchain
    const promises = [relayerWalletService.sendTransaction(txParams), relayerWalletService.getBlockNumber()]
    const [tx, blockNumber] = await Promise.all(promises)

    logger.info('Submitted claim tx: ' + tx.hash)

    if (!operation) {
      await operationService.create({
        taskId,
        nonce: tx.nonce,
        claimStarted: blockNumber,
        data
      })
    }

    // add transaction details to database
    await operationService.addTransaction(taskId, tx)
    operationService.trackPendingOperation(taskId)

    return tx.hash
  }

  getExistingTxHash (operation) {
    const completedTx = this._getCompletedTx(operation)
    if (!completedTx.length) return this._getLastTxHash(operation)

    return completedTx[0].hash
  }

  _getCompletedTx (operation) {
    return operation.transactions.filter(tx => tx.status === 'completed')
  }

  _getLastTxHash (operation) {
    const tx = operation.transactions[operation.transactions.length - 1]
    const lastTxHash = tx.hash
    return lastTxHash
  }

  async getTask ({ to, data, taskId }) {
  }
}

module.exports = new RelayerService()
