const mongoose = require('mongoose')
const stageConfig = require('../../stage-config')

// Set up default mongoose connection
const connectDB = () => {
  return mongoose.connect(
    stageConfig.mongoURI || 'mongodb://localhost:27017/linkdrop_db',
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true
    }
  )
}

module.exports = connectDB
