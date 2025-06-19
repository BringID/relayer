const relayerService = require('../services/relayer-service')
const logger = require('../utils/logger')

const executeOperation = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'executeOperation',
    params: req.body
  })
  console.log('req.body', req.body)

  const params = {
    id: req.body.id,
    to: req.body.to,
    data: req.body.data,
    value: req.body.value || '0'
  }
  console.log('params', params)

  const txHash = await relayerService.executeOperation(params)

  res.json({
    success: true,
    tx_hash: txHash,
    operation_id: Date.now().toString()
  })
}

const getOperation = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'getOperation',
    id: req.params.id
  })

  const result = await relayerService.getOperation(req.params.id)

  res.json({
    success: true,
    tx_hash: result.txHash,
    status: result.status
  })
}

module.exports = {
  getOperation,
  executeOperation
}
