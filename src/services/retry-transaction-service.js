const operationService = require("./operation-service")
const relayerWalletService = require("./relayer-wallet-service")
const logger = require("../utils/logger")

class RetryTransactionService {
  async retryTransaction (operationId) {
    const operation = await operationService.findById(operationId)
    const transaction = operation.transactions[operation.transactions.length - 1].toObject()
    let {
      maxFeePerGas,
      maxPriorityFeePerGas
    } = await relayerWalletService.calculateRetryFees()

    const { nonce, value, data, gasLimit, to } = transaction.params

    const params = {
      to,
      data,
      nonce,
      gasLimit,
      value: ethers.utils.parseUnits(value),
      maxFeePerGas,
      maxPriorityFeePerGas
    }
    const newTx = await relayerWalletService.sendTransaction(params)
    logger.warn(`Operation ${operationId}: re-submitted transaction. New tx: ${newTx.hash}`)

    operationService.addTransaction(operationId, newTx)
    return newTx
  }
}

module.exports = new RetryTransactionService()