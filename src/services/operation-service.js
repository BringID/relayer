const logger = require('../utils/logger')
const Operation = require('../models/operation')

class OperationService {
  async findById (taskId) {
    return await Operation.findOne({ taskId })
  }

  async findPendingTxs () {
    return await Operation.find({ status: 'pending' })
  }

  async findByTxHash (txHash) {
    return await Operation.findOne({ 'transactions.hash': txHash })
  }

  createOperation ({}) {}

  async _create ({
    id,
    type,
    data,
    nonce,
    claimStarted,
    status = 'created'
  }) {

    const operation = await Operation.create({
      id,
      type,
      data,
      nonce,
      proxyAddress,
      claimStarted,
      transactions: []
    })

    logger.info(`New operation saved to database: ${operation.id} / ${nonce}`)
    return operation
  }

  async updateStatus ({ id, status }) {
    const operation = await this.findById(id)
    operation.status = status
    if (status === 'completed' || 'error') {
      operation.mined = true
    } else {
      operation.mined = false
    }
    await operation.save()

    logger.info(
      `Operation ${operation.id} status updated to ${status} `
    )
    return operation
  }

  async updateOnTransactionMined (id, txHash, receipt) {
    const operation = await this.findById(id)
    const status = receipt.status === 1 ? 'completed' : 'error'
    operation.status = status
    operation.claimCompleted = receipt.blockNumber
    operation.mined = true

    operation.transactions.map(tx => {
      if (tx.hash === txHash) {
        tx.status = status
      } else {
        tx.status = 'dropped'
      }
    })

    await operation.save()
    logger.info(`Operation ${id} updated on mined tx: ${txHash}`)
  }

  async updateFailedOperation (operationId) {
    const operation = await this.findById(operationId)
    const timestamp = Date.now()
    operation.id = `error-${operationId}-${timestamp}`

    await operation.save()
    logger.warn(`FailedOperation ${operationId} updated with new id -- error-${operationId}-${timestamp}`)
  }

  async addTransaction (operationId, tx) {
    const operation = await this.findById(operationId)

    const transaction = {
      hash: tx.hash,
      status: 'pending',
      params: tx
    }
    operation.transactions.push(transaction)

    operation.status = 'pending'
    await operation.save()

    logger.info(`Tx ${transaction.hash} was successfully saved to operation ${operation.id}`)
    return operation
  }
}

module.exports = new OperationService()
