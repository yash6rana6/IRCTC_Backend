const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config();
const config = require('./config/index').config;
const logger = require('./config/logger');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();
app.use(helmet());
app.use(cookieParser());


app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the User Service API' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(errorMiddleware);

const startService = async () => {
  try {
    const server = app.listen(config.PORT, () => {
     logger.info(`${config.Service_Name} is running on port ${config.PORT}`);
    });
  }catch (error) {
    logger.error(`Error starting the service: ${error.message}`);
    process.exit(1);
  }
};

startService();

