const routes = {
  '/execute-operation': {
    post: {
      controller: 'relayer-controller',
      method: 'executeOperation'
      // celebrateSchema: 'executeOperation'
    }
  },
  '/operation/:id': {
    get: {
      controller: 'relayer-controller',
      method: 'getOperation'
      // celebrateSchema: 'getOperation'
    }
  }
}

module.exports = routes
