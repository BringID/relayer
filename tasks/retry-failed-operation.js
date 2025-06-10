const {
  claimServiceERC20,
  claimServiceERC721,
  claimServiceERC1155
} = require('../src/services/claim-services')
const connectDB = require('../src/models/connectDB')
const operationService = require('../src/services/operation-service')
const logger = require('../src/utils/logger')

const getFailedOperationId = () => {
  const args = process.argv.slice(2)
  if (args.length < 1) throw new Error('Please provide operationId')
  return args[0]
}

const retryFailedOperation = async (operationId) => {
  connectDB(logger.info('Connected to DB'))
  const failedOperation = await operationService.findById(operationId)
  const claimParams = failedOperation?.data
  if (!claimParams) throw new Error('claimParams not found')
  await operationService.updateFailedOperation(operationId)

  let txHash
  if (claimParams.tokenAddress && claimParams.tokenAmount) {
    txHash = await claimServiceERC20.claim(claimParams)
  } else if (claimParams.nftAddress && claimParams.tokenId) {
    txHash = await claimServiceERC721.claim(claimParams)
  } else if (claimParams.nftAddress && claimParams.tokenAmount && claimParams.tokenId) {
    txHash = await claimServiceERC1155.claim(claimParams)
  }

  if (!txHash) {
    logger.debug('Some error occured')
    process.exit(1)
  }

  logger.debug('Submitted claim transaction')
  logger.debug(`Tx hash: ${txHash}\n`)
  process.exit(0)
}

retryFailedOperation(getFailedOperationId())
