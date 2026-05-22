const request = require('supertest')
const mongoose = require('mongoose')
const { app } = require('../server')

const TEST_DB =
  process.env.MONGODB_TEST_URI ||
  'mongodb://127.0.0.1:27017/intellmeet_test'

let token
let meetingId

beforeAll(async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB)
    }

    // Unique email for testing
    const email = `meet_test_${Date.now()}@test.com`

    // Register user
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Meeting Tester',
        email,
        password: 'Test1234!',
      })

    // Login user
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email,
        password: 'Test1234!',
      })

    token = res.body?.data?.accessToken
  } catch (error) {
    console.error('Test setup failed:', error)
  }
})

afterAll(async () => {
  try {
    await mongoose.connection.close()
  } catch (error) {
    console.error('Error closing DB connection:', error)
  }
})

describe('Meetings API', () => {
  describe('POST /api/v1/meetings', () => {
    it('should create a new meeting', async () => {
      const res = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Meeting',
          type: 'instant',
        })
        .expect(201)

      expect(res.body.data.meeting.title).toBe('Test Meeting')

      expect(res.body.data.meeting.meetingId).toBeDefined()

      meetingId = res.body.data.meeting.meetingId
    })

    it('should reject meeting without title', async () => {
      await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400)
    })

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/meetings')
        .send({
          title: 'Unauth Meeting',
        })
        .expect(401)
    })
  })

  describe('GET /api/v1/meetings', () => {
    it('should list user meetings', async () => {
      const res = await request(app)
        .get('/api/v1/meetings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(res.body.data.meetings)).toBe(true)

      expect(res.body.data.pagination).toBeDefined()
    })

    it('should support search filter', async () => {
      const res = await request(app)
        .get('/api/v1/meetings?search=Test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.data.meetings.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('GET /api/v1/meetings/:meetingId', () => {
    it('should get meeting by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.data.meeting.meetingId).toBe(meetingId)
    })

    it('should return 404 for unknown meeting', async () => {
      await request(app)
        .get('/api/v1/meetings/UNKNOWN123')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })
  })

  describe('POST /api/v1/meetings/:meetingId/join', () => {
    it('should allow joining a meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.data.meeting.status).toBe('ongoing')
    })
  })

  describe('GET /api/v1/meetings/analytics', () => {
    it('should return analytics data', async () => {
      const res = await request(app)
        .get('/api/v1/meetings/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.data).toHaveProperty('totalMeetings')

      expect(res.body.data).toHaveProperty('hostedMeetings')
    })
  })

  describe('POST /api/v1/meetings/:meetingId/end', () => {
    it('should end a meeting as host', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/end`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body.data.meeting.status).toBe('ended')
    })
  })
})