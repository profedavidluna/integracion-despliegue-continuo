'use strict';

const express = require('express');
const router = express.Router();
const { orders, products, users } = require('../data/store');

// GET /api/orders — listar órdenes
router.get('/', (req, res) => {
  res.json({ success: true, data: orders, total: orders.length });
});

// GET /api/orders/:id — obtener una orden por ID
router.get('/:id', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Orden no encontrada' });
  }
  res.json({ success: true, data: order });
});

// POST /api/orders — crear una nueva orden
router.post('/', (req, res) => {
  const { userId, productId, quantity } = req.body;

  if (!userId || !productId || !quantity) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: userId, productId, quantity',
    });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  const qty = Number(quantity);
  if (qty <= 0) {
    return res.status(400).json({ success: false, message: 'La cantidad debe ser mayor a 0' });
  }

  if (product.stock < qty) {
    return res.status(400).json({ success: false, message: 'Stock insuficiente' });
  }

  const total = product.price * qty;

  const newOrder = {
    id: `order-${Date.now()}`,
    userId,
    productId,
    productName: product.name,
    quantity: qty,
    unitPrice: product.price,
    total,
    currency: product.currency,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  product.stock -= qty;
  orders.push(newOrder);

  res.status(201).json({ success: true, data: newOrder });
});

module.exports = router;
