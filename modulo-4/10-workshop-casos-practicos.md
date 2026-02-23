# Tema 5: Workshop y Casos Prácticos

> **Objetivo:** Integrar todos los conocimientos del curso en un ejercicio práctico de extremo a extremo ("end-to-end"), incorporar herramientas de calidad y seguridad de grado empresarial, y desarrollar la capacidad de diagnosticar y resolver los problemas más comunes en pipelines reales. Este tema es el cierre del ciclo de aprendizaje: de la teoría a la práctica operativa.

---

## Por Qué un Workshop Integrado

Los módulos anteriores construyeron el conocimiento de forma progresiva. Este workshop cierra el ciclo aplicando todos esos conocimientos de forma simultánea, tal como ocurre en un entorno empresarial real:

- No hay una tecnología en aislamiento — **todo trabaja junto**.
- Las restricciones son reales: tamaño de imagen, seguridad, cobertura mínima, rollback automático.
- El objetivo no es que funcione — es que funcione **de forma reproducible, segura y observable**.

---

## 5.1 Workshop: Desarrollo de un Proyecto Integrado CI/CD Completo

### Descripción del Proyecto

Construirás un pipeline funcional de extremo a extremo para una aplicación compuesta por dos servicios:

- **Backend:** Un microservicio REST (Node.js, Python, Java o el stack de tu elección) con al menos dos endpoints y cobertura de pruebas unitarias.
- **Frontend:** Una aplicación web estática o SPA que consume el backend.
- **Base de datos:** PostgreSQL o MySQL gestionada como servicio en contenedor.

> **Restricción empresarial:** Simularás que este proyecto va a revisión de arquitectura. Los requisitos mínimos son: imagen < 100 MB, usuario no-root, cobertura de pruebas ≥ 80%, pipeline en verde antes del merge, y despliegue con rollback automático.

---

### Fase 1: Contenedorización Base

**Objetivo:** Empaquetar cada servicio en una imagen Docker optimizada y orquestar el entorno local con Docker Compose.

#### Tarea 1.1 — Dockerfiles con Multi-Stage Build

El Multi-Stage Build es la técnica estándar para producir imágenes pequeñas y seguras. Permite usar una imagen "pesada" para compilar y una imagen mínima para ejecutar.

**Ejemplo: Backend Node.js con Multi-Stage Build**

```dockerfile
# ─── Etapa 1: Construcción ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar solo el manifiesto de dependencias (optimiza el caché de capas)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copiar el código fuente
COPY src/ ./src/

# ─── Etapa 2: Imagen de Producción ───────────────────────────────────────────
FROM node:20-alpine AS production

# Crear un usuario no-root por seguridad (requisito empresarial)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar solo los artefactos necesarios desde la etapa de construcción
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package.json ./

# Cambiar al usuario no-root antes de ejecutar la aplicación
USER appuser

EXPOSE 3000
CMD ["node", "src/server.js"]
```

> **¿Por qué importa el usuario no-root?** Si un atacante explota una vulnerabilidad en la aplicación, obtiene acceso con los privilegios del proceso. Ejecutar como `root` dentro del contenedor puede facilitar el escape del contenedor hacia el host. Usar un usuario sin privilegios limita el radio de impacto.

**Criterio de éxito:**

```bash
# Verificar el tamaño de la imagen resultante
docker build -t mi-backend:dev .
docker images mi-backend:dev

# Verificar que el contenedor no corre como root
docker run --rm mi-backend:dev whoami
# Resultado esperado: appuser
```

#### Tarea 1.2 — Orquestación Local con Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge

services:
  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # Inyectado desde .env, nunca hardcodeado
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  backend:
    build:
      context: ./backend
      target: production
    environment:
      DATABASE_URL: postgresql://appuser:${DB_PASSWORD}@database:5432/appdb
      NODE_ENV: production
    networks:
      - backend-net
      - frontend-net
    depends_on:
      database:
        condition: service_healthy  # Espera hasta que la BD esté lista
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  frontend:
    build:
      context: ./frontend
      target: production
    ports:
      - "80:80"
    networks:
      - frontend-net
    depends_on:
      backend:
        condition: service_healthy

volumes:
  db-data:
```

> **Nota sobre redes separadas:** El servicio `database` solo está en `backend-net`, por lo que el `frontend` no puede alcanzarlo directamente. Esto implementa el **principio de mínimo privilegio** en la red.

**Criterio de éxito:**

```bash
# Levantar el entorno completo
docker compose up --build -d

# Verificar que todos los servicios están healthy
docker compose ps

# Verificar que el frontend responde
curl http://localhost

# Limpiar el entorno
docker compose down -v
```

---

### Fase 2: Construcción del Pipeline de Integración Continua (CI)

**Objetivo:** Automatizar la validación del código en cada pull request, asegurando que solo el código que cumple los estándares de calidad pueda integrarse a la rama principal.

#### Tarea 2.1 — Configurar Protección de Rama

En GitHub, configura las siguientes reglas para la rama `main`:

- **Require a pull request before merging** — prohíbe los commits directos.
- **Require status checks to pass** — selecciona tu workflow de CI.
- **Require branches to be up to date** — el PR debe estar actualizado con `main` antes del merge.

> **Impacto:** Estas reglas convierten el pipeline de CI en una puerta de entrada al código base. Si el pipeline falla, el merge está bloqueado — sin excepciones, sin "lo arreglamos después".

#### Tarea 2.2 — Pipeline de CI con GitHub Actions

```yaml
# .github/workflows/ci.yml
name: Pipeline de Integración Continua

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ─── Job 1: Pruebas y Calidad ────────────────────────────────────────────────
  test:
    name: Pruebas y Cobertura
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Configurar Node.js con caché
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Instalar dependencias
        working-directory: backend
        run: npm ci

      - name: Ejecutar pruebas con cobertura
        working-directory: backend
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
        run: npm test -- --coverage --coverageReporters=lcov

      - name: Verificar cobertura mínima del 80%
        working-directory: backend
        run: |
          COVERAGE=$(node -e "const r=require('./coverage/coverage-summary.json'); console.log(r.total.lines.pct)")
          echo "Cobertura de líneas: ${COVERAGE}%"
          node -e "const r=require('./coverage/coverage-summary.json'); if(r.total.lines.pct < 80) { console.error('ERROR: Cobertura ${r.total.lines.pct}% < 80% requerido'); process.exit(1); }"

  # ─── Job 2: Construcción y Publicación de Imagen Docker ─────────────────────
  build-and-push:
    name: Construir y Publicar Imagen
    runs-on: ubuntu-latest
    needs: test  # Solo se ejecuta si las pruebas pasaron
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Autenticar en el registro de contenedores
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extraer metadatos para la imagen
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,suffix=,format=short
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Construir y publicar imagen Docker
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          target: production
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

> **Principio "Construir Una Vez":** La imagen que se construye en CI es la misma que viaja a staging y producción. No se reconstruye en cada entorno — se reutiliza la imagen con el SHA del commit como etiqueta inmutable.

---

### Fase 3: Implementación del Despliegue Continuo (CD)

**Objetivo:** Automatizar la entrega de la imagen validada a los entornos objetivo, con estrategia segura para producción y rollback automático.

#### Tarea 3.1 — Despliegue Automático a Staging

```yaml
# .github/workflows/cd-staging.yml
name: CD — Despliegue a Staging

on:
  push:
    branches: [main]  # Se activa solo cuando hay merge a main

jobs:
  deploy-staging:
    name: Desplegar a Staging
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.miapp.com

    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Desplegar a Staging vía SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            # Actualizar la imagen con el SHA del commit actual
            export IMAGE_TAG=${{ github.sha }}
            docker compose -f /opt/app/docker-compose.staging.yml pull
            docker compose -f /opt/app/docker-compose.staging.yml up -d
            # Verificar que el servicio respondió correctamente
            sleep 10
            curl --fail http://localhost:3000/health || exit 1

  integration-tests:
    name: Pruebas de Integración en Staging
    runs-on: ubuntu-latest
    needs: deploy-staging

    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Ejecutar pruebas de integración contra Staging
        run: |
          npm run test:integration
        env:
          API_URL: https://staging.miapp.com
```

#### Tarea 3.2 — Despliegue Canary a Producción

El despliegue Canary expone gradualmente la nueva versión a un subconjunto de usuarios reales antes de comprometer el 100% del tráfico. Esto permite detectar problemas en condiciones reales con un impacto limitado.

```yaml
# .github/workflows/cd-produccion.yml
name: CD — Despliegue Canary a Producción

on:
  workflow_dispatch:  # Activación manual con aprobación
    inputs:
      canary_weight:
        description: 'Porcentaje de tráfico para la versión Canary (10, 25, 50)'
        required: true
        default: '10'

jobs:
  canary-deploy:
    name: Despliegue Canary (${{ github.event.inputs.canary_weight }}%)
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://miapp.com

    steps:
      - name: Desplegar versión Canary
        run: |
          # Con Argo Rollouts o un balanceador de carga (NGINX/HAProxy/ALB):
          # Ajustar el peso del tráfico hacia la nueva versión
          echo "Configurando ${{ github.event.inputs.canary_weight }}% del tráfico hacia la versión ${{ github.sha }}"
          # kubectl argo rollouts set-weight mi-app ${{ github.event.inputs.canary_weight }}

      - name: Monitorear métricas durante el Canary (5 minutos)
        run: |
          echo "Monitoreando tasa de errores y latencia durante 5 minutos..."
          sleep 300
          # Verificar métricas en Prometheus
          ERROR_RATE=$(curl -s "https://prometheus.interno/api/v1/query?query=rate(http_requests_total{status='5xx'}[5m])" | jq '.data.result[0].value[1]')
          if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "ERROR: Tasa de errores ${ERROR_RATE} supera el umbral del 1%. Iniciando rollback automático."
            # kubectl argo rollouts abort mi-app
            exit 1
          fi
          echo "Métricas estables. Procediendo con la promoción completa."
```

> **Mecanismo de Rollback:** Si el job de monitoreo falla (tasa de errores > 1%), el pipeline termina con error y se revierte automáticamente el peso del balanceador al 0% en la nueva versión. El 100% del tráfico regresa a la versión estable sin intervención manual.

---

### Fase 4: Monitoreo y Observabilidad

**Objetivo:** Instrumentar la aplicación para recolectar métricas, visualizarlas en tiempo real y verificar que las alertas se disparan ante fallos.

#### Tarea 4.1 — Instrumentación de la Aplicación

Para exponer métricas compatibles con Prometheus, instrumenta tu aplicación con el cliente oficial:

```javascript
// backend/src/metrics.js (Node.js con prom-client)
const client = require('prom-client');

// Registrar las métricas por defecto del proceso (CPU, memoria, etc.)
client.collectDefaultMetrics({ prefix: 'app_' });

// Métricas personalizadas para el negocio
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status_code']
});

module.exports = { client, httpRequestDuration, httpRequestsTotal };
```

```javascript
// backend/src/server.js — Endpoint para el scraping de Prometheus
const { client } = require('./metrics');

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

#### Tarea 4.2 — Configurar Prometheus y Grafana con Docker Compose

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:v2.51.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'
    ports:
      - "9090:9090"
    networks:
      - monitoring-net

  grafana:
    image: grafana/grafana:10.3.3
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    networks:
      - monitoring-net

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring-net:
    driver: bridge
```

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
```

```yaml
# monitoring/alert_rules.yml — Reglas de Alerta
groups:
  - name: aplicacion
    rules:
      - alert: AltaTasaDeErrores
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Alta tasa de errores HTTP 5xx en {{ $labels.instance }}"
          description: "La tasa de errores supera el 5% durante 2 minutos."

      - alert: ServicioNoDisponible
        expr: up{job="backend"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "El servicio backend no responde"
          description: "Prometheus no puede hacer scraping del backend desde hace 30 segundos."
```

#### Tarea 4.3 — Simulación del Feedback Loop

```bash
# Simular una caída del servicio
docker compose stop backend

# En Grafana/Prometheus, verificar que la alerta "ServicioNoDisponible"
# cambia de estado "inactive" → "pending" → "firing" en ~30 segundos.

# Restaurar el servicio
docker compose start backend

# Verificar que la alerta regresa a estado "resolved"
```

> **Criterio de éxito del Workshop:** El pipeline completo (commit → CI → CD Staging → Monitoreo) funciona de forma autónoma. El equipo puede observar el estado del sistema en tiempo real y las alertas se disparan y resuelven automáticamente.

---

## 5.2 Uso de Herramientas Adicionales de Calidad y Pruebas

Para un pipeline de grado empresarial (*Enterprise-ready*), compilar y desplegar no es suficiente. Integrar herramientas de calidad y seguridad desde el inicio del ciclo — el principio **Shift-Left** — es lo que diferencia a un pipeline amateur de uno profesional.

```
Shift-Left: Mover las validaciones lo más temprano posible en el ciclo

  Diseño → Código → Commit → Build → Test → Deploy
    ↑                  ↑        ↑       ↑
  Revisión de       Análisis  Pruebas  Escaneo
  Arquitectura      estático  unitarias seguridad
  de Seguridad      (linters) (>80%)   (Trivy/Snyk)

  Cuanto más temprano se detecta un defecto, más barato es corregirlo.
```

---

### SonarQube — Análisis Estático y Quality Gates

**SonarQube** es la plataforma estándar para analizar continuamente la calidad del código. Detecta *code smells*, deuda técnica, bugs y vulnerabilidades de seguridad antes de que lleguen a producción.

#### El Concepto de "Quality Gate"

Un **Quality Gate** es una puerta de calidad configurable que previene que el código deficiente sea integrado. Si el código nuevo no cumple las métricas predefinidas, el Quality Gate falla y **detiene el pipeline de CI**.

| Condición de Quality Gate | Ejemplo de Umbral |
|---|---|
| Cobertura de pruebas en código nuevo | ≥ 80% |
| Duplicación de código nuevo | ≤ 3% |
| Bugs nuevos | 0 |
| Vulnerabilidades de seguridad nuevas | 0 |
| Code smells nuevos (ratio deuda técnica) | ≤ 5% |

> **Principio clave:** El Quality Gate evalúa solo el **código nuevo o modificado** en el PR — no el código legado preexistente. Esto evita el bloqueo por deuda técnica histórica y permite mejorar el código de forma incremental.

#### Configuración del Proyecto

```properties
# sonar-project.properties
sonar.projectKey=mi-empresa_mi-aplicacion
sonar.projectName=Mi Aplicación Backend
sonar.projectVersion=1.0

# Rutas del código fuente y pruebas
sonar.sources=src
sonar.tests=src/__tests__
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**

# Reporte de cobertura (generado por Jest, pytest, JUnit, etc.)
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# Idioma principal del proyecto
sonar.sourceEncoding=UTF-8
```

#### Integración en el Pipeline de CI

```yaml
# Agregar al pipeline de GitHub Actions (.github/workflows/ci.yml)
- name: Analizar código con SonarQube
  uses: SonarSource/sonarqube-scan-action@v2
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

- name: Verificar Quality Gate
  uses: SonarSource/sonarqube-quality-gate-action@v1
  timeout-minutes: 5
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  # Si el Quality Gate falla, este paso falla y detiene el pipeline
```

> **Flujo de integración:** El escaneo de SonarQube se ejecuta **después** de las pruebas unitarias (para tener el reporte de cobertura disponible) y **antes** de la construcción de la imagen Docker. Si el Quality Gate falla, la imagen nunca se construye.

---

### Selenium — Pruebas Automatizadas de UI End-to-End

**Selenium** permite automatizar navegadores web para realizar pruebas de regresión End-to-End (E2E), imitando el comportamiento de un usuario real: hacer clic en botones, completar formularios, navegar entre páginas y verificar resultados.

#### Uso en el Pipeline

Las pruebas E2E con Selenium se ejecutan **contra el entorno de Staging** una vez completado el despliegue, no contra el entorno de desarrollo. Esto valida que la integración completa del sistema funcione correctamente.

```yaml
# .github/workflows/cd-staging.yml — Agregar después del despliegue
  e2e-tests:
    name: Pruebas E2E con Selenium
    runs-on: ubuntu-latest
    needs: deploy-staging

    services:
      # Selenium Grid con múltiples navegadores en contenedores
      selenium-hub:
        image: selenium/hub:4.18
        ports:
          - "4444:4444"
      chrome:
        image: selenium/node-chrome:4.18
        env:
          SE_EVENT_BUS_HOST: selenium-hub
          SE_EVENT_BUS_PUBLISH_PORT: 4442
          SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      firefox:
        image: selenium/node-firefox:4.18
        env:
          SE_EVENT_BUS_HOST: selenium-hub
          SE_EVENT_BUS_PUBLISH_PORT: 4442
          SE_EVENT_BUS_SUBSCRIBE_PORT: 4443

    steps:
      - name: Checkout del código
        uses: actions/checkout@v4

      - name: Ejecutar pruebas E2E contra Staging
        run: npm run test:e2e
        env:
          BASE_URL: https://staging.miapp.com
          SELENIUM_HUB: http://localhost:4444
```

#### La Pirámide de Pruebas y las E2E

Las pruebas E2E son las más costosas en tiempo y mantenimiento. La **Pirámide de Pruebas** define la proporción correcta:

```
        ▲
       /E2E\        ← Pocas (flujos críticos del negocio únicamente)
      /─────\
     / Integ \      ← Moderadas (contratos entre servicios)
    /─────────\
   /  Unitarias \   ← Muchas (toda la lógica de negocio)
  /─────────────\
```

> **Regla práctica para E2E:** Solo automatizar los **flujos críticos que, si fallan, paralizan el negocio**: registro de usuario, inicio de sesión, proceso de pago, creación del recurso principal. Una suite de 20 pruebas E2E bien elegidas es más valiosa que 200 pruebas E2E que cubren casos triviales.

#### Buenas Prácticas para Evitar "Flaky Tests" en E2E

| Práctica | Descripción |
|---|---|
| Usar esperas explícitas | `WebDriverWait(driver, 10).until(EC.visibility_of_element_located(...))` — nunca `time.sleep()` |
| Identificadores estables | Usar atributos `data-testid` en el HTML, no selectores CSS frágiles |
| Estado de prueba independiente | Cada prueba crea sus propios datos y los limpia al finalizar |
| Reintentos controlados | Configurar máximo 2 reintentos para pruebas marcadas como potencialmente inestables |

---

### Trivy / Snyk — Seguridad DevSecOps en el Pipeline

**Trivy** (open-source de Aqua Security) y **Snyk** (SaaS con plan gratuito) escanean las imágenes Docker para detectar vulnerabilidades conocidas (**CVEs**) en:

- Las librerías base del sistema operativo (Alpine, Debian, etc.)
- Las dependencias de la aplicación (npm, pip, Maven, etc.)
- Los secretos accidentalmente incluidos en la imagen

#### Integración de Trivy en el Pipeline

```yaml
# Agregar al job de construcción de imagen, ANTES de publicar al registro
- name: Escanear imagen Docker con Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # Falla el pipeline si encuentra vulnerabilidades CRITICAL o HIGH

- name: Subir resultados al panel de seguridad de GitHub
  uses: github/codeql-action/upload-sarif@v3
  if: always()  # Subir aunque el paso anterior falle
  with:
    sarif_file: 'trivy-results.sarif'
```

> **Posicionamiento en el pipeline:** Trivy se ejecuta **después de construir la imagen** pero **antes de publicarla al registro**. Si se detectan vulnerabilidades críticas, la imagen nunca llega al registro y el despliegue no ocurre.

#### Comparación Trivy vs. Snyk

| Aspecto | Trivy | Snyk |
|---|---|---|
| Modelo | Open-source | SaaS (freemium) |
| Integración CI | GitHub Action oficial | GitHub Action + CLI |
| Escaneo de IaC (Terraform, k8s) | ✅ Incluido | ✅ Incluido |
| Escaneo de secretos | ✅ Incluido | ✅ Incluido |
| Recomendaciones de remediación | Básicas | Avanzadas (versión de corrección) |
| Panel web de gestión | Aqua Platform (de pago) | snyk.io (freemium) |

> **Recomendación:** Para comenzar, Trivy es ideal por ser open-source y de configuración simple. Snyk añade valor cuando el equipo necesita gestión centralizada de vulnerabilidades y recomendaciones de actualización automatizadas.

---

## 5.3 Análisis y Solución de Problemas Comunes (Troubleshooting)

Los pipelines no son perfectos y **fallarán**. Un ingeniero DevOps de nivel avanzado no es quien nunca tiene fallos — es quien diagnostica y resuelve los cuellos de botella empresariales más rápido que el promedio.

> **Mentalidad de depuración:** Antes de cualquier cambio, reproduce el problema de forma aislada. Lee el log completo desde el principio del error, no desde el final. El mensaje de error final frecuentemente es consecuencia del error real que ocurrió varios pasos antes.

---

### Problema 1 — Pruebas Inestables ("Flaky Tests")

**Síntoma:**

```
Run 1: ✅ PASSED
Run 2: ❌ FAILED — AssertionError: expected 5 items, got 4
Run 3: ✅ PASSED
```

El pipeline falla aleatoriamente sin cambios en el código. Funciona localmente pero falla en CI, o pasa al reintentarlo.

**Diagnóstico:**

| Causa Raíz | Indicador |
|---|---|
| Dependencias de tiempo (`sleep`) | El test falla solo cuando el sistema CI está bajo carga |
| Datos de prueba compartidos | Falla solo cuando otro test se ejecuta antes |
| Estado global no reseteado | Falla solo en la segunda ejecución de la suite |
| Dependencia de red | Falla cuando una API externa tiene latencia |

**Solución:**

```javascript
// ❌ Patrón problemático: prueba con estado compartido
let userCount = 0;

test('crear usuario incrementa el contador', async () => {
  await createUser({ name: 'Alice' });
  userCount++;
  expect(await getUserCount()).toBe(userCount); // Depende del orden de ejecución
});

// ✅ Patrón correcto: cada prueba es autónoma
beforeEach(async () => {
  await database.clean(); // Limpiar el estado antes de cada prueba
});

test('crear usuario incrementa el contador', async () => {
  const initialCount = await getUserCount();
  await createUser({ name: 'Alice' });
  expect(await getUserCount()).toBe(initialCount + 1); // Independiente del estado global
});
```

**Configuración recomendada para base de datos en pruebas:**

```yaml
# En el pipeline de CI, usar una base de datos efímera por ejecución
services:
  test-db:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: testdb_${{ github.run_id }}  # Nombre único por ejecución
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
```

---

### Problema 2 — Agotamiento de Recursos en CI (OOMKilled)

**Síntoma:**

```
Error: The runner was stopped because it ran out of memory.
# O en Kubernetes:
# Status: OOMKilled — Exit Code 137
```

El agente de CI muere repentinamente al compilar aplicaciones grandes (especialmente Java con Maven/Gradle).

**Diagnóstico:**

```bash
# En Kubernetes, identificar el pod afectado
kubectl describe pod <nombre-del-runner>
# Buscar: "OOMKilled" en la sección de Containers

# Ver el consumo histórico de memoria
kubectl top pod <nombre-del-runner> --containers
```

**Solución:**

```yaml
# Ajustar los límites de recursos del runner en Kubernetes
# .github/workflows/ci.yml — con self-hosted runners en K8s
jobs:
  build:
    runs-on: self-hosted
    container:
      image: eclipse-temurin:21-jdk-alpine
      resources:
        limits:
          memory: "4Gi"  # Ajustar según el consumo real medido
          cpu: "2"
        requests:
          memory: "2Gi"
          cpu: "1"

    steps:
      - name: Compilar con Maven (limitando la JVM)
        run: mvn package -DskipTests -B
        env:
          MAVEN_OPTS: "-Xmx2g -XX:MaxMetaspaceSize=512m"  # Limitar explícitamente la JVM
```

> **Estrategia a largo plazo:** Configurar Grafana para monitorear el consumo de memoria de los runners. Si el p95 de consumo supera el 70% del límite configurado, aumentar el límite proactivamente antes de que ocurra un OOMKill.

---

### Problema 3 — Builds Extremadamente Lentos (> 15 minutos)

**Síntoma:**

Los desarrolladores esperan más de 15 minutos para recibir retroalimentación del pipeline. La productividad cae y el CI deja de ser útil como herramienta de feedback rápido.

**Diagnóstico:**

```yaml
# Agregar timestamps para identificar el paso lento
- name: Build
  run: |
    echo "Inicio: $(date)"
    mvn clean package
    echo "Fin: $(date)"
```

**Solución A: Caché de Dependencias**

```yaml
# GitHub Actions: caché de dependencias Maven
- name: Cachear repositorio Maven local
  uses: actions/cache@v4
  with:
    path: ~/.m2/repository
    key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
    restore-keys: |
      ${{ runner.os }}-maven-

# Para Docker: caché de capas en GitHub Actions Cache
- name: Construir imagen con caché de capas
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha        # Leer caché del repositorio de acciones
    cache-to: type=gha,mode=max # Guardar todas las capas en caché
```

**Solución B: Paralelización de Trabajos**

```yaml
# Ejecutar pruebas unitarias, análisis de código y construcción de imagen en paralelo
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps: [...]

  code-analysis:
    runs-on: ubuntu-latest
    steps: [...]

  build-image:
    runs-on: ubuntu-latest
    needs: [unit-tests, code-analysis]  # Solo espera a que ambos terminen
    steps: [...]
```

---

### Problema 4 — Secretos Expuestos en Código

**Síntoma:**

```bash
# Hallazgo en un commit del repositorio
DB_PASSWORD=MiContraseñaSecreta123
API_KEY=sk-prod-abc123def456...
```

Contraseñas, tokens de API o claves privadas aparecen visibles en el repositorio de Git o en capas de imágenes Docker.

**Solución Inmediata (cuando ya ocurrió):**

```bash
# PASO 1: Rotar inmediatamente las credenciales comprometidas
# (cambiar la contraseña, revocar el token de API) — esto es prioritario.

# PASO 2: Eliminar el secreto del historial de Git con git-filter-repo
pip install git-filter-repo
git filter-repo --path archivo-con-secreto.env --invert-paths

# PASO 3: Forzar a todos los colaboradores a re-clonar el repositorio
```

**Solución Preventiva:**

```yaml
# .github/workflows/ci.yml — Escanear secretos en cada PR
- name: Escanear secretos con Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    scanners: 'secret'
    exit-code: '1'
```

```bash
# Configurar pre-commit para prevenir el commit de secretos
pip install pre-commit detect-secrets

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

> **Principio de gestión de secretos:** Los secretos nunca deben estar en el código fuente, ni en el Dockerfile, ni en el `docker-compose.yml`, ni en ningún archivo que sea versionado con Git. Se inyectan en tiempo de ejecución desde un gestor de secretos como **HashiCorp Vault**, **AWS Secrets Manager** o las **Secrets** del repositorio en GitHub.

---

### Problema 5 — Errores de Configuración YAML

**Síntoma:**

```
Error: .github/workflows/ci.yml: (Line: 23, Col: 7): 
Unexpected value 'run'
```

El pipeline completo falla por un error de indentación o sintaxis antes de ejecutar un solo paso.

**Solución:**

```bash
# Validar sintaxis YAML localmente antes de hacer push
# Instalar actionlint para validar específicamente GitHub Actions
brew install actionlint  # macOS
# O: go install github.com/rhysd/actionlint/cmd/actionlint@latest

# Validar el workflow
actionlint .github/workflows/ci.yml

# Error típico detectado:
# .github/workflows/ci.yml:23:7: "run" is missing after "with" [syntax-check]
```

```json
// .vscode/settings.json — Habilitar validación de YAML en el IDE
{
  "yaml.schemas": {
    "https://json.schemastore.org/github-workflow.json": ".github/workflows/*.yml"
  },
  "yaml.validate": true
}
```

> **Recomendación:** La extensión **YAML** de Red Hat para VS Code, combinada con el schema de GitHub Actions, subraya errores de sintaxis en tiempo real mientras escribes el workflow, antes de hacer el primer commit.

---

## Casos de Estudio Reales y Estadísticas de Cierre

Los datos siguientes provienen de investigaciones independientes de la industria y son fundamentales para justificar la inversión en CI/CD ante equipos directivos y de negocio.

---

### Las Métricas DORA: El Estándar de la Industria

El **DevOps Research and Assessment (DORA)** es el programa de investigación más riguroso sobre el rendimiento de los equipos de software. Sus métricas de "Cuatro Claves" son el estándar para medir la madurez de CI/CD:

| Métrica DORA | Definición | Élite | Alto | Medio | Bajo |
|---|---|---|---|---|---|
| **Frecuencia de despliegue** | ¿Con qué frecuencia despliega a producción? | Bajo demanda (múltiples veces/día) | 1 vez/semana – 1/mes | 1/mes – 1/6meses | < 1 vez/6meses |
| **Tiempo de entrega de cambios** | Del commit al despliegue en producción | < 1 hora | 1 día – 1 semana | 1 semana – 1 mes | > 6 meses |
| **Tasa de fallos en cambios** | % de cambios que causan incidentes | 0–15% | 16–30% | — | 16–30% |
| **Tiempo de recuperación (MTTR)** | Tiempo para restaurar el servicio tras un fallo | < 1 hora | < 1 día | 1 día – 1 semana | > 6 meses |

**El hallazgo más importante del reporte DORA:**

> Las organizaciones de rendimiento **Élite** despliegan **200 veces más frecuentemente** y tienen tiempos de entrega de cambios **106 veces más rápidos** que las organizaciones de bajo rendimiento. Al mismo tiempo, su tasa de éxito ante cambios es **60 veces mayor** y su tiempo de recuperación es **2604 veces más rápido**.

Este dato destruye el mito más común: **"Ir más rápido significa ser menos estable."** Los datos demuestran exactamente lo opuesto: la velocidad y la estabilidad se potencian mutuamente cuando se sustenta en prácticas de CI/CD maduras.

---

### Caso Fannie Mae — DevSecOps Acelera en Lugar de Frenar

**Fannie Mae** es una de las instituciones financieras más grandes de Estados Unidos, responsable de la infraestructura del mercado hipotecario nacional. Opera en un sector de altísima regulación (SOX, FHFA) donde la seguridad y el compliance son no negociables.

#### El Dilema

La percepción inicial del equipo era que integrar seguridad automatizada en el pipeline **ralentizaría** los ciclos de entrega. En un entorno regulado, las revisiones de seguridad manuales podían tardar días o semanas.

#### Las Prácticas Adoptadas

| Práctica DevSecOps | Descripción |
|---|---|
| Análisis de código estático en CI | Cada PR era escaneado automáticamente antes del merge |
| Escaneo de dependencias | Detección automática de CVEs en librerías de terceros |
| Pruebas de seguridad automatizadas (DAST) | Herramientas OWASP ejecutadas contra el entorno de staging |
| Reportes de compliance generados automáticamente | Evidencia para auditorías generada por el pipeline |

#### Los Resultados

| Métrica | Antes | Después | Cambio |
|---|---|---|---|
| Frecuencia de despliegue | Línea base | **+25% anual** | ↑ Aumentó |
| Tasa de fallos en producción | Línea base | **-25%** | ↓ Disminuyó |
| Retrabajo por defectos de seguridad | Alto | Reducción masiva | ↓ Disminuyó |
| Tiempo de ciclo de auditoría de seguridad | Semanas (manual) | Días (automatizado) | ↓ Disminuyó |

#### Lección Aplicable

> **Integrar seguridad acelera la entrega en lugar de frenarla.** Cuando la revisión de seguridad es un proceso manual al final del ciclo, se convierte en un cuello de botella. Cuando es un paso automatizado en el pipeline de CI (Shift-Left), la retroalimentación es instantánea y el costo de corrección es mínimo.

**¿Cómo aplicarlo?** Si en tu organización la revisión de seguridad ocurre "justo antes del go-live", ese es el primer proceso a automatizar. El retorno de inversión es inmediato: menos retrabajo, menos incidentes, ciclos más cortos.

---

### Caso Target — El Pipeline es el Habilitador, la Cultura es el Motor

**Target**, el gigante minorista estadounidense con más de 1,900 tiendas y operaciones de comercio electrónico a gran escala, enfrentó la necesidad de modernizar su ingeniería para competir en la era digital.

#### El Problema Técnico y Cultural

| Barrera | Descripción |
|---|---|
| Silos organizacionales | Desarrollo, Operaciones, Seguridad y QA trabajaban en secuencia, no en paralelo |
| Aprobaciones manuales | Cada despliegue requería sign-off de múltiples equipos |
| Ciclos de entrega lentos | Semanas o meses entre el desarrollo y la disponibilidad en producción |
| Resistencia cultural | "Así siempre se ha hecho" como barrera al cambio |

#### Las Iniciativas Adoptadas

**Técnica:**
- Automatización completa del pipeline de CI/CD con pruebas de todos los niveles.
- Infraestructura como Código (IaC) para eliminar la dependencia de equipos de infraestructura.
- APIs de plataforma interna (Developer Self-Service) para provisionar entornos sin tickets.

**Cultural y Organizacional:**
- **DevOpsDays internos:** Eventos regulares donde equipos de desarrollo, operaciones y seguridad comparten aprendizajes, fracasos y mejoras — sin jerarquías ni silos.
- **"You build it, you run it":** Los equipos de desarrollo asumen la responsabilidad del servicio en producción, lo que genera incentivos correctos para la calidad.
- **Post-mortems sin culpa (Blameless Post-Mortems):** Los incidentes se analizan para mejorar sistemas y procesos, no para asignar responsabilidades individuales.

#### La Lección Central

> **La herramienta CI/CD (el pipeline) es solo el habilitador técnico. El verdadero motor del éxito es la colaboración abierta entre equipos.** Target demostró que automatizar en silos no funciona: si los equipos no comparten el objetivo de la entrega rápida y confiable, el pipeline se convierte en otro proceso burocrático más rápido.

**¿Cómo aplicarlo?**

| Acción | Impacto |
|---|---|
| Organizar un "DevOps retrospective" mensual | Identificar cuellos de botella organizacionales, no solo técnicos |
| Incluir a Seguridad y QA en la definición del pipeline | Reduce revisiones manuales al final del ciclo |
| Compartir las métricas DORA con toda la organización | Crea visibilidad y accountablity compartida |
| Practicar post-mortems sin culpa ante cada incidente | Construye confianza y acelera el aprendizaje organizacional |

---

## Actividad de Reflexión Final del Curso

> **Del aprendizaje a la acción:**
>
> Con todo lo aprendido en el curso, responde las siguientes preguntas en no más de dos páginas:
>
> 1. **Diagnóstico actual:** ¿En cuál cuadrante DORA se encuentra hoy tu organización? ¿Cuál es la métrica con mayor brecha respecto al nivel Élite?
>
> 2. **El cuello de botella principal:** ¿Cuál es el único cambio que, si lo implementaras esta semana, tendría el mayor impacto en la velocidad y estabilidad de tus entregas?
>
> 3. **El obstáculo real:** ¿Es técnico (falta de automatización), organizacional (silos, procesos manuales) o cultural (resistencia al cambio)?
>
> 4. **El primer paso concreto:** Define una acción específica y ejecutable para los próximos 5 días hábiles. No un objetivo ambicioso — un primer paso pequeño, medible y demostrable al equipo.

---

## Tip para el Instructor

> **Cierre del Workshop:**
>
> Reserve los últimos 20 minutos del taller para una sesión de demostración ("show and tell"). Pida a 2 o 3 equipos que muestren su pipeline en ejecución: desde el commit hasta el despliegue en Staging con las métricas visibles en Grafana.
>
> Las preguntas que generan más aprendizaje en esta etapa son:
>
> - "¿Qué fue lo más difícil de implementar y por qué?"
> - "¿Qué falló primero y cómo lo diagnosticaron?"
> - "¿Qué cambiarían si tuvieran que hacerlo de nuevo en su empresa real?"
>
> Los errores y las soluciones compartidas en esta etapa consolidan el aprendizaje mejor que cualquier presentación teórica.

---

## Siguiente Paso

Has completado el contenido técnico del Módulo IV. Tienes el mapa completo: principios, estrategias, herramientas, casos reales y habilidades de diagnóstico.

➡️ Continúa con: [Cierre del Módulo](./09-cierre.md)
