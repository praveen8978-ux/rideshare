class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(msg = 'Not found') { super(msg, 404); }
}

class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') { super(msg, 401); }
}

class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') { super(msg, 403); }
}

class ValidationError extends AppError {
  constructor(msg = 'Validation failed') { super(msg, 400); }
}

module.exports = { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError };