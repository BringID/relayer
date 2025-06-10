const stageConfig = require('../stage-config')
const cron = require('node-cron')
const logger = require('../src/utils/logger')
const refundPaymentService = require('../src/services/refund-payment-service')

const refundPaymentScheduler = () => {
  logger.info(`cron Refund Schedule is ${stageConfig.REFUND_CRON_SCHEDULE}`)
  cron.schedule(`${stageConfig.REFUND_CRON_SCHEDULE}`, async () => await refundPaymentService.runRefund())
  logger.info('refundOperationScheduler is on')
}

module.exports = {
  refundPaymentScheduler
}
