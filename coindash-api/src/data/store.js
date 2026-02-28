'use strict';

// In-memory data store — sin base de datos para simplificar el laboratorio
const products = [
  {
    id: 'prod-001',
    name: 'CoinDash Premium Wallet',
    description: 'Billetera digital segura con soporte multi-moneda',
    price: 50,
    currency: 'COIN',
    stock: 100,
    category: 'wallets',
  },
  {
    id: 'prod-002',
    name: 'Pack Micropagos Starter',
    description: 'Paquete inicial de 1000 monedas digitales',
    price: 10,
    currency: 'USD',
    stock: 500,
    category: 'packs',
  },
  {
    id: 'prod-003',
    name: 'API Access Pro',
    description: 'Acceso a la API de CoinDash con 10,000 llamadas/mes',
    price: 25,
    currency: 'USD',
    stock: 200,
    category: 'services',
  },
];

const users = [
  {
    id: 'user-001',
    name: 'Ana García',
    email: 'ana@example.com',
    balance: 500,
    currency: 'COIN',
  },
  {
    id: 'user-002',
    name: 'Carlos López',
    email: 'carlos@example.com',
    balance: 250,
    currency: 'COIN',
  },
];

const orders = [];

module.exports = { products, users, orders };
