const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');

const TEST_DB = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/intellmeet_test';

let token;
let teamId;
let inviteCode;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB);
  }
  const email = `team_test_${Date.now()}@test.com`;
  await request(app).post('/api/v1/auth/register').send({ name: 'Team Tester', email, password: 'Test1234!' });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Test1234!' });
  token = res.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Teams API', () => {
  it('should create a team', async () => {
    const res = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Engineering', description: 'Dev team' })
      .expect(201);

    expect(res.body.data.team.name).toBe('Engineering');
    teamId = res.body.data.team._id;
    inviteCode = res.body.data.team.inviteCode;
  });

  it('should list user teams', async () => {
    const res = await request(app)
      .get('/api/v1/teams')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.teams.length).toBeGreaterThan(0);
  });

  it('should get team by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.team._id).toBe(teamId);
  });

  it('should reject invalid invite code', async () => {
    await request(app)
      .post('/api/v1/teams/join/INVALID123')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
