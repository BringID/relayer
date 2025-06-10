const mongoose = require('mongoose')
const TransactionSchema = require('./transaction')

const OperationSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true
    },
    nonce: { // corresponds to nonce of the transaction
      type: Number,
      required: true
    },
    // should be equal to status of the latest transaction
    status: {
      type: String,
      required: true,
      default: 'created',
      enum: ['created', 'pending', 'completed', 'canceled', 'error', 'dropped']
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
    // data for the operation in unstructed format
    // as it's different for different operation types
    data: {},
    transactions: [TransactionSchema]
  },
  {
    timestamps: true
  }
)

OperationSchema.index({ taskId: 1 })
OperationSchema.index({ nonce: 1, taskId: 1 }, { unique: true })

const Operation = mongoose.model('Operation', OperationSchema)
module.exports = Operation
