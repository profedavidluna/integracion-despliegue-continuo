# Tema 3: Automatización de Despliegues

> **Objetivo:** Entender los principios y patrones que rigen un pipeline de CD efectivo: cómo se construye, qué fluye por él, cómo se estructura la promoción entre entornos y qué prácticas garantizan que cada despliegue sea predecible, seguro y repetible.

---

## El Pipeline de CD: La Extensión Natural del CI

El pipeline de Integración Continua (CI) produce un **artefacto validado** — una imagen de contenedor, un JAR, un paquete npm. El pipeline de Despliegue Continuo (CD) toma ese artefacto y lo lleva, de forma segura y automatizada, hasta los usuarios en producción.

```
Pipeline CI                          Pipeline CD
─────────────────────────────────    ──────────────────────────────────────────
Commit → Build → Tests → Artifact    Artifact → Dev → Staging → [Aprobación] → Prod
                                               └─────────────────────────────────┘
                                                      Promoción de entornos
```

**Principio fundamental:** El artefacto producido por CI es **inmutable**. No se modifica entre entornos. Solo cambia la **configuración** que se le inyecta.

---

## Principio 1: Construir Una Vez, Desplegar en Cualquier Lugar

> **"Build once, deploy anywhere"** — la imagen de contenedor (o cualquier artefacto binario) se construye una única vez en CI con una versión específica. Ese mismo artefacto inmutable es el que se promueve por dev, staging y producción.

### ¿Por Qué Es Crítico?

| Sin este principio | Con este principio |
|---|---|
| La imagen se reconstruye en cada entorno | La misma imagen exacta llega a producción |
| Un bug de compilación puede aparecer solo en producción | Lo que se probó es exactamente lo que se despliega |
| No hay trazabilidad entre lo probado y lo desplegado | Trazabilidad completa: commit → imagen → entorno |
| "Funciona en staging pero no en producción" | La causa solo puede ser la configuración del entorno |

### Implementación Práctica

```
Imagen: mi-api:1.2.3-abc1234   ← Tag con versión + commit SHA

Dev:     mi-api:1.2.3-abc1234  + config/dev.env
Staging: mi-api:1.2.3-abc1234  + config/staging.env
Prod:    mi-api:1.2.3-abc1234  + config/prod.env
```

---

## Principio 2: Separación de Pipelines CI y CD

Aunque CI y CD forman una cadena continua, **mantenerlos como pipelines separados** tiene ventajas operativas importantes:

| Aspecto | CI Pipeline | CD Pipeline |
|---|---|---|
| **Disparador** | Push a rama / Pull Request | Nuevo artefacto disponible / Aprobación |
| **Responsabilidad** | Construir y validar el artefacto | Desplegar el artefacto en entornos |
| **Herramientas típicas** | GitHub Actions, Jenkins, GitLab CI | ArgoCD, Spinnaker, Octopus, AWS CodeDeploy |
| **Credenciales** | Acceso a repositorios y registros | Acceso a entornos de despliegue |
| **Frecuencia** | Cada commit | Cuando un artefacto está listo |

---

## Principio 3: Infraestructura Inmutable

> En lugar de **actualizar** el software de un servidor en producción (conectarse por SSH, ejecutar `apt-get upgrade`, modificar archivos de configuración), se **destruye el servidor antiguo** y se levanta uno nuevo con la versión actualizada.

### Comparación

```
Infraestructura Mutable (problemático)
─────────────────────────────────────
  Servidor en producción
       │
  ssh admin@servidor
       │
  apt install app==2.0
       │
  systemctl restart app
  
  Resultado: El servidor tiene historial de cambios acumulados.
             "¿Qué versión exacta corre aquí?"

Infraestructura Inmutable (correcto)
────────────────────────────────────
  Servidor v1.0 en producción
       │
  Imagen de contenedor v2.0 lista
       │
  Kubernetes: terminar pod v1.0 → iniciar pod v2.0
       │
  Servidor v2.0 en producción (idéntico al que se probó en staging)
  
  Resultado: Estado conocido y verificado. Rollback = volver a imagen v1.0.
```

---

## Principio 4: Detener la Línea (Andon Cord)

Inspirado en el **Sistema de Producción Toyota**: cada trabajador en la línea de ensamblaje tiene la autoridad de detener toda la línea de producción si detecta un defecto. Esta señal se llama **Andon**.

En CD:

> **Si el pipeline de despliegue falla, el equipo detiene el trabajo nuevo y se enfoca colectivamente en resolver el fallo.** Ningún commit adicional debe llegar a producción hasta que el pipeline esté verde.

### ¿Por Qué Es Importante?

- Garantiza que el software siempre esté en un **estado desplegable**.
- Evita la acumulación de deuda técnica de "arreglaré ese error rojo después".
- Cada fallo en el pipeline es información valiosa que debe resolverse de inmediato, no ignorarse.

### Implementación

1. **Notificaciones inmediatas:** El equipo es notificado al instante cuando el pipeline falla (Slack, Teams, email).
2. **Dashboard visible:** Un semáforo de estado del pipeline visible para todo el equipo.
3. **Bloqueo automático:** Si el pipeline de producción está en estado de fallo, las siguientes promociones están bloqueadas automáticamente.

---

## Principio 5: Promoción de Entornos (Environment Promotion)

Un artefacto validado debe recorrer una cadena de entornos antes de llegar a producción. Cada entorno representa un nivel adicional de validación:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
│   DEV    │ →  │    QA    │ →  │ STAGING  │ →  │  PRODUCCIÓN  │
│          │    │          │    │          │    │              │
│ Smoke    │    │ Pruebas  │    │ Pruebas  │    │ Monitoreo    │
│ tests    │    │ funcional│    │ de carga │    │ post-deploy  │
│          │    │ y UAT    │    │ y perf.  │    │              │
└──────────┘    └──────────┘    └──────────┘    └──────────────┘
    Auto            Auto         Auto + [✋]         Auto
```

### Reglas de Promoción

1. Un artefacto solo se promueve al siguiente entorno si **todas las pruebas del entorno actual pasaron**.
2. Las aprobaciones manuales (en Continuous Delivery) se configuran entre entornos específicos (típicamente entre staging y producción).
3. Cada entorno tiene su propia **configuración** (URLs de base de datos, secretos, variables de entorno) inyectada en tiempo de despliegue.

---

## Ejemplo: Pipeline de CD con GitHub Actions

```yaml
# .github/workflows/cd.yml
name: CD Pipeline

on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types:
      - completed
    branches:
      - main

jobs:
  deploy-dev:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: development
    steps:
      - name: Deploy to Development
        run: |
          # Desplegar la imagen etiquetada en el entorno de desarrollo
          kubectl set image deployment/mi-api \
            mi-api=mi-registro/mi-api:${{ github.sha }} \
            --namespace=development

  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/mi-api \
            mi-api=mi-registro/mi-api:${{ github.sha }} \
            --namespace=staging
      - name: Run Smoke Tests
        run: ./scripts/smoke-tests.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # ← Configurar aprobación manual aquí en GitHub
    steps:
      - name: Deploy to Production (Canary 10%)
        run: |
          kubectl set image deployment/mi-api-canary \
            mi-api=mi-registro/mi-api:${{ github.sha }} \
            --namespace=production
      - name: Monitor Canary (5 minutes)
        run: ./scripts/monitor-canary.sh 300
      - name: Promote to 100%
        run: ./scripts/promote-full.sh production
```

> **Nota:** En GitHub Actions, los `environments` con `required reviewers` configurados crean el punto de aprobación manual automáticamente, implementando Continuous Delivery sin código adicional.

---

## Ejemplo: Jenkinsfile de CD

```groovy
pipeline {
    agent any
    
    parameters {
        string(name: 'IMAGE_TAG', defaultValue: '', description: 'Tag de la imagen a desplegar')
    }
    
    stages {
        stage('Validar Parámetros') {
            steps {
                script {
                    if (!params.IMAGE_TAG) {
                        error "Se requiere el tag de la imagen"
                    }
                }
            }
        }
        
        stage('Desplegar en Dev') {
            steps {
                deployToEnvironment('development', params.IMAGE_TAG)
                runSmokeTests('development')
            }
        }
        
        stage('Desplegar en Staging') {
            steps {
                deployToEnvironment('staging', params.IMAGE_TAG)
                runAcceptanceTests('staging')
            }
        }
        
        stage('Aprobación para Producción') {
            steps {
                input message: "¿Aprobar despliegue a producción de ${params.IMAGE_TAG}?",
                      submitter: 'tech-leads,release-managers'
            }
        }
        
        stage('Desplegar en Producción') {
            steps {
                deployBlueGreen('production', params.IMAGE_TAG)
            }
        }
        
        stage('Verificar Producción') {
            steps {
                runSmokeTests('production')
                monitorMetrics('production', duration: 300)
            }
        }
    }
    
    post {
        failure {
            rollback('production')
            notifyTeam("Despliegue fallido y revertido: ${params.IMAGE_TAG}")
        }
    }
}
```

---

## Checklist de Madurez del Pipeline de CD

Evalúa el estado del pipeline de CD de tu organización:

| Práctica | ✅ Implementada | 🔄 En proceso | ❌ Pendiente |
|---|---|---|---|
| El artefacto se construye una sola vez en CI | | | |
| La misma imagen se promueve entre entornos (sin reconstruir) | | | |
| Los entornos de staging son réplicas funcionales de producción | | | |
| Smoke tests automatizados se ejecutan en cada entorno | | | |
| El pipeline notifica al equipo en caso de fallo | | | |
| Los rollbacks son automatizables con un solo comando | | | |
| La configuración por entorno se inyecta, no se hardcodea | | | |
| Los secretos se gestionan con un gestor de secretos (Vault, AWS SSM, etc.) | | | |
| El pipeline detiene las promociones si el entorno anterior falló | | | |
| Los despliegues fallidos activan rollback automático | | | |

---

## Siguiente Paso

Un pipeline de CD no opera en el vacío — requiere entornos bien definidos, consistentes y reproducibles. El siguiente tema aborda cómo gestionar esos entornos.

➡️ Continúa con: [Tema 4 - Gestión de Entornos y Versiones](./04-gestion-entornos-versiones.md)
