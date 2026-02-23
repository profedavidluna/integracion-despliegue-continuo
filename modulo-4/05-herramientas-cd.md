# Tema 5: Herramientas de Despliegue Continuo

> **Objetivo:** Conocer el ecosistema de herramientas de CD, entender sus diferencias fundamentales y poder seleccionar la herramienta adecuada según el contexto tecnológico y organizacional.

---

## El Ecosistema de Herramientas CD

A diferencia de las herramientas de CI (que se centran en código, compilación y pruebas), las herramientas de CD interactúan con **infraestructura, nube y orquestadores**. Su función principal es tomar el artefacto producido por CI y desplegarlo de forma segura en los entornos configurados.

```
Herramientas CI                    Herramientas CD
────────────────────               ──────────────────────────────
GitHub Actions (CI)     ─────►     ArgoCD, Spinnaker, Octopus Deploy
Jenkins (CI)            ─────►     AWS CodeDeploy, GCP Cloud Deploy
GitLab CI               ─────►     Helm + Kubernetes
                                   Azure DevOps Pipelines (Release)
```

---

## Tabla Comparativa de Herramientas CD

| Herramienta | Naturaleza | Modelo | Mejor Para |
|---|---|---|---|
| **ArgoCD** | GitOps nativa para Kubernetes | Pull | Equipos con Kubernetes y filosofía GitOps |
| **Spinnaker** | Plataforma multi-cloud (Netflix) | Push | Organizaciones con arquitecturas multi-nube complejas |
| **Octopus Deploy** | Servidor de despliegue y release management | Push | Ecosistemas Microsoft (.NET, Windows), híbridos |
| **AWS CodeDeploy** | Servicio nativo de AWS | Push | Infraestructura 100% en AWS |
| **GCP Cloud Deploy** | Servicio nativo de GCP | Push | Infraestructura 100% en Google Cloud |
| **Flux CD** | GitOps nativa para Kubernetes | Pull | Alternativa a ArgoCD en el ecosistema GitOps |
| **Harness** | Plataforma CD enterprise con IA | Push/Pull | Grandes empresas con múltiples plataformas |

---

## ArgoCD

### ¿Qué Es?

**ArgoCD** es una herramienta de Despliegue Continuo declarativa basada en el paradigma **GitOps**, diseñada específicamente para Kubernetes. Es parte de la **Cloud Native Computing Foundation (CNCF)**.

### Características Clave

| Característica | Descripción |
|---|---|
| **GitOps nativo** | Git es la única fuente de la verdad para el estado deseado del clúster |
| **Modelo Pull** | ArgoCD vive dentro del clúster y tira los cambios desde Git, no los recibe |
| **Reconciliación continua** | Detecta automáticamente si el estado del clúster diverge del estado en Git |
| **Multi-tenancy** | Gestiona múltiples aplicaciones y equipos con control de acceso granular |
| **Rollback visual** | Interfaz web que permite revertir a cualquier revisión anterior con un clic |
| **Soporte de múltiples formatos** | Helm charts, Kustomize, Jsonnet, YAML plano |

### Arquitectura

```
┌──────────────────────────────────────────────────┐
│                  Repositorio Git                  │
│   (infraestructura / manifiestos de Kubernetes)   │
└──────────────────────────────────────────────────┘
                         │
                  (ArgoCD observa)
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│                 Clúster Kubernetes                 │
│                                                    │
│   ┌──────────────────────────────────────────┐   │
│   │              ArgoCD Controller            │   │
│   │   - Monitorea el repositorio Git          │   │
│   │   - Compara estado Git vs. estado real    │   │
│   │   - Sincroniza automáticamente           │   │
│   └──────────────────────────────────────────┘   │
│                         │                          │
│                 Sincroniza (Pull)                  │
│                         │                          │
│   ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│   │  App v2  │ │  App v2  │ │     Services      │ │
│   │  Pod     │ │  Pod     │ │     Ingress       │ │
│   └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Ejemplo: Application de ArgoCD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mi-app-produccion
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/mi-empresa/infraestructura
    targetRevision: main
    path: apps/mi-app/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true      # Eliminar recursos que ya no están en Git
      selfHeal: true   # Auto-corregir divergencias del estado deseado
    syncOptions:
      - CreateNamespace=true
```

### Ventaja de Seguridad del Modelo Pull

En los modelos Push tradicionales, la herramienta de CI necesita credenciales para acceder al clúster de producción:

```
CI Server (expuesto a internet) → credenciales de producción → Clúster Producción
                                         ↑
                               RIESGO: si CI se compromete,
                               producción está expuesto
```

Con ArgoCD (modelo Pull):

```
CI Server → Publica imagen en registro de contenedores
                    │
            ArgoCD (dentro del clúster) → observa Git → sincroniza
                    
CI Server no tiene credenciales de producción. 
El clúster se actualiza a sí mismo.
```

---

## Spinnaker

### ¿Qué Es?

**Spinnaker** es una plataforma de CD open-source creada originalmente por Netflix para gestionar despliegues complejos en múltiples nubes a escala masiva. Actualmente es mantenida por la Continuous Delivery Foundation (CDF).

### Características Clave

| Característica | Descripción |
|---|---|
| **Multi-cloud** | AWS, GCP, Azure, Kubernetes, OpenStack, Oracle Cloud |
| **Pipelines visuales** | Diseño de flujos de despliegue complejos con condiciones, aprobaciones y análisis automático |
| **Canary Analysis** | Análisis automático de métricas durante un despliegue Canary (integración con Prometheus, Datadog, New Relic) |
| **Blue/Green nativo** | Soporte de primera clase para despliegues Blue-Green en AWS y Kubernetes |
| **Rollback automático** | Si las métricas degradan, Spinnaker revierte automáticamente sin intervención humana |

### Pipeline Ejemplo en Spinnaker

```
┌──────────────────────────────────────────────────────────────────┐
│              Pipeline de Producción — Spinnaker                   │
│                                                                    │
│  [Trigger: nueva imagen]                                          │
│        │                                                           │
│        ▼                                                           │
│  [Desplegar en QA]  →  [Pruebas de carga 10min]                  │
│        │                                                           │
│        ▼                                                           │
│  [Aprobación manual por Slack]                                    │
│        │                                                           │
│        ▼                                                           │
│  [Desplegar Canary 5% en Prod]                                   │
│        │                                                           │
│        ▼                                                           │
│  [Análisis automático de métricas 1 hora]                        │
│        │                                                           │
│   ┌────┴────┐                                                     │
│   │         │                                                      │
│ Métricas OK  Métricas degradan                                   │
│   │         │                                                      │
│   ▼         ▼                                                      │
│ [100%]   [Rollback automático]                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Casos de Uso Ideales

- Organizaciones con **cientos o miles de microservicios**.
- Infraestructura distribuida en **múltiples proveedores de nube**.
- Equipos que necesitan **análisis automático de Canary** con métricas de observabilidad.
- Empresas que requieren **trazabilidad completa** de qué versión está desplegada en qué cuenta y región de nube.

---

## Octopus Deploy

### ¿Qué Es?

**Octopus Deploy** es un servidor de despliegue y gestión de releases enfocado en empresas con ecosistemas tradicionales, especialmente el entorno Microsoft (.NET, Windows Server, SQL Server).

### Características Clave

| Característica | Descripción |
|---|---|
| **Interfaz amigable** | Dashboard visual intuitivo para gestión de releases, entornos y despliegues |
| **Ecosistema Microsoft** | Integración nativa con .NET, Windows Server, IIS, SQL Server, Azure DevOps |
| **Runbooks** | Automatización de tareas operativas (backups, mantenimiento) fuera del ciclo de despliegue |
| **Multi-tenancy** | Gestión de despliegues para múltiples clientes desde una sola instancia |
| **On-premise y nube** | Funciona tanto en infraestructura local como en Azure, AWS y GCP |

### Casos de Uso Ideales

- Empresas con infraestructura **híbrida** (parte en nube, parte on-premise).
- Equipos con aplicaciones **.NET** o sistemas Windows.
- Organizaciones con **múltiples clientes** (modelo SaaS multi-tenant).
- Empresas en transición que necesitan una herramienta con **curva de aprendizaje baja**.

---

## Herramientas Nativas de Nube

### AWS CodeDeploy

Servicio gestionado de AWS para automatizar despliegues en instancias EC2, servidores on-premise, funciones Lambda y contenedores ECS.

| Característica | Detalle |
|---|---|
| **Integración** | Nativa con EC2, ECS, Lambda, Auto Scaling Groups |
| **Estrategias** | Blue/Green, Rolling, In-place |
| **Configuración** | `appspec.yml` en el repositorio define el comportamiento del despliegue |

```yaml
# appspec.yml — AWS CodeDeploy
version: 0.0
os: linux
files:
  - source: /
    destination: /var/www/mi-app
hooks:
  BeforeInstall:
    - location: scripts/stop_server.sh
      timeout: 60
  AfterInstall:
    - location: scripts/install_dependencies.sh
  ApplicationStart:
    - location: scripts/start_server.sh
  ValidateService:
    - location: scripts/healthcheck.sh
      timeout: 30
```

### GCP Cloud Deploy

Servicio gestionado de Google Cloud para despliegues continuos en GKE (Kubernetes), GCE y Cloud Run.

| Característica | Detalle |
|---|---|
| **Integración** | Nativa con GKE, Cloud Run, Anthos |
| **Progresión** | Pipelines de entrega con aprobaciones y automatización |
| **Trazabilidad** | Registro completo de qué versión está en cada entorno |

---

## Guía de Selección de Herramienta CD

```
¿Tu infraestructura está en Kubernetes?
└── Sí → ¿Quieres adoptar GitOps?
           ├── Sí → ArgoCD (estándar CNCF) o Flux CD
           └── No → Helm + GitHub Actions / Jenkins
└── No → ¿Tu stack es principalmente Microsoft/.NET?
           ├── Sí → Octopus Deploy
           └── No → ¿Tienes múltiples nubes o miles de microservicios?
                     ├── Sí → Spinnaker o Harness
                     └── No → ¿Toda tu infraestructura está en AWS?
                               ├── Sí → AWS CodeDeploy + CodePipeline
                               └── No (GCP) → GCP Cloud Deploy
```

---

## Actividad Comparativa

> **Para el equipo:**
>
> Analicen el siguiente escenario y recomienden una herramienta CD con justificación:
>
> *"Una empresa de servicios financieros tiene una aplicación core en .NET Framework 4.8 corriendo en Windows Server on-premise, dos microservicios nuevos en .NET 8 desplegados en Azure Kubernetes Service (AKS), y está explorando migrar todo a la nube. El equipo tiene 12 desarrolladores y un DevOps engineer."*
>
> Preguntas:
> 1. ¿Qué herramienta(s) recomendarían para el estado actual?
> 2. ¿Qué herramienta recomendarían como objetivo a 12 meses?
> 3. ¿Qué criterios priorizaron en su decisión?

---

## Siguiente Paso

Profundizamos en ArgoCD y el paradigma GitOps, que representa el estándar moderno para CD en entornos de contenedores.

➡️ Continúa con: [Tema 6 - Profundización: GitOps con ArgoCD](./06-gitops-argocd.md)
