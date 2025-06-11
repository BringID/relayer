const mongoose = require('mongoose')
const stageConfig = require('../../stage-config')

// Set up default mongoose connection
const connectDB = () => {
  return mongoose.connect(
    stageConfig.mongoURI || 'mongodb://127.0.0.1:27017/dev_zkbring_relayer_db'
  )
}

module.exports = connectDB
