const { createClient } = require('redis')

let redisClient = null

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    })

    redisClient.on('error', (err) => {
      console.error('Redis Error:', err.message)
    })

    await redisClient.connect()

    console.log('✅ Redis Connected')
  } catch (error) {
    console.error('Redis connection failed:', error.message)
  }
}

const getRedis = () => redisClient

module.exports = {
  connectRedis,
  getRedis,
}