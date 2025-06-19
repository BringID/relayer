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
    to: req.body.to,
    type: req.body.type,
    data: req.body.data,
    batchId: req.body.batch_id,
    value: req.body.value || '0'
  }
  console.log('params', params)

  const result = await relayerService.executeOperation(params)

  res.json({
    success: true,
    tx_hash: result.txHash,
    operation_id: result.operationId
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
