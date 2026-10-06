
const Redis = require('ioredis');
const logger = require('./logger');
const config  = require('./index');

class RedisClient {
    static instance = null;
    static isConnected = false;

    constructor() {
        console.log(config);
        if (RedisClient.instance) {
            return RedisClient.instance;
        }

        throw new Error(
            'RedisClient cannot be instantiated directly. Use RedisClient.getInstance() instead.'
        );
    }

    static getInstance() {
        if (!RedisClient.instance) {

            console.log("The redis url",config.REDIS_URL)
            RedisClient.instance = new Redis(config.REDIS_URL, {
                retryStrategy(times) {
                    const delay = Math.min(times * 50, 2000);

                    logger.info(`Redis reconnect attempt ${times} in ${delay}ms`);

                    return delay;
                },

                maxRetriesPerRequest: 3,
                
                enableReadyCheck: true,
            });

            RedisClient.setupEventHandlers();
        }

        return RedisClient.instance;
    }

    static setupEventHandlers() {
        const redis = RedisClient.instance;

        redis.on('connect', () => {
            logger.info('Redis socket connected');
        });

        redis.on('ready', () => {
            RedisClient.isConnected = true;
            logger.info('Redis ready');
        });

        redis.on('reconnecting', (delay) => {
            RedisClient.isConnected = false;
            logger.info(`Redis reconnecting... (${delay}ms)`);
        });

        redis.on('close', () => {
            RedisClient.isConnected = false;
            logger.info('Redis connection closed');
        });

        redis.on('end', () => {
            RedisClient.isConnected = false;
            logger.info('Redis connection ended');
        });

        redis.on('error', (err) => {
            RedisClient.isConnected = false;
            logger.error(`Redis error: ${err.message}`);
        });
    }

    static async disconnect() {
        if (RedisClient.instance) {
            await RedisClient.instance.quit();

            RedisClient.instance = null;
            RedisClient.isConnected = false;

            logger.info('Redis disconnected');
        }
    }

    static getStatus() {
        return {
            connected: RedisClient.isConnected,
            status: RedisClient.instance?.status || 'not_initialized',
        };
    }
}

module.exports = RedisClient;
