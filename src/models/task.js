const mongoose = require('mongoose')
const TransactionSchema = require('./transaction')

const TaskSchema = new mongoose.Schema(
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

TaskSchema.index({ id: 1 })
TaskSchema.index({ nonce: 1, id: 1 }, { unique: true })

const Task = mongoose.model('Task', TaskSchema)
module.exports = Task
