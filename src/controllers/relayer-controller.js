const relayerService = require('../services/relayer-service')
const logger = require('../utils/logger')

const executeOperation = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'executeOperation',
    params: req.body
  })

  const params = {
    id: req.body.id,
    to: req.body.to,
    data: req.body.data,
    value: req.body.value || '0'
  }

  const result = await relayerService.executeOperation(params)
  res.json({
    success: true,
    tx_hash: result.txHash,
    operation_id: result.operationId,
    status: result.status
  })
}

const getOperationStatus = async (req, res) => {
  logger.json({
    controller: 'relayer-controller',
    method: 'getOperationStatus',
    id: req.params.id
  })

  const result = await relayerService.getOperationStatus(req.params.id)

  res.json({
    success: true,
    tx_hash: result.txHash,
    status: result.status,
    operation_id: result.operationId
  })
}

module.exports = {
  getOperationStatus,
  executeOperation
}
