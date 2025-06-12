const routes = {
  '/execute-task': {
    post: {
      controller: 'relayer-controller',
      method: 'executeTask'
      // celebrateSchema: 'executeTask'
    }
  },
  '/task/:id': {
    get: {
      controller: 'relayer-controller',
      method: 'getTask'
      // celebrateSchema: 'getTask'
    }
  }
}

module.exports = routes
