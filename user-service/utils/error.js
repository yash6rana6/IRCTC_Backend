class AppError extends Error {
    constructor(code, message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    } 

}

class BadRequestError extends AppError {
    constructor(message,code = 'BAD_REQUEST') {
        super(code, message, 400);
    }   
}

class UnauthorizedError extends AppError {
    constructor(message, code = 'UNAUTHORIZED') {
        super(code, message, 401);
    }   
}

class ForbiddenError extends AppError {
    constructor(message, code = 'FORBIDDEN') {
        super(code, message, 403);
    }   
}

class NotFoundError extends AppError {
    constructor(message, code = 'NOT_FOUND') {
        super(code, message, 404);
    }   
}

class ConflictError extends AppError {
    constructor(message,code = "CONFLICT") {
        super(code, message, 409);
    }
}


exports.AppError = AppError;
exports.BadRequestError = BadRequestError;
exports.UnauthorizedError = UnauthorizedError;
exports.ForbiddenError = ForbiddenError;
exports.NotFoundError = NotFoundError;
exports.ConflictError = ConflictError;  