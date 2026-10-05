const cors = require('cors');
const config = require('../config/config');

const corsMiddleware = cors({
 origin:config.ALLOWED_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true
}

);

module.exports = corsMiddleware;
