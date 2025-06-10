const relayerService = require('../services/relayer-service')
const logger = require('../utils/logger')

const addTask = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'addTask',
    params: req.body
  })

  const params = {
    to: req.body.to,
    data: req.body.data,
    taskId: req.body.taskId
  }

  const result = await relayerService.addTask(params)

  res.json({
    success: true,
    tx_hash: result.txHash,
    status: result.status
  })
}

const getTask = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'getTask',
    taskId: req.params.taskId
  })

  const result = await relayerService.getTask(req.params.taskId)

  res.json({
    success: true,
    tx_hash: result.txHash,
    status: result.status
  })
}

module.exports = {
  addTask,
  getTask
}
