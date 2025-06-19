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
    const operation = await operationService.findById(id)
    if (operation?.transactions) {
      logger.info(`Existing operation found: ${operation.id}. Operation status - ${operation.status}`)
      return this.getExistingTxHash(operation)
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
    let newOperation
    if (!operation) {
      newOperation = await operationService.create({
        id,
        data,
        nonce: tx.nonce,
        claimStarted: blockNumber
      })
    }

    // add transaction details to database
    await operationService.addTransaction(newOperation.id, tx, to)
    transactionTrackerService.trackPendingOperation(newOperation.id)

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

  async getOperation (id) {
    const operation = await operationService.findById(id)
    if (!operation) {
      throw new NotFoundError('Operation not found', 'OPERATION_NOT_FOUND')
    }

    return {
      txHash: this.getExistingTxHash(operation),
      status: operation.status
    }
  }
}

module.exports = new RelayerService()
