# 🪙 CoinDash API

API REST para el manejo de micropagos con monedas digitales. Construida con Node.js + Express.

Usada como **código fuente de práctica** en el Laboratorio Clase 2: *Misión CoinDash* del **Módulo 2** del curso de Integración y Despliegue Continuo.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      CoinDash API                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ /products│  │ /orders  │  │  /users  │  │/payments │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            In-Memory Data Store (src/data/)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido

### Con Node.js

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Iniciar en modo producción
npm start
```

### Con Docker

```bash
# Construir y ejecutar
docker compose up --build

# Solo ejecutar (imagen ya construida)
docker compose up
```

La API estará disponible en `http://localhost:3000`.

---

## 📋 Endpoints

### Health Check

| Método | Endpoint  | Descripción        |
|--------|-----------|--------------------|
| GET    | /health   | Estado de la API   |

### Productos

| Método | Endpoint              | Descripción                    |
|--------|-----------------------|--------------------------------|
| GET    | /api/products         | Listar todos los productos     |
| GET    | /api/products?category=wallets | Filtrar por categoría |
| GET    | /api/products/:id     | Obtener producto por ID        |
| POST   | /api/products         | Crear nuevo producto           |

**POST /api/products — Body:**
```json
{
  "name": "Mi Producto",
  "description": "Descripción opcional",
  "price": 25,
  "currency": "COIN",
  "stock": 100,
  "category": "services"
}
```

### Usuarios

| Método | Endpoint        | Descripción              |
|--------|-----------------|--------------------------|
| GET    | /api/users/:id  | Obtener usuario por ID   |
| POST   | /api/users      | Registrar nuevo usuario  |

**POST /api/users — Body:**
```json
{
  "name": "María López",
  "email": "maria@example.com"
}
```

### Órdenes

| Método | Endpoint         | Descripción              |
|--------|------------------|--------------------------|
| GET    | /api/orders      | Listar todas las órdenes |
| GET    | /api/orders/:id  | Obtener orden por ID     |
| POST   | /api/orders      | Crear nueva orden        |

**POST /api/orders — Body:**
```json
{
  "userId": "user-001",
  "productId": "prod-002",
  "quantity": 2
}
```

### Pagos (Micropagos)

| Método | Endpoint                       | Descripción             |
|--------|--------------------------------|-------------------------|
| GET    | /api/payments/balance/:userId  | Consultar saldo         |
| POST   | /api/payments/send             | Enviar monedas a usuario|

**POST /api/payments/send — Body:**
```json
{
  "fromUserId": "user-001",
  "toUserId": "user-002",
  "amount": 50
}
```

---

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas con cobertura
npm test

# Modo watch (útil durante desarrollo)
npm run test:watch
```

Cobertura actual: **~95%** de líneas.

---

## 🔒 Seguridad

- **Helmet.js** — cabeceras HTTP seguras
- **CORS** — control de origen
- **Rate Limiting** — máximo 100 peticiones por 15 minutos
- **Usuario no-root** en Docker
- **Secretos via GitHub Secrets** — nunca en el código

---

## 🏗️ Estructura del Proyecto

```
coindash-api/
├── src/
│   ├── app.js              # Configuración de Express y middleware
│   ├── data/
│   │   └── store.js        # Datos en memoria (simula base de datos)
│   └── routes/
│       ├── products.js     # Endpoints de productos
│       ├── orders.js       # Endpoints de órdenes
│       ├── users.js        # Endpoints de usuarios
│       └── payments.js     # Endpoints de pagos/micropagos
├── tests/
│   ├── health.test.js
│   ├── products.test.js
│   ├── orders.test.js
│   ├── users.test.js
│   └── payments.test.js
├── Dockerfile              # Multi-stage build
├── docker-compose.yml
├── Jenkinsfile             # Pipeline Nivel 3 (Jenkins)
├── .env.example
└── package.json
```

---

## 🎓 Laboratorio: Misión CoinDash

Este código fuente se usa en los tres niveles del laboratorio:

### 🟢 Nivel 1 — Pipeline Básico
Archivo: `.github/workflows/nivel-1.yml`
- **Build**: `npm ci`
- **Test**: `npm test`
- **Deploy**: Simulación con logs

### 🟡 Nivel 2 — DevSecOps
Archivo: `.github/workflows/nivel-2.yml`
- **SCA**: `npm audit` + Dependabot
- **SAST**: CodeQL
- **Contenedor**: Trivy
- **Secretos**: GitHub Secrets

### 🟠 Nivel 3 — Debate Jenkins vs GitHub Actions
Archivo: `Jenkinsfile`
- Pipeline declarativo en Jenkins
- Ejecución en contenedor Docker
- Comparación directa con GitHub Actions

---

## Variables de Entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

| Variable        | Descripción                | Requerida |
|-----------------|----------------------------|-----------|
| PORT            | Puerto del servidor (3000) | No        |
| NODE_ENV        | Entorno de ejecución       | No        |
| API_SECRET_KEY  | Llave secreta de la API    | Solo prod |
