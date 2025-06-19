const mongoose = require('mongoose')
const TransactionSchema = require('./transaction')

const OperationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    nonce: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      required: true,
      default: 'created',
      enum: ['created', 'pending', 'completed', 'canceled', 'error', 'dropped']
    },
    contractAddress: {
      type: String,
      required: true
    },
    mined: {
      type: Boolean,
      default: false
    },
    txStarted: {
      // blockchain block number
      type: Number
    },
    txMined: {
      // blockchain block number
      type: Number
    },
    data: String,
    transactions: [TransactionSchema]
  },
  {
    timestamps: true
  }
)

OperationSchema.index({ id: 1 })
OperationSchema.index({ nonce: 1, id: 1 }, { unique: true })

const Operation = mongoose.model('Operation', OperationSchema)
module.exports = Operation
