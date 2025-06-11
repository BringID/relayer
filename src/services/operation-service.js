const logger = require('../utils/logger')
const Operation = require('../models/operation')

class OperationService {
  async findById (id) {
    return await Operation.findOne({ id })
  }

  async findPendingTxs () {
    return await Operation.find({ status: 'pending' })
  }

  async findByTxHash (txHash) {
    return await Operation.findOne({ 'transactions.hash': txHash })
  }

  async create ({
    id,
    data,
    nonce,
    claimStarted,
    status = 'created'
  }) {
    const operation = await Operation.create({
      id,
      data,
      nonce,
      status,
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
    logger.info(`Operation ${id} updated on mined tx: ${txHash} with status: ${status}`)
  }

  async addTransaction (id, tx) {
    const operation = await this.findById(id)

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
