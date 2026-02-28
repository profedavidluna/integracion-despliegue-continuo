'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Products API', () => {
  describe('GET /api/products', () => {
    it('debe retornar la lista de productos', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('debe filtrar por categoría', async () => {
      const res = await request(app).get('/api/products?category=wallets');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.every((p) => p.category === 'wallets')).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    it('debe retornar un producto existente', async () => {
      const res = await request(app).get('/api/products/prod-001');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('prod-001');
    });

    it('debe retornar 404 para un producto inexistente', async () => {
      const res = await request(app).get('/api/products/no-existe');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/products', () => {
    it('debe crear un producto válido', async () => {
      const newProduct = {
        name: 'Test Product',
        description: 'Un producto de prueba',
        price: 99,
        currency: 'COIN',
        stock: 10,
        category: 'test',
      };
      const res = await request(app).post('/api/products').send(newProduct);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newProduct.name);
      expect(res.body.data.id).toBeDefined();
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app).post('/api/products').send({ name: 'Solo nombre' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
