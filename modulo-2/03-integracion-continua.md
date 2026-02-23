# Tema 3: Profundización en Integración Continua

> **Objetivo:** Pasar de la teoría a la práctica. Al finalizar este tema, sabrás configurar un pipeline funcional tanto en Jenkins como en GitHub Actions, y aplicarás las buenas prácticas que los equipos de clase mundial utilizan a diario.

---

## Estadísticas del Impacto de CI en el Mercado

| Indicador | Dato |
|-----------|------|
| Empresas con pipelines de CI/CD | **> 80%** |
| Mercado de herramientas CI (2024) | **$1,400 millones USD** |
| Proyección del mercado para 2029 | **$3,720 millones USD** |
| Velocidad de entrega con CI/CD | **2.5x más rápido** que equipos sin CI |
| Frecuencia de despliegues (organizaciones Elite) | **30x más frecuente** |
| Lead Time (organizaciones Elite) | **200x más rápido** |

> **Fuentes:** MarketsandMarkets, DORA State of DevOps Report.

---

## Ecosistema de Herramientas CI

Existe un amplio ecosistema de herramientas. La elección depende de la infraestructura existente, el presupuesto y la estrategia de la organización:

| Herramienta | Tipo | Características Clave | Mejor Para |
|-------------|------|-----------------------|------------|
| **Jenkins** | Open Source (Self-Hosted) | Miles de plugins, altamente personalizable, arquitectura Master/Agent | Infraestructuras complejas, empresas con requisitos específicos de control |
| **GitHub Actions** | SaaS / Self-Hosted | Nativo en GitHub, YAML, Marketplace de Actions, gratis para repositorios públicos | Proyectos en GitHub, equipos que quieren reducir mantenimiento de servidores |
| **GitLab CI** | SaaS / Self-Hosted | Integrado en GitLab, configurado via `.gitlab-ci.yml`, Runners | Equipos que buscan plataforma todo-en-uno (repo + CI) |
| **Bamboo** | Comercial (Atlassian) | Integración con Jira y Bitbucket | Empresas corporativas en el ecosistema Atlassian |
| **Drone CI** | Open Source | Todo basado en contenedores Docker, incluso los plugins | Equipos cloud-native con fuerte adopción de contenedores |
| **CircleCI** | SaaS / Self-Hosted | Pipelines rápidos, caché inteligente, orbs reutilizables | Startups y equipos que priorizan velocidad de configuración |

---

## Buenas Prácticas Generales de CI

Antes de ver herramientas específicas, es fundamental internalizar estas rutinas de trabajo:

### 1. Integración Frecuente (al menos 1 vez al día)
Cuanto más tiempo pase un cambio en una rama aislada, más dolorosa será su integración. La frecuencia de integración es inversamente proporcional al tamaño del conflicto.

### 2. Desarrollo Basado en Trunk (Trunk-Based Development — TBD)
Evitar ramas de características (feature branches) de larga duración. Si se usan, deben fusionarse de vuelta a `main` en horas o días, no en semanas. Las ramas largas son la fuente principal del "infierno de integración".

```
✅ Trunk-Based Development:
   main ──●──●──●──●──●──●──●──●─── (commits frecuentes, ramas cortas)

❌ Anti-patrón (ramas de larga duración):
   main ────────────────────────────●── (merge masivo después de meses)
         └── feature/nueva-ui ───────┘
```

### 3. La Línea Verde es Prioridad Máxima
Si el pipeline falla (estado "rojo"), el equipo **detiene** las nuevas tareas y prioriza restablecer el estado verde. Un pipeline roto que se ignora durante horas o días pierde su valor como herramienta de calidad.

### 4. Pipeline as Code
Toda la configuración del pipeline (el `Jenkinsfile`, el `.github/workflows/*.yml`, el `.gitlab-ci.yml`) debe vivir **en el repositorio junto al código**, versionado con Git. Nunca configurar pipelines solo a través de interfaces gráficas.

**Ventajas:**
- Historial de cambios del pipeline (quién cambió qué y por qué).
- El pipeline se revisa como código en Pull Requests.
- Los entornos son reproducibles: si el servidor de CI muere, se puede recrear el pipeline exacto.

### 5. Pruebas Rápidas: El Principio "Fail Fast"
Una suite de pruebas que tarda 45 minutos en ejecutarse no da feedback útil. El objetivo es **menos de 10 minutos** para las pruebas unitarias del pipeline principal. Las pruebas más lentas (integración, end-to-end) se ejecutan en pipelines paralelos o menos frecuentes.

---

## Profundización 1: Jenkins

### ¿Qué es Jenkins?

Jenkins es un **servidor de automatización open source** escrito en Java. Es el estándar histórico de la industria para CI/CD, con una comunidad enorme y más de 1,800 plugins disponibles.

### Arquitectura: Controller + Agents

En entornos de producción, Jenkins se configura con una arquitectura distribuida:

```
┌──────────────────────────────────────────────────────────┐
│                    Jenkins Controller                    │
│  (Gestiona configuración, distribuye trabajo, UI web)    │
└───────────────────────────┬──────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      ┌──────────┐    ┌──────────┐    ┌──────────┐
      │ Agent 1  │    │ Agent 2  │    │ Agent 3  │
      │ (Linux)  │    │(Windows) │    │(Docker)  │
      │ Builds   │    │  Tests   │    │  Deploy  │
      └──────────┘    └──────────┘    └──────────┘
```

Los agentes pueden ser **servidores físicos, máquinas virtuales o contenedores Docker** que se aprovisionan dinámicamente por demanda.

### Jenkinsfile: Pipeline as Code

La práctica moderna en Jenkins usa **proyectos tipo Pipeline**, donde las etapas se definen en un archivo `Jenkinsfile` en la raíz del repositorio. El lenguaje es un DSL basado en **Groovy**.

#### Ejemplo: Pipeline Declarativo para una Aplicación .NET

```groovy
pipeline {
    agent any  // Se ejecuta en cualquier agente disponible

    environment {
        DOCKER_IMAGE = "mi-empresa/mi-api:${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'dotnet build . --configuration Release'
            }
        }

        stage('Test') {
            steps {
                sh 'dotnet test . --logger "trx;LogFileName=results.trx"'
            }
            post {
                always {
                    // Publica los resultados de pruebas en la UI de Jenkins
                    mstest testResultsFile: '**/*.trx'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE} ."
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                sh "docker push ${DOCKER_IMAGE}"
                sh "kubectl set image deployment/mi-api mi-api=${DOCKER_IMAGE}"
            }
        }
    }

    post {
        failure {
            // Notifica al equipo si el pipeline falla
            slackSend channel: '#ci-alerts', message: "❌ Pipeline fallido: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        success {
            slackSend channel: '#deployments', message: "✅ Despliegue exitoso: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
```

### Buenas Prácticas en Jenkins

| Práctica | Descripción |
|----------|-------------|
| **Credentials Binding** | Nunca escribir contraseñas, tokens o llaves SSH en el `Jenkinsfile`. Usar la bóveda de credenciales de Jenkins e inyectarlas como variables de entorno con `withCredentials()` |
| **Caché de dependencias** | Configurar el agente para no descargar paquetes (Maven, NPM, NuGet) desde cero en cada build. Puede reducir el tiempo del pipeline en un 60-80% |
| **Agentes efímeros con Docker** | Usar la imagen Docker correcta para cada etapa del pipeline, en lugar de instalar todas las herramientas en un agente permanente |
| **Webhook triggers** | Configurar Jenkins para ser disparado por webhooks de GitHub/GitLab, no por polling periódico |

---

## Profundización 2: GitHub Actions

### ¿Qué es GitHub Actions?

GitHub Actions es la plataforma de CI/CD **nativa de GitHub**. Permite automatizar flujos de trabajo directamente desde el repositorio, sin necesidad de instalar ni mantener un servidor externo.

### Componentes Clave

```
Repositorio GitHub
├── .github/
│   └── workflows/
│       ├── ci.yml          ← Workflow de Integración Continua
│       ├── cd-staging.yml  ← Workflow de despliegue a Staging
│       └── cd-prod.yml     ← Workflow de despliegue a Producción
```

| Componente | Descripción |
|------------|-------------|
| **Workflow** | El proceso automatizado completo, definido en un archivo YAML |
| **Event (Disparador)** | Lo que activa el workflow: `push`, `pull_request`, `schedule`, `workflow_dispatch` |
| **Job** | Una unidad de trabajo que se ejecuta en un Runner (servidor). Los jobs pueden ejecutarse en paralelo |
| **Step** | Un paso dentro de un Job: puede ser un comando shell o una Action reutilizable |
| **Action** | Un componente reutilizable del [Marketplace de GitHub Actions](https://github.com/marketplace?type=actions) |
| **Runner** | El servidor donde se ejecuta el Job. Puede ser hospedado por GitHub (`ubuntu-latest`, `windows-latest`) o propio (self-hosted) |

### Ejemplo Práctico: CI para una Aplicación Java con Maven

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
      # 1. Obtener el código del repositorio
      - name: Checkout del código
        uses: actions/checkout@v4

      # 2. Configurar el JDK
      - name: Configurar JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven  # ← Activa la caché de dependencias Maven

      # 3. Compilar y ejecutar pruebas
      - name: Compilar y probar con Maven
        run: mvn clean verify

      # 4. Publicar reporte de cobertura de código
      - name: Publicar cobertura
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

### Ejemplo Avanzado: CI/CD Completo con Docker

```yaml
# .github/workflows/ci-cd.yml

name: CI/CD — Build, Test y Deploy

on:
  push:
    branches: [ "main" ]

env:
  IMAGE_NAME: mi-empresa/mi-api

jobs:
  # Job 1: Pruebas (se ejecuta primero)
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Ejecutar pruebas unitarias
        run: npm ci && npm test

  # Job 2: Build y Push de imagen Docker (depende de que test pase)
  build-and-push:
    runs-on: ubuntu-latest
    needs: test  # ← Solo se ejecuta si el job 'test' pasó
    steps:
      - uses: actions/checkout@v4

      - name: Login a Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build y Push de imagen Docker
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.IMAGE_NAME }}:${{ github.sha }}

  # Job 3: Despliegue (depende de build-and-push)
  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: staging  # ← Requiere aprobación del environment en GitHub
    steps:
      - name: Desplegar a Staging
        run: |
          echo "Desplegando imagen ${{ env.IMAGE_NAME }}:${{ github.sha }}"
          # Aquí irían los comandos de despliegue (kubectl, AWS CLI, etc.)
```

### Buenas Prácticas en GitHub Actions

| Práctica | Cómo implementarla |
|----------|--------------------|
| **Usar Secretos de GitHub** | Guardar credenciales en `Settings → Secrets and variables → Actions`. Acceder con `${{ secrets.NOMBRE }}` |
| **Fijar versiones de Actions** | Usar `actions/checkout@v4` en lugar de `actions/checkout@main` para builds reproducibles |
| **Caché de dependencias** | Usar `cache: maven` en `setup-java`, `cache: npm` en `setup-node`, etc. para acelerar builds |
| **Actions Reutilizables (Composite)** | Crear Composite Actions para lógica repetida entre workflows |
| **Environments con protección** | Usar `environment: production` para requerir aprobación humana antes de despliegues críticos |
| **Concurrencia** | Usar `concurrency` para cancelar workflows en curso cuando llega uno nuevo del mismo branch |

---

## Reflexión

> **Consejo para los estudiantes:** Aprender CI no es solo memorizar la sintaxis de un YAML o un Jenkinsfile. El objetivo final es cambiar la mentalidad (*mindset*): deben programar asumiendo que **cada commit que hacen podría, y debería, ir a producción hoy mismo**. Si asimilan esta responsabilidad, escribirán código más modular, desarrollarán mejores pruebas y aportarán un valor enorme a la organización.

---

## Siguiente Paso

Los pipelines de CI/CD son poderosos, pero solo funcionan si los **entornos** en los que se ejecutan son consistentes y reproducibles. Eso es lo que veremos a continuación.

➡️ Continúa con: [Tema 4 - Configuración del Entorno](./04-configuracion-entornos.md)
