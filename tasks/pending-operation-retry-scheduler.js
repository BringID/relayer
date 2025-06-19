const cron = require('node-cron')
const logger = require('../src/utils/logger')
const stageConfig = require('../stage-config')
const pendingOperationsWorker = require('./pending-operations-worker')

const pendingOperationRetryScheduler = () => {
  logger.info(`cron pendingOperationRetryScheduler is ${stageConfig.PENDING_OPERATIONS_CRON_SCHEDULE}`)
  cron.schedule(`${stageConfig.PENDING_OPERATIONS_CRON_SCHEDULE}`, async () => await pendingOperationsWorker.runWorker())
  logger.info('pendingOperationRetryScheduler is on')
}

module.exports = {
  pendingOperationRetryScheduler
}
