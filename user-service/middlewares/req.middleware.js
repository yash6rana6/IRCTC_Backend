const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`);
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  })

  next();
};

module.exports = requestLogger;