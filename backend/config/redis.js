const Redis = require('ioredis')

let redis = null

const connectRedis = async () => {
  if (process.env.REDIS_DISABLED === 'true') {
    console.log('Redis disabled')
    return null
  }

  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')

    redis.on('connect', () => {
      console.log('Redis connected')
    })

    redis.on('error', (err) => {
      console.log('Redis error:', err.message)
    })

    return redis
  } catch (error) {
    console.log('Redis connection failed:', error.message)
    return null
  }
}

const getRedis = () => redis

module.exports = {
  redis,
  connectRedis,
  getRedis,
}