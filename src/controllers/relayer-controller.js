const relayerService = require('../services/relayer-service')
const logger = require('../utils/logger')

const executeTask = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'executeTask',
    params: req.body
  })

  const params = {
    id: req.body.id,
    to: req.body.to,
    data: req.body.data,
    value: req.body.value || '0'
  }

  const txHash = await relayerService.executeTask(params)

  res.json({
    success: true,
    tx_hash: txHash
  })
}

const getTask = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'getTask',
    id: req.params.id
  })

  const result = await relayerService.getTask(req.params.id)

  res.json({
    success: true,
    tx_hash: result.txHash,
    status: result.status
  })
}

module.exports = {
  getTask,
  executeTask
}
