'use strict';

const express = require('express');
const router = express.Router();
const { products } = require('../data/store');

// GET /api/products — listar todos los productos
router.get('/', (req, res) => {
  const { category } = req.query;
  if (category) {
    const filtered = products.filter((p) => p.category === category);
    return res.json({ success: true, data: filtered, total: filtered.length });
  }
  res.json({ success: true, data: products, total: products.length });
});

// GET /api/products/:id — obtener un producto por ID
router.get('/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }
  res.json({ success: true, data: product });
});

// POST /api/products — crear un nuevo producto
router.post('/', (req, res) => {
  const { name, description, price, currency, stock, category } = req.body;

  if (!name || price === undefined || !currency) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: name, price, currency',
    });
  }

  const newProduct = {
    id: `prod-${Date.now()}`,
    name,
    description: description || '',
    price: Number(price),
    currency,
    stock: stock !== undefined ? Number(stock) : 0,
    category: category || 'general',
  };

  products.push(newProduct);
  res.status(201).json({ success: true, data: newProduct });
});

module.exports = router;
