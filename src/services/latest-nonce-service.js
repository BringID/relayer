const stageConfig = require('../../stage-config')
const ethers = require('ethers')
const Operation = require('../models/operation')

class LatestNonceService {
  constructor () {
    this.provider = new ethers.JsonRpcProvider(stageConfig.JSON_RPC_URL)
    this.wallet = new ethers.Wallet(stageConfig.RELAYER_PRIVATE_KEY, this.provider)
  }

  async _getLatestNonce ({ from, mined }) {
    const params = {}
    params.from = from.toLowerCase()
    if (mined) params.mined = true
    const latestOp = await Operation.find(params).sort({ _id: -1 }).limit(1)
    if (latestOp.length === 0 || !latestOp[0].nonce) {
      return -1
    }
    return latestOp[0].nonce
  }

  async getLatestNonceInDB ({ from, mined = false }) {
    return this._getLatestNonce({ from, mined })
  }

  async getLatestMinedNonceInDB ({ from, mined = true }) {
    return this._getLatestNonce({ from, mined })
  }

  async getTransactionCount ({ from }) {
    const transactionCount = await this.provider.getTransactionCount(from)
    return transactionCount
  }

  async getNonce (from) {
    const params = { from }
    if (!params.from) params.from = this.wallet.address
    const transactionCount = await this.getTransactionCount(params)
    let latestNonceInDB = await this.getLatestNonceInDB(params)
    latestNonceInDB += 1
    const maxNonce = Math.max(transactionCount, latestNonceInDB)
    return Promise.resolve(maxNonce)
  }
}

module.exports = new LatestNonceService()
