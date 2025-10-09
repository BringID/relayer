const { ethers } = require('ethers')
const logger = require('../utils/logger')
const operationService = require('./operation-service')
const relayerWalletService = require('./relayer-wallet-service')
const transactionTrackerService = require('./transaction-tracker-service')
const { NotFoundError } = require('../utils/errors')

class RelayerService {
  async executeOperation ({
    id,
    to,
    data,
    value
  }) {
    let operation = await operationService.findById(id)
    if (operation?.transactions) {
      logger.info(`Existing operation found: ${operation.id}. Operation status - ${operation.status}`)
      return {
        txHash: this.getExistingTxHash(operation),
        operationId: operation.id,
        status: operation.status
      }
    }

    const txParams = { 
      to, 
      data,
      value: ethers.parseUnits(value)
    }

    await relayerWalletService.simulateCall(txParams)

    const promises = [
      relayerWalletService.sendTransaction(txParams), 
      relayerWalletService.getBlockNumber()
    ]
    const [tx, blockNumber] = await Promise.all(promises)

    logger.info('Submitted tx: ' + tx.hash)

    if (!operation) {
      operation = await operationService.create({
        id,
        data,
        nonce: tx.nonce,
        contractAddress: to,
        txStarted: blockNumber
      })
    }

    // add transaction details to database
    const pendingOperation = await operationService.addTransaction(operation.id, tx, to)
    transactionTrackerService.trackPendingOperation(operation.id)

    return {
      txHash: tx.hash,
      operationId: operation.id,
      status: pendingOperation.status
    }
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

  async getOperationStatus (id) {
    const operation = await operationService.findById(id)
    if (!operation) {
      throw new NotFoundError('Operation not found', 'OPERATION_NOT_FOUND')
    }

    return {
      txHash: this.getExistingTxHash(operation),
      status: operation.status,
      operationId: operation.id
    }
  }
}

module.exports = new RelayerService()
