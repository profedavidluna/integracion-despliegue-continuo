'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Users API', () => {
  describe('GET /api/users/:id', () => {
    it('debe retornar un usuario existente sin exponer el email', async () => {
      const res = await request(app).get('/api/users/user-001');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('user-001');
      // El email no debe estar expuesto en la respuesta pública
      expect(res.body.data.email).toBeUndefined();
    });

    it('debe retornar 404 para un usuario inexistente', async () => {
      const res = await request(app).get('/api/users/no-existe');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users', () => {
    it('debe registrar un nuevo usuario', async () => {
      const res = await request(app).post('/api/users').send({
        name: 'Test User',
        email: 'test@coindash.io',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test User');
      expect(res.body.data.balance).toBe(100); // saldo inicial de bienvenida
      expect(res.body.data.email).toBeUndefined(); // no exponer email
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app).post('/api/users').send({ name: 'Solo nombre' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe retornar 409 si el email ya está registrado', async () => {
      // Registrar el usuario
      await request(app).post('/api/users').send({
        name: 'Usuario Duplicado',
        email: 'duplicado@coindash.io',
      });
      // Intentar registrarlo de nuevo
      const res = await request(app).post('/api/users').send({
        name: 'Otro Usuario',
        email: 'duplicado@coindash.io',
      });
      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/ya está registrado/i);
    });
  });
});
