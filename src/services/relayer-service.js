const { ethers } = require('ethers')
const logger = require('../utils/logger')
const relayerWalletService = require('./relayer-wallet-service')
const latestNonceService = require('./latest-nonce-service')
const operationService = require('./operation-service')
const { ConflictError } = require('../utils/errors')

class RelayerService {
  async addTaskAndSendTx ({
    to,
    data,
    taskId,
    value
  }) {
    const operation = await operationService.findById(taskId)
    if (operation) {
      throw new ConflictError('Task already exists', 'TASK_ALREADY_EXISTS')
    }

    const nonce = await latestNonceService.getNonce()
    

  }

  async getTask ({ to, data, taskId }) {
  }
}

module.exports = new RelayerService()
