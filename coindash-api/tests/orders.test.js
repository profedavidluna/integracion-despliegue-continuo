'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Orders API', () => {
  describe('GET /api/orders', () => {
    it('debe retornar la lista de órdenes', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/orders', () => {
    it('debe crear una orden válida', async () => {
      const res = await request(app).post('/api/orders').send({
        userId: 'user-001',
        productId: 'prod-002',
        quantity: 2,
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.total).toBe(20); // 10 USD * 2
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app).post('/api/orders').send({ userId: 'user-001' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe retornar 404 si el usuario no existe', async () => {
      const res = await request(app).post('/api/orders').send({
        userId: 'user-no-existe',
        productId: 'prod-001',
        quantity: 1,
      });
      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 404 si el producto no existe', async () => {
      const res = await request(app).post('/api/orders').send({
        userId: 'user-001',
        productId: 'prod-no-existe',
        quantity: 1,
      });
      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 400 si la cantidad es 0 o negativa', async () => {
      const res = await request(app).post('/api/orders').send({
        userId: 'user-001',
        productId: 'prod-001',
        quantity: 0,
      });
      expect(res.statusCode).toBe(400);
    });

    it('debe retornar 400 si el stock es insuficiente', async () => {
      const res = await request(app).post('/api/orders').send({
        userId: 'user-001',
        productId: 'prod-001',
        quantity: 99999,
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/stock insuficiente/i);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('debe retornar 404 para una orden inexistente', async () => {
      const res = await request(app).get('/api/orders/order-no-existe');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
