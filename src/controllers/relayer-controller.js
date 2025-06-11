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
    taskId: req.body.taskId,
    value: req.body.value
  }
  console.log('params', params)

  const result = await relayerService.addTaskAndSendTx(params)

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
