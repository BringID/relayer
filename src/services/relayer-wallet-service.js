const BN = require('bn.js')
const ethers = require('ethers')
const logger = require('../utils/logger')
const stageConfig = require('../../stage-config')
const nonceQueueService = require('./nonce-queue-service')
const errorToWarn = require('../../configs/error-to-warn.json')
const { BadRequestError } = require('../utils/errors')
const errorParser = require('../utils/error-parser')

if (stageConfig.JSON_RPC_URL == null || stageConfig.JSON_RPC_URL === '') {
  throw new Error('Please provide json rpc url')
}

if (stageConfig.RELAYER_PRIVATE_KEY == null || stageConfig.RELAYER_PRIVATE_KEY === '') {
  throw new Error('Please provide relayer private key')
}

class AutoNonceWallet extends ethers.Wallet {
  async sendTransaction (transaction) {
    // if (stageConfig.CHAIN_ID !== '84532') {
      // hardcode gas limit to 1500k
      transaction.gasLimit = 3000000
    // }

    const isNonceNew = transaction.nonce == null
    if (isNonceNew) {
      transaction.nonce = await nonceQueueService.getNextNonce()
    }

    try {
      const tx = await super.sendTransaction(transaction)
      if (isNonceNew) nonceQueueService.complete(true)
      return tx
    } catch (err) {
      const errorCode = err?.code || 'TRANSACTION_FAILED'
      const message = err?.message || err?.reason || 'Transaction failed'

      if (isNonceNew) nonceQueueService.complete(false)

      if (errorToWarn[errorCode]) {
        logger.warn(`Non-critical error during transaction submission: ${message}`)
      } else {
        logger.error(`Error during transaction submission: ${message}`)
        logger.error(err)
      }

      throw new BadRequestError(message, errorCode)
    }
  }
}

class RelayerWalletService {
  constructor () {
    this.provider = new ethers.JsonRpcProvider(
      stageConfig.JSON_RPC_URL, undefined, { staticNetwork: true }
    )
    this.relayerWallet = new AutoNonceWallet(stageConfig.RELAYER_PRIVATE_KEY, this.provider)
  }

  async sendTransaction ({
    to,
    data,
    value
  }) {
    const feeData = await this.getFeeData()
    
    const transaction = {
      to,
      data,
      value
    }
    
    if (stageConfig.NON_EIP_1559 === 'true') {
      transaction.gasPrice = feeData.gasPrice
    } else {
      transaction.maxFeePerGas = feeData.maxFeePerGas
      transaction.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
    }
    
    return await this.relayerWallet.sendTransaction(transaction)
  }

  async sendRetryTransaction ({
    to,
    data,
    nonce,
    value,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasPrice
  }) {
    const transaction = {
      to,
      data,
      nonce,
      value,
      gasLimit
    }
    
    if (stageConfig.NON_EIP_1559 === 'true') {
      transaction.gasPrice = gasPrice
    } else {
      transaction.maxFeePerGas = maxFeePerGas
      transaction.maxPriorityFeePerGas = maxPriorityFeePerGas
    }
    
    return await this.relayerWallet.sendTransaction(transaction)
  }

  async simulateCall({ to, data, value }) {
    try {
      // Simulate the transaction call
      const result = await this.provider.call({
        to,
        data,
        value: value || 0,
        from: this.relayerWallet.address
      })
      return { success: true, result }
    } catch (err) {
      errorParser.parseContractError(err, 'airdrop')
    }
  }

  async getBlockNumber () {
    return this.provider.getBlockNumber()
  }

  getNextBlock () {
    return new Promise((resolve, reject) => {
      try {
        this.provider.once('block', function (blockNumber) {
          resolve(blockNumber)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  async fetchFeeData () {
    if (stageConfig.OPSTACK === 'true') {
      return this.fetchGasPrice()
    }

    if (stageConfig.NON_EIP_1559 === 'true') {
      return this.fetchLegacyGasPrice()
    }

    const feeData = await this.provider.getFeeData()
    const {
      maxFeePerGas,
      maxPriorityFeePerGas
    } = feeData

    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    }
  }

  getDefaultFeeData () {
    const maxFeePerGas = ethers.parseUnits(stageConfig.DEFAULT_GAS_PRICE, 'gwei')
    const maxPriorityFeePerGas = ethers.parseUnits(stageConfig.DEFAULT_PIORITY_FEE_PER_GAS_PRICE, 'gwei')
    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    }
  }

  getDefaultLegacyGasPrice () {
    const gasPrice = ethers.parseUnits(stageConfig.DEFAULT_GAS_PRICE, 'gwei')
    return {
      gasPrice
    }
  }

  async _fetchRpcGasPrice () {
    const url = stageConfig.JSON_RPC_URL
    const options = {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'eth_gasPrice' })
    }

    const res = await fetch(`${url}`, options)
    const data = await res.json()
    if (!data || !data.result) {
      const message = data?.error?.message || 'No error message provided by RPC provider'
      throw new BadRequestError(`Invalid response from RPC provider: ${message}`, 'INVALID_RESPONSE_FROM_RPC_PROVIDER')
    }

    return data.result
  }

  async fetchGasPrice () {
    try {
      const gasPrice = await this._fetchRpcGasPrice()
      const maxFeePerGas = BigInt(gasPrice) + BigInt(
        ethers.parseUnits(
          stageConfig.GWEI_ADDED_TO_MEDIAN_GAS_PRICE, 'gwei').toString())
      const maxPriorityFeePerGas = BigInt(maxFeePerGas) / BigInt('100')

      return {
        maxFeePerGas,
        maxPriorityFeePerGas
      }
    } catch (err) {
      logger.error(`Catch an error while fetching gas price from RPC provider. Default fee data will be used. Reason: ${err.message}`)
      return this.getDefaultFeeData()
    }
  }

  async fetchLegacyGasPrice () {
    try {
      const gasPrice = await this._fetchRpcGasPrice()
      const gasPriceBigInt = BigInt(gasPrice) + BigInt(
        ethers.parseUnits(
          stageConfig.GWEI_ADDED_TO_MEDIAN_GAS_PRICE, 'gwei').toString())

      return {
        gasPrice: gasPriceBigInt
      }
    } catch (err) {
      logger.error(`Catch an error while fetching gas price from RPC provider. Default fee data will be used. Reason: ${err.message}`)
      return this.getDefaultLegacyGasPrice()
    }
  }

  _processEIP1559FeeData (feeData) {
    let {
      maxFeePerGas,
      maxPriorityFeePerGas
    } = feeData

    const maximumGasFee = BN.min(
      new BN(maxFeePerGas.toString()),
      new BN(ethers.parseUnits(stageConfig.MAX_GAS_PRICE, 'gwei').toString())
    )
    maxFeePerGas = BigInt(maximumGasFee.toString())
    maxPriorityFeePerGas = BigInt(maxPriorityFeePerGas.toString())
    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    }
  }

  _processLegacyFeeData (feeData) {
    const { gasPrice } = feeData
    const maximumGasFee = BN.min(
      new BN(gasPrice.toString()),
      new BN(ethers.parseUnits(stageConfig.MAX_GAS_PRICE, 'gwei').toString())
    )
    return {
      gasPrice: BigInt(maximumGasFee.toString())
    }
  }

  async getFeeData () {
    const feeData = await this.fetchFeeData()
    
    if (stageConfig.NON_EIP_1559 === 'true') {
      return this._processLegacyFeeData(feeData)
    }
    
    return this._processEIP1559FeeData(feeData)
  }

  async getTransactionReceipt (txHash) {
    return await this.provider.getTransactionReceipt(txHash)
  }

  async _calculateEIP1559RetryFees (transaction) {
    let {
      maxFeePerGas,
      maxPriorityFeePerGas
    } = await this.getFeeData()

    const txMaxFeePerGas = BigInt(transaction.params.maxFeePerGas.toString())
    const txMaxPriorityFeePerGas = BigInt(transaction.params.maxPriorityFeePerGas.toString())

    if (txMaxFeePerGas >= maxFeePerGas) {
      maxFeePerGas = txMaxFeePerGas + BigInt(ethers.parseUnits(stageConfig.GWEI_ADDED_ON_RETRY, 'gwei'))
    }

    if (txMaxPriorityFeePerGas >= maxPriorityFeePerGas) {
      logger.debug(`__feePerGasOption__ : txMaxPriorityFeePerGas: ${txMaxPriorityFeePerGas}, maxPriorityFeePerGas: ${maxPriorityFeePerGas}`)
      maxPriorityFeePerGas = txMaxPriorityFeePerGas + BigInt(
        ethers.parseUnits(stageConfig.GWEI_ADDED_TO_PRIORITY_FEE_ON_RETRY, 'gwei'))
      logger.debug(`__feePerGasOption__ : ${stageConfig.GWEI_ADDED_TO_PRIORITY_FEE_ON_RETRY} GWEI was added to txMaxPriorityFeePerGas: ${maxPriorityFeePerGas}`)
    }

    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    }
  }

  async _calculateLegacyRetryFees (transaction) {
    let { gasPrice } = await this.getFeeData()

    const txGasPrice = BigInt(transaction.params.gasPrice.toString())

    if (txGasPrice >= gasPrice) {
      gasPrice = txGasPrice + BigInt(ethers.parseUnits(stageConfig.GWEI_ADDED_ON_RETRY, 'gwei'))
      logger.debug(`__feePerGasOption__ : ${stageConfig.GWEI_ADDED_ON_RETRY} GWEI was added to gasPrice: ${gasPrice}`)
    }

    return {
      gasPrice
    }
  }

  async calculateRetryFees (transaction) {
    if (stageConfig.NON_EIP_1559 === 'true') {
      return this._calculateLegacyRetryFees(transaction)
    }
    
    return this._calculateEIP1559RetryFees(transaction)
  }

  async waitNBlocks (n) {
    let currentBlock = await this.getBlockNumber()
    const initialBlock = currentBlock
    while ((currentBlock - initialBlock) <= n) {
      currentBlock = await this.getNextBlock()
    }
    return currentBlock
  }
}

module.exports = new RelayerWalletService()
