# Tema 5: Profundización — GitHub Actions

> **Objetivo:** Dominar GitHub Actions como plataforma de CI/CD nativa de GitHub. Al finalizar este tema, habrás configurado pipelines reales desde cero, gestionado secretos de forma segura y aplicado optimizaciones de rendimiento.

---

## ¿Qué es GitHub Actions?

**GitHub Actions** es la plataforma de automatización y CI/CD nativa de GitHub. Permite automatizar cualquier flujo de trabajo — builds, pruebas, análisis de calidad, despliegues, publicación de paquetes — directamente desde el repositorio, sin instalar ni mantener servidores externos.

### Estadísticas de Adopción

| Indicador | Dato |
|-----------|------|
| Repositorios que usan GitHub Actions | **> 10 millones** (2024) |
| Actions disponibles en el Marketplace | **> 21,000** |
| Crecimiento de adopción anual | **~40% interanual** |
| Organizaciones que migraron desde Jenkins | **> 60%** en empresas < 500 desarrolladores |

---

## Arquitectura de GitHub Actions

```
Repositorio GitHub
│
├── .github/
│   └── workflows/
│       ├── ci.yml           ← Workflow de CI
│       ├── cd-staging.yml   ← Workflow de despliegue a Staging
│       └── release.yml      ← Workflow de publicación de releases
│
└── (código fuente de la aplicación)
```

### Componentes Clave

| Componente | Descripción | Ejemplo |
|------------|-------------|---------|
| **Workflow** | El proceso automatizado completo, definido en YAML | `ci.yml` |
| **Event (Disparador)** | Lo que activa el workflow | `push`, `pull_request`, `schedule` |
| **Job** | Unidad de trabajo que se ejecuta en un Runner | `build-and-test` |
| **Step** | Paso dentro de un Job: comando shell o Action | `run: npm test` |
| **Action** | Componente reutilizable del Marketplace | `actions/checkout@v4` |
| **Runner** | Servidor donde se ejecuta el Job | `ubuntu-latest` |
| **Secret** | Variable cifrada inyectada en tiempo de ejecución | `${{ secrets.API_KEY }}` |

---

## Ejemplo 1: Pipeline de CI para Java con Maven

Este es el pipeline de referencia para comenzar con un proyecto Java:

```yaml
# .github/workflows/ci.yml

name: CI — Java con Maven

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      # Paso 1: Obtener el código del repositorio
      - name: Checkout del código
        uses: actions/checkout@v4

      # Paso 2: Configurar JDK con caché de Maven
      - name: Configurar JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven        # ← Activa caché automática

      # Paso 3: Compilar y ejecutar pruebas con cobertura
      - name: Compilar y probar
        run: mvn clean verify  # verify incluye el check de JaCoCo

      # Paso 4: Publicar reporte de cobertura (opcional pero recomendado)
      - name: Publicar cobertura en Codecov
        uses: codecov/codecov-action@v4
        if: always()          # ← Se ejecuta aunque las pruebas fallen
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

**Lo que hace este workflow paso a paso:**
1. Se dispara cuando alguien hace `push` a `main` o abre/actualiza una Pull Request hacia `main`
2. Descarga el código en una VM de Ubuntu limpia
3. Instala JDK 17, restaurando el caché de Maven si existe
4. Ejecuta `mvn clean verify`: compila, corre las pruebas unitarias y verifica la cobertura
5. Publica el reporte de cobertura en Codecov (visible en la PR como comentario)

---

## Ejemplo 2: Pipeline CI/CD Completo con Docker

Un pipeline más avanzado que incluye build de imagen Docker y despliegue condicional:

```yaml
# .github/workflows/ci-cd.yml

name: CI/CD — Build, Test y Deploy

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

env:
  REGISTRY: ghcr.io                               # GitHub Container Registry
  IMAGE_NAME: ${{ github.repository }}            # usuario/repositorio

jobs:
  # ─────────────────────────────────────────────
  # Job 1: Pruebas (se ejecuta en PRs y en main)
  # ─────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependencias
        run: npm ci

      - name: Ejecutar pruebas unitarias
        run: npm test -- --coverage

      - name: Publicar resultados de pruebas
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Jest Tests
          path: reports/jest-junit.xml
          reporter: jest-junit

  # ─────────────────────────────────────────────
  # Job 2: Build y push de imagen Docker
  # Solo se ejecuta en push a main (no en PRs)
  # ─────────────────────────────────────────────
  build-and-push:
    runs-on: ubuntu-latest
    needs: test                                   # ← Depende de que test pase
    if: github.event_name == 'push'               # ← Solo en push, no en PR

    permissions:
      contents: read
      packages: write                             # ← Necesario para GHCR

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}   # ← Expone el tag para el siguiente job

    steps:
      - uses: actions/checkout@v4

      - name: Login al GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # ← Token automático de GitHub

      - name: Extraer metadatos para Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha                              # ← Tag con SHA del commit

      - name: Build y Push de imagen Docker
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha                   # ← Caché de Docker layers en GitHub
          cache-to: type=gha,mode=max

  # ─────────────────────────────────────────────
  # Job 3: Despliegue a Staging
  # ─────────────────────────────────────────────
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: staging                          # ← Requiere environment configurado en GitHub

    steps:
      - name: Desplegar a Staging
        run: |
          echo "Desplegando imagen: ${{ needs.build-and-push.outputs.image-tag }}"
          # Aquí van los comandos reales: kubectl, AWS CLI, Heroku, etc.
```

---

## Ejemplo 3: Matriz de Pruebas (Testing Matrix)

Permite ejecutar el mismo pipeline en múltiples versiones o sistemas operativos simultáneamente:

```yaml
# .github/workflows/matrix-test.yml

name: Pruebas en Múltiples Entornos

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: ['18', '20', '22']
        # Genera 3 × 3 = 9 jobs ejecutándose en paralelo

    steps:
      - uses: actions/checkout@v4

      - name: Configurar Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test
```

**Resultado:** 9 jobs en paralelo que prueban la aplicación en todas las combinaciones de OS y versión de Node.

---

## Gestión de Secretos y Seguridad

Los secretos son credenciales, tokens, contraseñas y cualquier dato sensible que el pipeline necesita pero que **nunca debe estar en el código fuente**.

### Dónde Configurar Secretos

```
Repositorio → Settings → Secrets and variables → Actions → New repository secret
```

**Tipos de secretos disponibles:**

| Tipo | Scope | Uso |
|------|-------|-----|
| Repository secrets | Un solo repositorio | Credenciales de despliegue del proyecto |
| Environment secrets | Un environment específico | Credenciales de producción (con aprobación requerida) |
| Organization secrets | Todos los repos de la organización | Tokens compartidos (SonarCloud, Codecov) |

### Cómo Usar Secretos en el Workflow

```yaml
steps:
  - name: Conectar a base de datos
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      API_KEY: ${{ secrets.EXTERNAL_API_KEY }}
    run: |
      # Las variables están disponibles como variables de entorno
      python deploy.py --db-url "$DATABASE_URL"
```

**Reglas de seguridad:**
- ✅ Los secretos están cifrados y nunca aparecen en logs (se muestran como `***`)
- ✅ Solo los workflows del repositorio tienen acceso
- ✅ Los forks de repositorios públicos NO tienen acceso a los secretos del repositorio original
- ❌ Nunca imprimas un secreto con `echo ${{ secrets.API_KEY }}` — GitHub lo detecta y lo enmascara, pero es mala práctica

---

## Buenas Prácticas en GitHub Actions

### 1. Fijar Versiones de Actions

```yaml
# ❌ Peligroso: puede cambiar el comportamiento sin aviso
uses: actions/checkout@main

# ✅ Correcto: versión semántica estable
uses: actions/checkout@v4

# ✅ Más seguro aún: fija al hash de commit (para seguridad supply chain)
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

### 2. Limitar Permisos (Principio de Mínimo Privilegio)

```yaml
# A nivel del workflow (aplica a todos los jobs)
permissions:
  contents: read          # Solo lectura del código
  packages: write         # Escritura solo para publicar paquetes
  pull-requests: write    # Escritura de comentarios en PRs
```

### 3. Usar Concurrencia para Evitar Ejecuciones Redundantes

```yaml
# Si llegan 3 pushes seguidos a la misma rama, cancela los anteriores
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 4. Separar Workflows por Propósito

```
.github/workflows/
├── ci.yml          ← Se ejecuta en cada PR: build + tests (rápido)
├── cd-staging.yml  ← Se ejecuta en push a main: deploy a staging
├── cd-prod.yml     ← Se ejecuta en tags: deploy a producción
├── nightly.yml     ← Se ejecuta cada noche: tests de integración lentos
└── security.yml    ← Se ejecuta semanalmente: escaneo de vulnerabilidades
```

### 5. Reutilizar Workflows

```yaml
# En un workflow que quiere reutilizar otro:
jobs:
  call-ci:
    uses: ./.github/workflows/ci.yml       # Workflow del mismo repo
    secrets: inherit                        # Pasa los secretos automáticamente

  # O desde otro repositorio (org-level):
  call-shared-ci:
    uses: mi-empresa/shared-workflows/.github/workflows/java-ci.yml@main
    with:
      java-version: '17'
```

---

## Runners: Hosted vs. Self-Hosted

| Característica | GitHub-Hosted Runner | Self-Hosted Runner |
|----------------|---------------------|-------------------|
| **Configuración** | Ninguna (listo para usar) | Instalar el agente en tu servidor |
| **Mantenimiento** | GitHub lo gestiona | Tu equipo lo gestiona |
| **Entorno** | Limpio en cada ejecución | Puede tener estado persistente |
| **Costo (repos privados)** | Se cobra por minutos usados | Solo el costo del servidor |
| **Herramientas preinstaladas** | Docker, Node, Java, Python, .NET y más | Solo las que instales |
| **Redes privadas** | No accede a redes internas | Sí puede acceder a redes internas |
| **Sistemas operativos** | Linux, Windows, macOS | Cualquier OS compatible |

**Cuándo usar Self-Hosted:**
- El pipeline necesita acceder a recursos en una red privada (base de datos interna, APIs internas)
- Las pruebas requieren hardware especial (GPUs, dispositivos embebidos)
- El volumen de ejecuciones hace que el costo de los hosted runners sea prohibitivo

---

## Comparativa: GitHub Actions vs. Jenkins

| Criterio | GitHub Actions | Jenkins |
|----------|---------------|---------|
| **Curva de aprendizaje** | Baja (YAML familiar) | Media-Alta (Groovy + configuración del servidor) |
| **Mantenimiento de infraestructura** | Ninguno (SaaS) | Alto (servidor, plugins, actualizaciones) |
| **Integración con GitHub** | Nativa y perfecta | Requiere plugins y webhooks |
| **Ecosistema de plugins** | 21,000+ Actions | 1,800+ plugins |
| **Paralelismo** | Nativo y simple | Posible pero más complejo de configurar |
| **Costo para repos privados** | Minutos incluidos + pago por exceso | Costo del servidor propio |
| **Pipelines como código** | YAML (obligatorio) | Jenkinsfile (Groovy DSL) |
| **Mejor para** | Proyectos en GitHub, equipos sin DevOps dedicado | Infraestructuras complejas, múltiples repos, control total |

---

## Actividad Práctica

> **Ejercicio paso a paso:**
>
> 1. Crea un repositorio en GitHub con una aplicación simple (puede ser "Hello World" en tu lenguaje favorito con al menos una prueba unitaria).
> 2. Crea el archivo `.github/workflows/ci.yml` con el ejemplo básico del Ejemplo 1 (adaptado a tu lenguaje).
> 3. Haz un commit y observa cómo se activa el workflow automáticamente.
> 4. Introduce un error en la prueba unitaria, haz commit y observa cómo el workflow falla.
> 5. Configura una Branch Protection Rule que requiera que el workflow pase antes de hacer merge.
> 6. Abre una Pull Request con el error — observa que el merge está bloqueado.
> 7. Corrige el error, observa que el merge se habilita.
>
> En 30–60 minutos habrás implementado un pipeline de CI funcional con Branch Policies activas.

---

## Siguiente Paso

GitHub Actions es ideal para proyectos alojados en GitHub. Pero en muchas empresas, la infraestructura está basada en Jenkins. Veamos cómo configurar pipelines equivalentes allí.

➡️ Continúa con: [Tema 6 - Profundización: Jenkins](./06-jenkins.md)
