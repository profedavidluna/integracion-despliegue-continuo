'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Payments API', () => {
  describe('GET /api/payments/balance/:userId', () => {
    it('debe retornar el saldo de un usuario existente', async () => {
      const res = await request(app).get('/api/payments/balance/user-001');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('user-001');
      expect(typeof res.body.data.balance).toBe('number');
      expect(res.body.data.currency).toBe('COIN');
    });

    it('debe retornar 404 para un usuario inexistente', async () => {
      const res = await request(app).get('/api/payments/balance/no-existe');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/payments/send', () => {
    it('debe transferir monedas entre usuarios', async () => {
      // Obtener saldos iniciales
      const senderBefore = await request(app).get('/api/payments/balance/user-001');
      const receiverBefore = await request(app).get('/api/payments/balance/user-002');

      const amount = 50;
      const res = await request(app).post('/api/payments/send').send({
        fromUserId: 'user-001',
        toUserId: 'user-002',
        amount,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(amount);
      expect(res.body.data.status).toBe('completed');

      // Verificar saldos actualizados
      const senderAfter = await request(app).get('/api/payments/balance/user-001');
      const receiverAfter = await request(app).get('/api/payments/balance/user-002');

      expect(senderAfter.body.data.balance).toBe(senderBefore.body.data.balance - amount);
      expect(receiverAfter.body.data.balance).toBe(receiverBefore.body.data.balance + amount);
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app).post('/api/payments/send').send({ fromUserId: 'user-001' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe retornar 400 si el monto es negativo', async () => {
      const res = await request(app).post('/api/payments/send').send({
        fromUserId: 'user-001',
        toUserId: 'user-002',
        amount: -10,
      });
      expect(res.statusCode).toBe(400);
    });

    it('debe retornar 400 si se intenta enviar a uno mismo', async () => {
      const res = await request(app).post('/api/payments/send').send({
        fromUserId: 'user-001',
        toUserId: 'user-001',
        amount: 10,
      });
      expect(res.statusCode).toBe(400);
    });

    it('debe retornar 400 si el saldo es insuficiente', async () => {
      const res = await request(app).post('/api/payments/send').send({
        fromUserId: 'user-002',
        toUserId: 'user-001',
        amount: 999999,
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/saldo insuficiente/i);
    });

    it('debe retornar 404 si el remitente no existe', async () => {
      const res = await request(app).post('/api/payments/send').send({
        fromUserId: 'no-existe',
        toUserId: 'user-001',
        amount: 10,
      });
      expect(res.statusCode).toBe(404);
    });

    it('debe retornar 404 si el destinatario no existe', async () => {
      const res = await request(app).post('/api/payments/send').send({
        fromUserId: 'user-001',
        toUserId: 'no-existe',
        amount: 10,
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
