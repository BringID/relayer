const stageConfig = require('../stage-config')
const cron = require('node-cron')
const logger = require('../src/utils/logger')
const checkDepositService = require('../src/services/check-deposit-service')

const checkDepositScheduler = () => {
  logger.info(`cron CheckDeposit Schedule is ${stageConfig.CHECK_DEPOSIT_CRON_SCHEDULE}`)
  cron.schedule(`${stageConfig.CHECK_DEPOSIT_CRON_SCHEDULE}`, async () => await checkDepositService.runCheckDeposits())
  logger.info('checkDepositScheduler is on')
}

module.exports = {
  checkDepositScheduler
}
