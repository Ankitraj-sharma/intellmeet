const Redis = require('ioredis');

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL);

    redisClient.on('connect', () => {
      console.log('✅ Redis Connected');
    });

    redisClient.on('error', (err) => {
      console.error('Redis Error:', err.message);
    });

  } catch (error) {
    console.error('Redis connection failed:', error.message);
  }
};

const getRedis = () => redisClient;

module.exports = {
  connectRedis,
  getRedis,
};