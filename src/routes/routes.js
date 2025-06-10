const routes = {
  '/add-task': {
    post: {
      controller: 'relayer-controller',
      method: 'addTask'
      // celebrateSchema: 'addTask'
    }
  },
  '/get-task/:taskId': {
    get: {
      controller: 'relayer-controller',
      method: 'getTask'
      // celebrateSchema: 'getTask'
    }
  }
}

module.exports = routes
