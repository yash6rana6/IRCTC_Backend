
const { AppError } = require('../utils/error');

module.exports = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: false,
            error: err.code,
            message: err.message
        });
    }

    // Unknown / unexpected error
    console.error('Unhandled error:', err);

    return res.status(500).json({
        status: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong'
    });
};

