# Tema 6: Profundización — GitOps con ArgoCD

> **Objetivo:** Comprender el paradigma GitOps a profundidad y aprender cómo ArgoCD lo implementa para crear un sistema de CD declarativo, seguro y auditables en entornos de Kubernetes.

---

## ¿Qué Es GitOps?

> **GitOps** es un paradigma operacional donde un repositorio Git actúa como la **única fuente de la verdad** para el estado deseado de toda la infraestructura y las aplicaciones. Cualquier cambio en el sistema — código, configuración, infraestructura — se realiza primero en Git, y un agente automatizado se encarga de reconciliar el estado real con el estado declarado en Git.

El término fue acuñado por **Weaveworks** en 2017 y ha sido adoptado masivamente en la comunidad Kubernetes.

---

## Los Cuatro Principios de GitOps

| Principio | Descripción |
|---|---|
| **1. Declarativo** | El estado deseado del sistema se describe de forma declarativa (qué, no cómo) |
| **2. Versionado e inmutable** | El estado deseado se almacena en Git con historial completo y no modificable |
| **3. Pull automático** | Los agentes de software aprueban y aplican automáticamente el estado deseado |
| **4. Reconciliación continua** | Los agentes observan el estado actual y lo corrigen si diverge del estado declarado |

---

## GitOps vs. CD Tradicional (Push vs. Pull)

### Modelo Push (CD Tradicional)

```
Desarrollador
     │
     ▼
Repositorio Git
     │ (webhook)
     ▼
Pipeline CI/CD (GitHub Actions, Jenkins)
     │
     │ ← Tiene credenciales de producción
     │
     ▼
Clúster Kubernetes / Servidor de Producción
```

**Problema de seguridad:** El servidor de CI, que está expuesto a internet y recibe código de múltiples desarrolladores, tiene credenciales con acceso a producción.

### Modelo Pull (GitOps con ArgoCD)

```
Desarrollador
     │
     ▼
Repositorio Git (estado deseado)
     │
     │ (ArgoCD observa continuamente)
     │
     ▼
Clúster Kubernetes
  │
  └── ArgoCD Controller (vive dentro del clúster)
        │
        ├── Observa el repositorio Git
        ├── Compara estado Git vs. estado real del clúster
        └── Aplica cambios si hay divergencia (Pull)
```

**Ventaja de seguridad:** El servidor CI **no necesita credenciales** de producción. El clúster se actualiza a sí mismo.

---

## Arquitectura de ArgoCD

### Componentes Principales

```
┌────────────────────────────────────────────────────────┐
│                     ArgoCD                              │
│                                                          │
│  ┌─────────────────┐   ┌──────────────────────────┐   │
│  │  API Server      │   │  Application Controller  │   │
│  │  (REST/gRPC)     │   │  (reconciliation loop)   │   │
│  │  UI, CLI, CI     │   │  observa Git y clúster   │   │
│  └─────────────────┘   └──────────────────────────┘   │
│                                                          │
│  ┌─────────────────┐   ┌──────────────────────────┐   │
│  │  Repo Server    │   │  Redis (caché)            │   │
│  │  (clona repos   │   │                           │   │
│  │   y genera      │   │                           │   │
│  │   manifiestos)  │   │                           │   │
│  └─────────────────┘   └──────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Flujo de Sincronización

1. Un desarrollador hace merge de un Pull Request al repositorio de infraestructura.
2. ArgoCD detecta el cambio en el repositorio (polling o webhook).
3. ArgoCD genera los manifiestos de Kubernetes a partir del código (Helm, Kustomize, YAML).
4. ArgoCD compara el estado deseado (Git) con el estado actual (clúster).
5. Si hay diferencias, ArgoCD aplica los cambios al clúster.
6. ArgoCD reporta el estado de sincronización (Synced / OutOfSync).

---

## Repositorios en GitOps: App vs. Config

Una arquitectura GitOps bien estructurada separa los repositorios:

```
Repositorio de Aplicación          Repositorio de Infraestructura (Config)
─────────────────────────          ──────────────────────────────────────
src/                               apps/
tests/                               mi-app/
Dockerfile                             dev/
.github/workflows/                       deployment.yaml
  ci.yml                                 service.yaml
                                         configmap.yaml
  ↓ CI construye imagen              staging/
    y actualiza tag                      deployment.yaml
    en repo de config  ─────────►    production/
                                         deployment.yaml
                                         hpa.yaml
```

**¿Por qué separarlos?**

- El repositorio de infraestructura tiene su propio historial de cambios y aprobaciones.
- Los cambios de infraestructura pasan por un proceso de revisión diferente al del código.
- ArgoCD monitorea solo el repositorio de infraestructura, no el de código fuente.

---

## Flujo GitOps Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                     Flujo GitOps Completo                        │
│                                                                   │
│  1. Dev hace commit → PR en repo de aplicación                   │
│              │                                                    │
│              ▼                                                    │
│  2. CI Pipeline (GitHub Actions)                                  │
│     - Build + Tests + Security Scan                               │
│     - Construye imagen: mi-api:1.2.3-abc1234                     │
│     - Publica en Container Registry                               │
│              │                                                    │
│              ▼                                                    │
│  3. CI actualiza el tag de imagen en repo de infraestructura     │
│     (PR automático o commit directo en rama de staging)          │
│              │                                                    │
│              ▼                                                    │
│  4. ArgoCD detecta el cambio en repo de infraestructura          │
│              │                                                    │
│              ▼                                                    │
│  5. ArgoCD aplica los cambios al clúster                         │
│     - Staging: automático (SyncPolicy: automated)                │
│     - Production: requiere aprobación (SyncPolicy: manual)       │
│              │                                                    │
│              ▼                                                    │
│  6. Post-sincronización: Monitoreo confirma salud del despliegue │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuración Práctica de ArgoCD

### Instalación en Kubernetes

```bash
# Crear namespace y desplegar ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Obtener la contraseña inicial del admin
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Acceder a la UI (port-forward local)
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### Definir una Aplicación con Helm

```yaml
# application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mi-api-staging
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: "#alertas-deploy"
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: "#deploy-ok"
spec:
  project: default
  source:
    repoURL: https://github.com/mi-empresa/infraestructura
    targetRevision: main
    path: apps/mi-api/staging
    helm:
      valueFiles:
        - values-staging.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: mi-api-staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### Kustomize para Gestión de Entornos

```
infraestructura/
└── apps/
    └── mi-api/
        ├── base/                    ← Configuración común
        │   ├── deployment.yaml
        │   ├── service.yaml
        │   └── kustomization.yaml
        ├── staging/
        │   ├── kustomization.yaml   ← Sobreescribe base para staging
        │   └── patch-replicas.yaml  ← 1 réplica en staging
        └── production/
            ├── kustomization.yaml   ← Sobreescribe base para producción
            └── patch-replicas.yaml  ← 3 réplicas en producción
```

```yaml
# production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../base
patches:
  - patch-replicas.yaml
  - patch-resources.yaml
images:
  - name: mi-api
    newTag: "1.2.3-abc1234"   # ← Este valor es actualizado por el pipeline CI
```

---

## Observabilidad y Trazabilidad en GitOps

Una de las mayores ventajas de GitOps es la **auditoría completa**:

- **¿Quién cambió qué y cuándo?** → `git log` del repositorio de infraestructura.
- **¿Qué versión está en cada entorno?** → ArgoCD UI o `argocd app list`.
- **¿Cuándo se desplegó?** → Historial de sincronizaciones en ArgoCD.
- **Rollback a cualquier punto:** `git revert` + ArgoCD sincroniza automáticamente.

```bash
# Ver estado de todas las aplicaciones
argocd app list

# Ver diferencias entre estado deseado y real
argocd app diff mi-api-production

# Sincronizar manualmente (para producción con aprobación)
argocd app sync mi-api-production

# Rollback a una revisión anterior
argocd app rollback mi-api-production --revision 42
```

---

## Beneficios de GitOps en el Contexto Empresarial

| Beneficio | Impacto en el Negocio |
|---|---|
| **Auditoría completa** | Cumplimiento regulatorio (SOX, PCI-DSS, ISO 27001) con evidencia automática |
| **Seguridad mejorada** | No hay credenciales de producción en servidores CI expuestos |
| **Recuperación ante desastres** | Si el clúster falla, ArgoCD puede recrear todo el estado desde Git en minutos |
| **Consistencia garantizada** | El estado del clúster siempre converge con lo declarado en Git |
| **Reducción del error humano** | Los cambios manuales al clúster son detectados y revertidos automáticamente |
| **Onboarding más rápido** | Los nuevos ingenieros aprenden el sistema leyendo el repositorio de infraestructura |

---

## Tip para el Instructor

> **Demostración práctica:**
>
> Una demostración de alto impacto para los estudiantes es:
>
> 1. Mostrar el estado actual del clúster en la UI de ArgoCD (todo sincronizado, en verde).
> 2. Entrar directamente al clúster y **modificar manualmente** el número de réplicas con `kubectl scale`.
> 3. En segundos, ArgoCD detecta la divergencia y muestra el estado como "OutOfSync".
> 4. ArgoCD revierte automáticamente al número de réplicas declarado en Git (selfHeal).
>
> Esta demostración hace tangible la diferencia entre un sistema GitOps y uno tradicional: **el estado declarado en Git siempre gana**.

---

## Siguiente Paso

Con el pipeline de CD implementado y los despliegues automatizados, el círculo DevOps solo se cierra con un sistema de monitoreo que proporcione feedback en tiempo real.

➡️ Continúa con: [Tema 7 - Monitoreo y Feedback Loops](./07-monitoreo-feedback-loops.md)
