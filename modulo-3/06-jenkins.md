# Tema 6: Profundización — Jenkins

> **Objetivo:** Dominar Jenkins como servidor de CI/CD open source de nivel empresarial. Al finalizar este tema, habrás configurado pipelines declarativos con Jenkinsfile, entendido la arquitectura Controller/Agent y gestionado credenciales de forma segura.

---

## ¿Qué es Jenkins?

**Jenkins** es el servidor de automatización open source más utilizado del mundo. Escrito en Java, es el estándar histórico de la industria para CI/CD con una comunidad de más de una década y miles de plugins disponibles.

### Estadísticas de Jenkins en la Industria

| Indicador | Dato |
|-----------|------|
| Instancias activas de Jenkins en el mundo | **> 300,000** (estimado) |
| Plugins disponibles en el ecosistema | **> 1,800** |
| Años de desarrollo activo | **> 16 años** (proyecto Jenkins, antes Hudson, desde 2004) |
| Lenguaje de implementación | Java (requiere JVM) |
| Modelo de licencia | Open Source (MIT License) |

> **Contexto:** A pesar del crecimiento de las soluciones SaaS como GitHub Actions, Jenkins sigue siendo la opción dominante en grandes corporaciones con requisitos específicos de control, seguridad y personalización.

---

## Arquitectura: Controller + Agents

En entornos de producción, Jenkins funciona con una arquitectura distribuida que separa la coordinación del trabajo pesado:

```
┌─────────────────────────────────────────────────────────┐
│                   Jenkins Controller                    │
│                                                         │
│  • Gestiona la configuración y los proyectos            │
│  • Sirve la interfaz web (UI)                           │
│  • Distribuye los jobs a los agentes disponibles        │
│  • Almacena el historial de builds y artefactos         │
│                                                         │
└───────────────────────────┬─────────────────────────────┘
                            │  Protocolo JNLP / SSH
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Agent 1  │     │ Agent 2  │     │ Agent 3  │
    │ (Linux)  │     │(Windows) │     │ (Docker) │
    │          │     │          │     │          │
    │ Java     │     │ .NET     │     │ Node.js  │
    │ builds   │     │ builds   │     │ builds   │
    └──────────┘     └──────────┘     └──────────┘
```

### Tipos de Agentes

| Tipo de Agente | Cómo se conecta | Cuándo usarlo |
|----------------|-----------------|---------------|
| **Agente permanente (SSH)** | Controller se conecta por SSH | Máquinas físicas o VMs fijas |
| **Agente permanente (JNLP)** | El agente inicia la conexión hacia el Controller | Agentes detrás de firewall |
| **Agente en Docker** | Se provisiona un contenedor por cada build | Entornos aislados y reproducibles |
| **Agente en Kubernetes** | Pod de Kubernetes por cada build | Escalado dinámico en la nube |
| **Agente en la nube (EC2/Azure)** | Máquinas virtuales que se crean y destruyen automáticamente | Builds esporádicos de alta demanda |

---

## Jenkinsfile: Pipeline as Code en Jenkins

El estándar moderno en Jenkins es el **pipeline declarativo**, definido en un archivo `Jenkinsfile` en la raíz del repositorio.

### Estructura de un Pipeline Declarativo

```groovy
pipeline {
    agent any                    // En qué agente ejecutar

    environment {                // Variables de entorno globales
        APP_VERSION = "1.0.0"
    }

    options {                    // Configuración del pipeline
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {                     // Etapas del pipeline
        stage('Nombre') {
            steps { ... }        // Los pasos de cada etapa
            post { ... }         // Acciones post-etapa
        }
    }

    post {                       // Acciones post-pipeline
        success { ... }
        failure { ... }
        always { ... }
    }
}
```

---

## Ejemplo 1: Pipeline de CI para Java con Maven

Pipeline completo de referencia para un proyecto Java empresarial:

```groovy
// Jenkinsfile

pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "mi-empresa/mi-api"
        DOCKER_TAG   = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
    }

    options {
        timeout(time: 20, unit: 'MINUTES')    // Falla si tarda más de 20 min
        buildDiscarder(logRotator(numToKeepStr: '15'))
        disableConcurrentBuilds()              // No ejecutar builds en paralelo
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm               // Descarga el código del repositorio configurado
                echo "Build #${env.BUILD_NUMBER} — Commit: ${env.GIT_COMMIT.take(7)}"
            }
        }

        stage('Build') {
            steps {
                sh 'mvn clean package -DskipTests'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'mvn test'
            }
            post {
                always {
                    // Publica los resultados de pruebas JUnit en la UI de Jenkins
                    junit '**/target/surefire-reports/*.xml'
                    // Publica el reporte de cobertura JaCoCo
                    jacoco(
                        execPattern: '**/target/jacoco.exec',
                        classPattern: '**/target/classes',
                        sourcePattern: '**/src/main/java',
                        minimumLineCoverage: '80'     // ← Falla si < 80%
                    )
                }
            }
        }

        stage('Code Quality Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {    // 'SonarQube' = nombre del servidor configurado
                    sh 'mvn sonar:sonar'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
            }
        }

        stage('Push Docker Image') {
            when {
                branch 'main'               // ← Solo push a main, no en ramas de feature
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_PASS'
                    )
                ]) {
                    sh "echo ${DOCKERHUB_PASS} | docker login -u ${DOCKERHUB_USER} --password-stdin"
                    sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
                }
            }
        }

    }

    post {
        success {
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "✅ Build exitoso: ${env.JOB_NAME} #${env.BUILD_NUMBER} | ${env.BUILD_URL}"
            )
        }
        failure {
            slackSend(
                channel: '#ci-alerts',
                color: 'danger',
                message: "❌ Build fallido: ${env.JOB_NAME} #${env.BUILD_NUMBER} | ${env.BUILD_URL}"
            )
            // También se puede enviar correo:
            // mail to: 'equipo@empresa.com', subject: "Build fallido: ${env.JOB_NAME}"
        }
        always {
            cleanWs()    // Limpia el workspace del agente al finalizar
        }
    }
}
```

---

## Ejemplo 2: Pipeline con Stages en Paralelo

Para reducir el tiempo total del pipeline, los stages independientes pueden ejecutarse en paralelo:

```groovy
pipeline {
    agent any

    stages {

        stage('Build') {
            steps {
                sh 'mvn clean package -DskipTests'
            }
        }

        // Este stage ejecuta 3 sub-stages en paralelo
        stage('Validate') {
            parallel {

                stage('Unit Tests') {
                    steps { sh 'mvn test' }
                    post {
                        always { junit '**/target/surefire-reports/*.xml' }
                    }
                }

                stage('Code Style') {
                    steps { sh 'mvn checkstyle:check' }
                }

                stage('Security Scan') {
                    steps {
                        sh 'mvn org.owasp:dependency-check-maven:check'
                    }
                }
            }
        }

        stage('Package') {
            steps {
                sh "docker build -t mi-empresa/mi-api:${env.BUILD_NUMBER} ."
            }
        }
    }
}
```

---

## Ejemplo 3: Pipeline con Agente Docker por Stage

Una práctica avanzada es usar un contenedor Docker diferente para cada etapa, evitando instalar todo en el agente:

```groovy
pipeline {
    agent none   // ← No usar un agente global; cada stage define el suyo

    stages {

        stage('Build Java') {
            agent {
                docker {
                    image 'maven:3.9-eclipse-temurin-17'
                    args '-v $HOME/.m2:/root/.m2'    // Monta caché de Maven
                }
            }
            steps {
                sh 'mvn clean package'
            }
        }

        stage('Build Docker Image') {
            agent {
                docker {
                    image 'docker:24-dind'
                    args '--privileged'               // Necesario para Docker-in-Docker
                }
            }
            steps {
                sh "docker build -t mi-app:${env.BUILD_NUMBER} ."
            }
        }

        stage('Deploy') {
            agent {
                docker {
                    image 'bitnami/kubectl:latest'
                }
            }
            steps {
                sh "kubectl set image deployment/mi-app mi-app=mi-app:${env.BUILD_NUMBER}"
            }
        }
    }
}
```

---

## Gestión de Credenciales en Jenkins

Jenkins tiene un sistema de credenciales cifradas que impide que contraseñas y tokens aparezcan en el código.

### Tipos de Credenciales en Jenkins

| Tipo | Uso típico |
|------|------------|
| **Username with Password** | Credenciales de Docker Hub, Maven Repository |
| **Secret Text** | Tokens de API (SonarQube, Slack) |
| **SSH Username with Private Key** | Acceso SSH a servidores de despliegue |
| **Certificate** | Certificados TLS/mTLS |
| **Secret File** | Archivos de configuración sensibles (kubeconfig, .env) |

### Uso en el Jenkinsfile

```groovy
// Inyectar credenciales como variables de entorno
withCredentials([
    string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN'),
    usernamePassword(
        credentialsId: 'db-credentials',
        usernameVariable: 'DB_USER',
        passwordVariable: 'DB_PASS'
    ),
    sshUserPrivateKey(
        credentialsId: 'deploy-server-key',
        keyFileVariable: 'SSH_KEY'
    )
]) {
    sh """
        mvn sonar:sonar -Dsonar.login=${SONAR_TOKEN}
        ssh -i ${SSH_KEY} deploy@servidor.empresa.com 'docker pull mi-app:latest'
    """
}
// Las variables SONAR_TOKEN, DB_USER, DB_PASS y SSH_KEY
// solo existen dentro del bloque withCredentials
```

---

## Plugins Esenciales de Jenkins

El ecosistema de plugins es la mayor fortaleza de Jenkins:

| Plugin | Función |
|--------|---------|
| **Pipeline** | Habilita los Jenkinsfiles declarativos y scripted |
| **Blue Ocean** | UI moderna para visualizar y gestionar pipelines |
| **Git / GitHub Branch Source** | Integración con repositorios Git y GitHub |
| **Docker Pipeline** | Permite usar contenedores Docker como agentes |
| **Kubernetes** | Provisiona pods de Kubernetes como agentes dinámicos |
| **SonarQube Scanner** | Integración con análisis de calidad SonarQube |
| **JaCoCo** | Publica reportes de cobertura de código Java |
| **Slack Notification** | Notificaciones en canales de Slack |
| **OWASP Dependency-Check** | Escaneo de vulnerabilidades en dependencias |
| **Credentials Binding** | Inyección segura de credenciales en el pipeline |
| **Timestamper** | Agrega marcas de tiempo a cada línea del log |

---

## Configuración de Webhook en GitHub → Jenkins

Para que GitHub notifique a Jenkins cuando hay un push:

**1. En Jenkins (UI):**
```
Panel de Jenkins → Manage Jenkins → Configure System
  → GitHub → GitHub Servers → Add GitHub Server
  → Agregar credenciales con un Personal Access Token de GitHub
```

**2. En el Jenkinsfile:**
```groovy
pipeline {
    agent any
    triggers {
        githubPush()    // ← Se activa por webhook de GitHub
    }
    ...
}
```

**3. En GitHub:**
```
Repositorio → Settings → Webhooks → Add webhook
  Payload URL: https://mi-jenkins.empresa.com/github-webhook/
  Content type: application/json
  Events: Just the push event
```

---

## Buenas Prácticas en Jenkins

| Práctica | Descripción |
|----------|-------------|
| **Nunca almacenar credenciales en el Jenkinsfile** | Siempre usar `withCredentials()` o variables de entorno del sistema |
| **Versionar el Jenkinsfile con el código** | El pipeline debe vivir en el repositorio, no solo en la UI de Jenkins |
| **Limpiar el workspace** | Usar `cleanWs()` en el bloque `post { always { ... } }` para no acumular archivos entre builds |
| **Configurar timeouts** | Un pipeline sin timeout puede colgar indefinidamente y bloquear agentes |
| **Usar agentes Docker o Kubernetes** | Cada build en un contenedor limpio garantiza reproducibilidad y aísla dependencias |
| **Limitar los builds almacenados** | Usar `logRotator` para no llenar el disco con historial infinito |
| **Blue Ocean para el equipo** | La UI clásica de Jenkins es compleja; Blue Ocean facilita la adopción del equipo |
| **Configurar correo / Slack** | El equipo debe enterarse de los fallos sin tener que revisar Jenkins manualmente |

---

## Actividad Práctica

> **Ejercicio para el equipo:**
>
> 1. Si tienes acceso a una instancia de Jenkins (o instala Jenkins en Docker localmente: `docker run -p 8080:8080 jenkins/jenkins:lts`), crea un proyecto de tipo "Pipeline".
> 2. Configura el proyecto para que lea el `Jenkinsfile` desde un repositorio de GitHub.
> 3. Configura el webhook de GitHub para que Jenkins se dispare automáticamente en cada push.
> 4. Crea el `Jenkinsfile` con el Ejemplo 1 adaptado a tu proyecto.
> 5. Observa la ejecución del pipeline en la UI de Blue Ocean.
> 6. Introduce un fallo intencionado en una prueba y observa cómo el pipeline se detiene y notifica.
>
> **Bonus:** Configura un segundo stage que se ejecute solo en la rama `main` y que "despliegue" el artefacto (puede ser simplemente imprimir `echo "Desplegando versión X"`).

---

## Siguiente Paso

Con GitHub Actions y Jenkins dominados, es momento de ver cómo estas herramientas se aplican en el mundo real a través de casos de estudio de empresas reales.

➡️ Continúa con: [Tema 7 - Casos de Estudio Reales](./07-casos-de-estudio.md)
