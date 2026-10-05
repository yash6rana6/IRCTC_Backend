const winston = require('winston');
const config = require('./index').config;
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: config.Service_Name },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message,service}) => {
            return `${timestamp} ${level} [${service}]:  ${message}`;
        })
    ),
    transports: [new winston.transports.Console()],
})

module.exports = logger;