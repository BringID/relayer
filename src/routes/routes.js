const routes = {
  '/operations/execute': {
    post: {
      controller: 'relayer-controller',
      method: 'executeOperation'
      // celebrateSchema: 'executeOperation'
    }
  },
  '/operations/:id/status': {
    get: {
      controller: 'relayer-controller',
      method: 'getOperationStatus'
      // celebrateSchema: 'getOperationStatus'
    }
  }
}

module.exports = routes
