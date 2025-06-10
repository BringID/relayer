const express = require('express')
const asyncHandler = require('express-async-handler')
const { celebrateMiddleware } = require('../utils/celebrate-builder')

const constructRouter = routesPath => {
  const apiRouter = express.Router()
  // load all routes
  const routes = require('./' + routesPath)
  for (const url in routes) {
    const verbs = routes[url]
    for (const verb in verbs) {
      const def = verbs[verb]
      const method = require('../controllers/' + def.controller)[def.method]
      if (!method) {
        throw new Error(def.method + ' is undefined')
      }
      const middleware = []
      if (def.celebrateSchema) middleware.push(asyncHandler(celebrateMiddleware(def.celebrateSchema)))
      middleware.push(asyncHandler(method))
      apiRouter[verb](url, middleware)
    }
  }

  return apiRouter
}

module.exports = constructRouter
