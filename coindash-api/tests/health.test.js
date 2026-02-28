'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('debe responder con status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('coindash-api');
  });
});

describe('GET /ruta-inexistente', () => {
  it('debe responder con 404', async () => {
    const res = await request(app).get('/ruta-inexistente');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
