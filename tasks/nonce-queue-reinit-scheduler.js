const stageConfig = require('../stage-config')
const cron = require('node-cron')
const logger = require('../src/utils/logger')
const nonceQueueService = require('../src/services/nonce-queue-service')

const reInitNonceQueueScheduler = () => {
  logger.info(`cron Reinit Nonce Queue Schedule is ${stageConfig.REINIT_NONCE_QUEUE_CRON_SCHEDULE}`)
  cron.schedule(`${stageConfig.REINIT_NONCE_QUEUE_CRON_SCHEDULE}`, async () => await nonceQueueService.reInitNextNonce())
  logger.info('reinitNonceQueueScheduler is on')
}

module.exports = {
  reInitNonceQueueScheduler
}
