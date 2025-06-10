class CustomError extends Error {
  constructor (name, statusCode, message, cause) {
    super(message || name)
    this.name = name
    this.statusCode = statusCode
    this.cause = cause
    this.isOperational = true
    Error.captureStackTrace(this, CustomError)
  }
}

class ValidationError extends CustomError {
  constructor (message, cause) {
    super('ValidationError', 400, message, cause)
  }
}

class BadRequestError extends CustomError {
  constructor (message, cause) {
    super('BadRequestError', 400, message, cause)
  }
}

class NotFoundError extends CustomError {
  constructor (message, cause) {
    super('NotFoundError', 404, message, cause)
  }
}

class ForbiddenError extends CustomError {
  constructor (message, cause) {
    super('ForbiddenError', 403, message, cause)
  }
}

class UnauthorizedError extends CustomError {
  constructor (message, cause) {
    super('UnauthorizedError', 401, message, cause)
  }
}

class ConflictError extends CustomError {
  constructor (message, cause) {
    super('ConflictError', 409, message, cause)
  }
}

class UnprocessableEntityError extends CustomError {
  constructor (message, cause) {
    super('UnprocessableEntityError', 422, message, cause)
  }
}

class NotImplementedError extends CustomError {
  constructor (message, cause) {
    super('NotImplementedError', 500, message, cause)
  }
}

class ServiceUnavailableError extends CustomError {
  constructor (message, cause) {
    super('ServiceUnavailableError', 503, message, cause)
  }
}

module.exports = {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  NotImplementedError,
  ServiceUnavailableError,
  UnprocessableEntityError
}
