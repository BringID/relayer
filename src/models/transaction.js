const mongoose = require('mongoose')

// Ethereum transaction schema (used in Operation Schema)
const TransactionSchema = new mongoose.Schema(
  {
    // tx hash
    hash: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      default: 'created',
      enum: ['created', 'pending', 'completed', 'error', 'dropped']
    },
    // mimics web3.eth.sendTransaction params
    params: {
      to: {
        type: String,
        required: true
      },
      // The value transferred for the transaction in wei
      value: {
        type: String,
        required: true
      },
      // The amount of gas used for the transaction (unused gas is refunded).
      gasLimit: {
        type: String,
        required: true
      },
      maxPriorityFeePerGas: {
        type: String,
        required: true
      },
      maxFeePerGas: {
        type: String,
        required: true
      },
      data: {
        type: String
      },
      nonce: {
        type: Number
      }
    }
  },
  {
    timestamps: true
  }
)

module.exports = TransactionSchema
