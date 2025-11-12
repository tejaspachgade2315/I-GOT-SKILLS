const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../src/utils/redisClient', () => {
  const fakeClient = {
    get: async () => null,
    set: async () => 'OK',
    connect: async () => { },
    isOpen: false
  };
  return { client: fakeClient, connectRedis: async () => { } };
});

let mongod;
let app;
let serverApp;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, {});
  serverApp = express();
  serverApp.use(bodyParser.json());
  const authRoutes = require('../src/routes/auth');
  serverApp.use('/api/auth', authRoutes);

  app = serverApp;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
});

describe('Auth API', () => {
  let createdApiKey;
  let createdAppId;
  test('POST /api/auth/register - creates app and returns apiKey', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Website',
      ownerEmail: 'owner@test.com',
      expiresInDays: 30
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('apiKey');
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Website');

    createdApiKey = res.body.apiKey;
    createdAppId = res.body.id;
  });

  test('GET /api/auth/api-key - retrieve api key by appId', async () => {
    const res = await request(app).get('/api/auth/api-key').query({ appId: createdAppId });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('apiKey', createdApiKey);
  });

  test('POST /api/auth/revoke - revoke api key', async () => {
    const res = await request(app).post('/api/auth/revoke').send({ apiKey: createdApiKey });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'API key revoked');

    const res2 = await request(app).get('/api/auth/api-key').query({ appId: createdAppId });
    expect(res2.statusCode).toBe(200);
    expect(res2.body).toHaveProperty('revoked', true);
  });

  test('POST /api/auth/regenerate - regenerate api key', async () => {
    const res = await request(app).post('/api/auth/regenerate').send({ apiKey: createdApiKey });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('apiKey');
    expect(res.body.apiKey).not.toBe(createdApiKey);

    const res2 = await request(app).get('/api/auth/api-key').query({ ownerEmail: 'owner@test.com' });
    expect(res2.statusCode).toBe(200);
    expect(res2.body).toHaveProperty('apiKey', res.body.apiKey);
    expect(res2.body).toHaveProperty('revoked', false);
  });
});
