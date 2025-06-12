const cron = require('node-cron')
const logger = require('../src/utils/logger')
const stageConfig = require('../stage-config')
const pendingTasksWorker = require('./pending-tasks-worker')

const pendingTaskRetryScheduler = () => {
  logger.info(`cron pendingTaskRetryScheduler is ${stageConfig.PENDING_TASKS_CRON_SCHEDULE}`)
  cron.schedule(`${stageConfig.PENDING_TASKS_CRON_SCHEDULE}`, async () => await pendingTasksWorker.runWorker())
  logger.info('pendingTaskRetryScheduler is on')
}

module.exports = {
  pendingTaskRetryScheduler
}
