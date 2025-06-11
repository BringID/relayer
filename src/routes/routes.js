const routes = {
  '/add-task': {
    post: {
      controller: 'relayer-controller',
      method: 'addTask'
      // celebrateSchema: 'addTask'
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
