const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../src/utils/redisClient', () => {
  const fakeClient = {
    get: async (k) => null,
    set: async (k, v, opts) => 'OK',
    connect: async () => { },
    isOpen: false
  };
  return { client: fakeClient, connectRedis: async () => { } };
});

let mongod;
let serverApp;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, {});
  serverApp = express();
  serverApp.use(bodyParser.json());
  const authRoutes = require('../src/routes/auth');
  const analyticsRoutes = require('../src/routes/analytics');

  serverApp.use('/api/auth', authRoutes);
  serverApp.use('/api/analytics', analyticsRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
});

describe('Analytics endpoints', () => {
  let apiKey;
  let appId;
  const testUserId = 'user-xyz';

  test('setup - register an app to get api key', async () => {
    const res = await request(serverApp).post('/api/auth/register').send({
      name: 'Analytics Test App',
      ownerEmail: 'a@test.com'
    });
    expect(res.statusCode).toBe(201);
    apiKey = res.body.apiKey;
    appId = res.body.id;
    expect(apiKey).toBeDefined();
  });

  test('POST /api/analytics/collect - record some events', async () => {
    const events = [
      {
        event: 'login_form_cta_click',
        url: 'https://example.com/login',
        referrer: 'https://google.com',
        device: 'mobile',
        ipAddress: '1.2.3.4',
        timestamp: new Date().toISOString(),
        metadata: { browser: 'Chrome', os: 'Android' },
        userId: testUserId
      },
      {
        event: 'login_form_cta_click',
        url: 'https://example.com/login',
        referrer: 'https://google.com',
        device: 'desktop',
        ipAddress: '1.2.3.5',
        timestamp: new Date().toISOString(),
        metadata: { browser: 'Firefox', os: 'Windows' },
        userId: 'user-other'
      },
      {
        event: 'signup_completed',
        url: 'https://example.com/signup',
        referrer: 'https://example.com',
        device: 'mobile',
        ipAddress: '1.2.3.4',
        timestamp: new Date().toISOString(),
        metadata: { browser: 'Chrome', os: 'Android' },
        userId: testUserId
      }
    ];

    for (const ev of events) {
      const r = await request(serverApp)
        .post('/api/analytics/collect')
        .set('x-api-key', apiKey)
        .send(ev);
      expect(r.statusCode).toBe(201);
      expect(r.body).toHaveProperty('message', 'event recorded');
    }
  });

  test('GET /api/analytics/event-summary - aggregated summary for event', async () => {
    const res = await request(serverApp)
      .get('/api/analytics/event-summary')
      .query({ event: 'login_form_cta_click' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('event');
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('uniqueUsers');
    expect(res.body.deviceData || res.body.deviceCounts || res.body.deviceData).toBeDefined();
  });

  test('GET /api/analytics/user-stats - stats for a user', async () => {
    const res = await request(serverApp)
      .get('/api/analytics/user-stats')
      .query({ userId: testUserId });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('userId', testUserId);
    expect(res.body).toHaveProperty('totalEvents');
    expect(res.body.totalEvents).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('recentEvents');
    expect(Array.isArray(res.body.recentEvents)).toBe(true);
  });
});
