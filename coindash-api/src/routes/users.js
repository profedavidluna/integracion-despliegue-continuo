'use strict';

const express = require('express');
const router = express.Router();
const { users } = require('../data/store');

// GET /api/users/:id — obtener un usuario por ID
router.get('/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  // No exponemos datos sensibles (omitimos el email de la respuesta pública)
  const publicData = { id: user.id, name: user.name, balance: user.balance, currency: user.currency };
  res.json({ success: true, data: publicData });
});

// POST /api/users — registrar un nuevo usuario
router.post('/', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: name, email',
    });
  }

  // Verificar que el email no exista ya
  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'El email ya está registrado' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    balance: 100, // saldo inicial de bienvenida
    currency: 'COIN',
  };

  users.push(newUser);

  const publicUser = { id: newUser.id, name: newUser.name, balance: newUser.balance, currency: newUser.currency };
  res.status(201).json({ success: true, data: publicUser });
});

module.exports = router;
