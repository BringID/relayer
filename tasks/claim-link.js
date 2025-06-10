/* eslint-disable */
const LinkdropSDK = require('@linkdrop/sdk').default
const logger = require('../src/utils/logger')
const queryString = require('query-string')
const stageConfig = require('../stage-config')

const getClaimLink = () => {
  const args = process.argv.slice(2)
  if (args.length < 1) throw new Error('Please provide claim link')
  return args[0]
}

const getReceiver = () => {
  const args = process.argv.slice(2)
  if (args.length < 2) throw new Error('Please provide receiver address')
  return args[1]
}

const getFactoryAddress = () => {
  const args = process.argv.slice(2)
  if (args.length < 2) throw new Error('Please provide factory address')
  return args[2]
}

const parseUrl = async (url) => {
  const rawUrl = url.replace('#', '')
  const parsedUrl = await queryString.extract(rawUrl)
  const parsed = await queryString.parse(parsedUrl)
  return parsed
}

const claim = async (link, receiverAddress, factoryAddress) => {
  const claimParams = await parseUrl(link)
  const linkdropSDK = new LinkdropSDK({
    linkdropMasterAddress: claimParams.linkdropMasterAddress,
    chain: stageConfig.CHAIN,
    jsonRpcUrl: stageConfig.JSON_RPC_URL,
    apiHost: stageConfig.CLAIM_API_HOST,
    factoryAddress
  })

  let claimMethod
  if (claimParams.tokenAddress && claimParams.tokenAmount) {
    claimMethod = 'claim'
  } else if (claimParams.nftAddress && claimParams.tokenAmount && claimParams.tokenId) {
    claimMethod = 'claimERC1155'
  } else if (claimParams.nftAddress && claimParams.tokenId) {
    claimMethod = 'claimERC721'
  }

  if (!claimMethod) throw new Error('Wrong link!')

  const { errors, success, txHash } = await linkdropSDK[claimMethod]({ ...claimParams, receiverAddress })

  if (success && txHash) {
    logger.debug('Submitted claim transaction')
    logger.debug(`Tx hash: ${txHash}\n`)
    return null
  }

  logger.debug('Some error occured')
  logger.debug(errors)
}

// claim(getClaimLink(), getReceiver(), getFactoryAddress()).then(() => {
//   process.exit(0)
// }).catch((err) => {
//   logger.warn('Error occured while claiming link')
//   logger.warn(err)
//   process.exit(1)
// })

module.exports = {
  claim
}
