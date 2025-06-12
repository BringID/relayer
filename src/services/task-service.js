const logger = require('../utils/logger')
const Task = require('../models/task')

class TaskService {
  async findById (id) {
    return await Task.findOne({ id })
  }

  async findPendingTxs () {
    return await Task.find({ status: 'pending' })
  }

  async findByTxHash (txHash) {
    return await Task.findOne({ 'transactions.hash': txHash })
  }

  async create ({
    id,
    data,
    nonce,
    claimStarted,
    status = 'created'
  }) {
    const task = await Task.create({
      id,
      data,
      nonce,
      status,
      claimStarted,
      transactions: []
    })

    logger.info(`New task saved to database: ${task.id} / ${nonce}`)
    return task
  }

  async updateStatus ({ id, status }) {
    const task = await this.findById(id)
    task.status = status
    if (status === 'completed' || 'error') {
      task.mined = true
    } else {
      operation.mined = false
    }
    await task.save()

    logger.info(
      `Task ${task.id} status updated to ${status} `
    )
    return task
  }

  async updateOnTransactionMined (id, txHash, receipt) {
    const task = await this.findById(id)
    const status = receipt.status === 1 ? 'completed' : 'error'
    task.status = status
    task.claimCompleted = receipt.blockNumber
    task.mined = true

    task.transactions.map(tx => {
      if (tx.hash === txHash) {
        tx.status = status
      } else {
        tx.status = 'dropped'
      }
    })

    await task.save()
    logger.info(`Task ${id} updated on mined tx: ${txHash} with status: ${status}`)
  }

  async addTransaction (id, tx) {
    const task = await this.findById(id)

    const transaction = {
      hash: tx.hash,
      status: 'pending',
      params: tx
    }
    task.transactions.push(transaction)

    task.status = 'pending'
    await task.save()

    logger.info(`Tx ${transaction.hash} was successfully saved to task ${task.id}`)
    return task
  }
}

module.exports = new TaskService()
