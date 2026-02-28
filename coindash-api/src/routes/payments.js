'use strict';

const express = require('express');
const router = express.Router();
const { users } = require('../data/store');

// POST /api/payments/send — enviar micropago entre usuarios
router.post('/send', (req, res) => {
  const { fromUserId, toUserId, amount } = req.body;

  if (!fromUserId || !toUserId || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: fromUserId, toUserId, amount',
    });
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El monto debe ser un número positivo',
    });
  }

  if (fromUserId === toUserId) {
    return res.status(400).json({
      success: false,
      message: 'No puedes enviarte monedas a ti mismo',
    });
  }

  const sender = users.find((u) => u.id === fromUserId);
  if (!sender) {
    return res.status(404).json({ success: false, message: 'Usuario remitente no encontrado' });
  }

  const receiver = users.find((u) => u.id === toUserId);
  if (!receiver) {
    return res.status(404).json({ success: false, message: 'Usuario destinatario no encontrado' });
  }

  if (sender.balance < amountNum) {
    return res.status(400).json({ success: false, message: 'Saldo insuficiente' });
  }

  sender.balance -= amountNum;
  receiver.balance += amountNum;

  const transaction = {
    id: `tx-${Date.now()}`,
    fromUserId,
    toUserId,
    amount: amountNum,
    currency: 'COIN',
    status: 'completed',
    timestamp: new Date().toISOString(),
  };

  res.status(201).json({ success: true, data: transaction });
});

// GET /api/payments/balance/:userId — consultar saldo de un usuario
router.get('/balance/:userId', (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  res.json({
    success: true,
    data: {
      userId: user.id,
      balance: user.balance,
      currency: user.currency,
    },
  });
});

module.exports = router;
