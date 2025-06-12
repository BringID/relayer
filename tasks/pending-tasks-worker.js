const logger = require('../src/utils/logger')
const taskService = require('../src/services/task-service')
const relayerWalletService = require('../src/services/relayer-wallet-service')
const transactionTrackerService = require('../src/services/transaction-tracker-service')

class PendingTasksWorker {
  constructor () {
    this.isRunning = false
  }

  async retryTasks (tasks) {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      
      try {
        logger.debug(`__PendingTasksWorker__: Retrying Task ${task.id}`)
        logger.json({ service: '__PendingTasksWorker__:', method: 'retryTasks', task: task.id, status: task.status })
        const transaction = task.transactions[task.transactions.length - 1].toObject()
        
        const receipt = await relayerWalletService.getTransactionReceipt(transaction.hash)

        if (receipt?.status === 1) {
          await taskService.updateStatus({ id: task.id, status: 'completed' })
          logger.warn(`__PendingTasksWorker__: Task ${task.id} was updated with status 'completed' in DB from blockchain.`)
          await taskService.updateOnTransactionMined(task.id, transaction.hash, receipt)
          continue
        }

        if (task.status !== 'pending') {
          await taskService.updateStatus({ id: task.id, status: 'pending' })
        }
        transactionTrackerService.trackPendingTask(task.id, true)
      } catch (error) {
        logger.error(`__PendingTasksWorker__: Error processing task ${task.id}:`, error)
        logger.json({ 
          service: '__PendingTasksWorker__:', 
          method: 'retryTasks', 
          task: task.id, 
          error: error.message,
          action: 'skipping_task_and_continuing'
        })
        // Continue with the next task
        continue
      }
    }
  }

  async runWorker () {
    logger.debug('__PendingTasksWorker__: Starting scheduled execution...')

    if (this.isRunning) {
      logger.warn('__PendingTasksWorker__: Script is already running. Skipping execution.')
      return null
    }

    this.isRunning = true

    try {
      await this._processPendingTasks()
    } catch (err) {
      logger.error('__PendingTasksWorker__: Caught an error while executing task.')
      logger.error(err)
    } finally {
      this.isRunning = false
      logger.debug('__PendingTasksWorker__: execution completed.')
    }
  }

  async _processPendingTasks () {
    const pendingTasks = await taskService.findPendingTxs()
    
    if (pendingTasks.length === 0) {
      logger.debug('__PendingTasksWorker__: No pending transactions found.')
      return
    }

    logger.warn(`__PendingTasksWorker__: Found pending tasks: ${pendingTasks.length}`)
    await this.retryTasks(pendingTasks)
    logger.info(`__PendingTasksWorker__: Re-submitted ${pendingTasks.length} pending tasks.`)
  }
}

module.exports = new PendingTasksWorker() 