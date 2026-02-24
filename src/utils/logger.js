const Table = require('cli-table')
const stageConfig = require('../../stage-config')
const { createLogger, format, transports } = require('winston')
const { combine, printf } = format
let formatType = format.json()

if (stageConfig.NODE_ENV == 'development') {
  const loggerFormat = printf(({ level, message, timestamp }) => {
    const msg = `${timestamp} [${level}]: ${message}`
    return msg
  })

  formatType = combine(
    format.colorize(),
    format.simple(),
    format.timestamp(),
    loggerFormat
  )
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: formatType,
  transports: [
    //
    // - Write to all logs with level `info` and below to `quick-start-combined.log`.
    // - Write all logs error (and below) to `quick-start-error.log`.
    //
    new transports.Console({ level: process.env.LOG_LEVEL })
  ]
})

logger.table = (obj, logLevel = 'debug') => {
  const table = new Table()
  for (const key in obj) {
    if (key !== '_id' && key !== '__v') {
      table.push([key, obj[key]])
    }
  }
  logger[logLevel](`\n${table.toString()}`)
}

logger.json = (obj, logLevel = 'info') => {
  logger[logLevel](JSON.stringify(obj, null, 2))
}

logger.stream = {
  write: function (message, encoding) {
    logger.info(message)
  }
}

module.exports = logger
