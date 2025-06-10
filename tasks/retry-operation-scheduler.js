const retryOperationService = require('../src/services/retry-operation-service')
const cron = require('node-cron')
const logger = require('../src/utils/logger')
const stageConfig = require('../stage-config')

const retryOperationScheduler = () => {
  logger.info(`cron Retry Schedule is ${stageConfig.RETRY_CRON_SCHEDULE}`)
  cron.schedule(`${stageConfig.RETRY_CRON_SCHEDULE}`, async () => await retryOperationService.runRetryOperations())
  logger.info('retryOperationScheduler is on')
}

module.exports = {
  retryOperationScheduler
}
