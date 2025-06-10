const EventEmitter = require('eventemitter3')
const latestNonceService = require('./latest-nonce-service')
const logger = require('../utils/logger')

class NonceQueueService {
  constructor () {
    this._init()
  }

  async _init () {
    this.eventEmitter = new EventEmitter()
    this.jobCounter = 0
    this.queuedJobs = []
    this.nextNonce = await latestNonceService.getNonce()
    logger.debug(`NonceQueueService inited with nonce ${this.nextNonce}`)
  }

  async reInitNextNonce () {
    const reInitNonce = await latestNonceService.getNonce()
    const maxNonce = Math.max(reInitNonce, this.nextNonce)
    this.nextNonce = maxNonce
    logger.debug(`reInitNonce: ${reInitNonce}, maxNonce: ${maxNonce}. NonceQueueService updated with nonce ${this.nextNonce}`)
  }

  getNextNonce () {
    return new Promise(resolve => {
      this.jobCounter += 1
      const jobId = this.jobCounter
      this.queuedJobs.push(jobId)
      logger.debug(`__NonceQueueService__: Job ${jobId} added to queue.`)
      if (this.queuedJobs.length === 1) {
        logger.debug(`__NonceQueueService__: Job ${jobId} resolved without event emitter. Nonce: ${this.nextNonce}`)
        resolve(this.nextNonce)
        return null
      }

      this.eventEmitter.once(`JOB_COMPLETED_${jobId}`, (jobToResolve) => {
        logger.debug(`__NonceQueueService__: Job ${jobToResolve} needs to be resolved, emitter job ID ${jobId}`)
        if (jobToResolve === jobId) {
          logger.debug(`__NonceQueueService__: Job ${jobId} resolved WITH event emitter. Nonce: ${this.nextNonce}`)
          logger.debug(`__NonceQueueService__: Job ${jobId} listener removed`)
          resolve(this.nextNonce)
          return null
        }
      })

      logger.debug(`__NonceQueueService__: Job ${jobId} created new event listenter.`)
    })
  }

  complete (success) {
    if (success) this.nextNonce += 1
    const completedJob = this.queuedJobs.shift() // remove first element
    logger.debug(`__NonceQueueService__: Job ${completedJob} completed and removed from queue`)
    if (this.queuedJobs.length > 0) {
      logger.debug(`__NonceQueueService__: current queue - ${this.queuedJobs}`)
      const jobIdToResolve = this.queuedJobs[0]
      this.eventEmitter.emit(`JOB_COMPLETED_${jobIdToResolve}`, jobIdToResolve)
    } else {
      logger.debug('__NonceQueueService__: No jobs left to complete')
    }
  }
}

module.exports = new NonceQueueService()
