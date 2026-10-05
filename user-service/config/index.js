require('dotenv').config();

const config = {
    Service_Name : require('../package.json').name,
    PORT : Number(process.env.PORT) || 4001,
    NODE_ENV : process.env.NODE_ENV  || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    REDISH_URL : process.env.REDISH_URL || "redis://localhost:6379",
    ALLOWED_ORIGINS : process.env.ALLOWED_ORIGINS || "http://localhost:3000",

    OTP_TTL: process.env.OTP_TTL || 300,
    OTP_RATE_MAX : process.env.OTP_RATE_MAX || 5,
    OTP_HMAC_SECRET : process.env.OTP_HMAC_SECRET || "default_hmac_secret",

}

module.exports = {config};

