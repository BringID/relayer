const { claim } = require('./claim-link')
const stageConfig = require('../stage-config')
const csvToJson = require('csvtojson')
const path = require('path')
const logger = require('../src/utils/logger')

function sleep (ms) {
  logger.debug(`Sleeping for ${ms / 1000} seconds...`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

const autoClaimLink = async (recieverAddress, factoryAddress) => {
  logger.debug(`----Starting autoClaimLink script. recieverAddress is ${recieverAddress}`)
  const csvFilePath = path.resolve(__dirname, `handles-data/${stageConfig.NODE_ENV}-${stageConfig.CHAIN}-links.csv`)
  console.log({ csvFilePath })
  const jsonArray = await csvToJson().fromFile(csvFilePath)

  for (let i = 0; i < jsonArray.length; i++) {
    logger.debug(`----autoClaiming link # ${i}----`)
    const dataRow = jsonArray[i]
    logger.debug(`Link for autoclaim is ${dataRow.claim_link}`)

    try {
      claim(`${dataRow.claim_link}`, recieverAddress, factoryAddress)
    } catch (err) {
      logger.warn(err)
    }
    await sleep(stageConfig.TIMEOUT_MS)
  }
  return logger.debug(`autoClaimLink scripts is finished. Total links in script -- ${jsonArray.length}`)
}

autoClaimLink(stageConfig.CLAIM_RECIEVER_ADDRESS, '')
  .then(() => process.exit(0))
  .catch((err) => {
    logger.json(err)
    process.exit(1)
  })
