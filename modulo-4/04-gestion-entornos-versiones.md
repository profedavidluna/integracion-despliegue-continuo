# Tema 4: Gestión de Entornos y Versiones

> **Objetivo:** Aprender a gestionar entornos de desarrollo, staging y producción de forma consistente, reproducible y automatizada. Un pipeline de CD es tan confiable como los entornos sobre los que opera.

---

## El Problema de la Inconsistencia de Entornos

Una de las causas más comunes de fallos en producción que no aparecen en staging es la **inconsistencia entre entornos**:

| Síntoma | Causa Raíz |
|---|---|
| "Funciona en mi máquina" | El entorno del desarrollador difiere del servidor |
| "Pasó en staging pero falló en producción" | Staging no es una réplica fiel de producción |
| "No sabemos qué versión exacta tenemos en el servidor" | Sin control de versiones del entorno |
| "El despliegue falla porque falta una dependencia" | Configuración manual no documentada |

La solución estructural a estos problemas es la **Infraestructura como Código**.

---

## Infraestructura como Código (IaC)

### Definición

> La **Infraestructura como Código (IaC)** es la práctica de gestionar y aprovisionar la infraestructura (servidores, redes, bases de datos, configuraciones) mediante archivos de código versionados en un repositorio Git, en lugar de hacerlo manualmente a través de interfaces gráficas o comandos ad hoc.

### Principios Fundamentales

1. **Todo en código:** La infraestructura es código. Se escribe, se revisa, se versiona y se audita como cualquier otro código.
2. **Idempotencia:** Ejecutar el mismo código de IaC múltiples veces produce el mismo resultado. No importa si el entorno existía o no.
3. **Reproducibilidad:** A partir del código en Git, cualquier entorno puede ser recreado exactamente en cualquier momento.
4. **Entornos desechables:** Un entorno puede destruirse y recrearse en minutos con la garantía de que será idéntico al original.

---

## Herramientas de IaC

### Terraform

**Terraform** (HashiCorp) es la herramienta de IaC más adoptada para el aprovisionamiento de infraestructura en la nube.

```hcl
# Ejemplo: Definición de un clúster EKS en AWS con Terraform
resource "aws_eks_cluster" "produccion" {
  name     = "mi-app-produccion"
  role_arn = aws_iam_role.eks.arn
  version  = "1.28"

  vpc_config {
    subnet_ids = aws_subnet.privadas[*].id
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

| Característica | Descripción |
|---|---|
| **Lenguaje** | HCL (HashiCorp Configuration Language) |
| **Modelo** | Declarativo — describes el estado deseado, Terraform calcula los cambios |
| **Proveedores** | AWS, GCP, Azure, Kubernetes y más de 3,000 proveedores |
| **Estado** | Mantiene un archivo de estado (`terraform.tfstate`) que representa la realidad actual |
| **Workflow** | `terraform plan` (preview de cambios) → `terraform apply` (aplicar) |

### Ansible

**Ansible** se especializa en la **configuración** de servidores existentes (instalación de software, configuración de servicios, gestión de usuarios).

```yaml
# Ejemplo: Playbook Ansible para configurar un servidor web
- name: Configurar servidor web
  hosts: webservers
  become: yes
  tasks:
    - name: Instalar nginx
      apt:
        name: nginx
        state: present
        update_cache: yes
    
    - name: Copiar configuración
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart nginx
    
    - name: Habilitar y arrancar nginx
      systemd:
        name: nginx
        enabled: yes
        state: started
  
  handlers:
    - name: Restart nginx
      systemd:
        name: nginx
        state: restarted
```

### Comparación de Herramientas IaC

| Herramienta | Tipo | Mejor Para | Modelo |
|---|---|---|---|
| **Terraform** | Aprovisionamiento | Crear/destruir infraestructura en la nube | Declarativo |
| **Ansible** | Configuración | Configurar servidores y aplicaciones | Imperativo/Declarativo |
| **Pulumi** | Aprovisionamiento | IaC con lenguajes de programación reales (Python, TypeScript) | Declarativo |
| **AWS CloudFormation** | Aprovisionamiento | Infraestructura 100% en AWS | Declarativo |
| **Helm** | Configuración | Gestión de aplicaciones en Kubernetes | Declarativo (templates) |

---

## Gestión de Configuración por Entorno

Cada entorno (dev, staging, producción) tiene su propia configuración. El principio es:

> **El código es idéntico entre entornos. La configuración es diferente.**

### Patrones de Inyección de Configuración

#### 1. Variables de Entorno

```bash
# .env.dev
DATABASE_URL=postgresql://dev-db:5432/mi_app
REDIS_URL=redis://dev-cache:6379
LOG_LEVEL=debug
FEATURE_NUEVO_CHECKOUT=false

# .env.prod
DATABASE_URL=postgresql://prod-db-cluster:5432/mi_app
REDIS_URL=redis://prod-cache-cluster:6379
LOG_LEVEL=warning
FEATURE_NUEVO_CHECKOUT=true
```

#### 2. ConfigMaps y Secrets en Kubernetes

```yaml
# ConfigMap por entorno (no sensible)
apiVersion: v1
kind: ConfigMap
metadata:
  name: mi-app-config
  namespace: production
data:
  DATABASE_HOST: "prod-db-cluster"
  LOG_LEVEL: "warning"
  CACHE_TTL: "3600"

---
# Secret (datos sensibles — nunca en Git directamente)
apiVersion: v1
kind: Secret
metadata:
  name: mi-app-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: ""  # Inyectado por el sistema de secretos
  API_KEY: ""            # Gestionado por AWS Secrets Manager / HashiCorp Vault
```

#### 3. Gestores de Secretos

Los secretos (contraseñas, claves API, certificados) **nunca deben estar en el repositorio Git**. Se gestionan con herramientas especializadas:

| Herramienta | Proveedor | Descripción |
|---|---|---|
| **HashiCorp Vault** | Open-source / Enterprise | Gestor de secretos centralizado con rotación automática |
| **AWS Secrets Manager** | Amazon Web Services | Secretos integrados con servicios AWS |
| **Azure Key Vault** | Microsoft Azure | Gestión de secretos, claves y certificados en Azure |
| **Google Secret Manager** | Google Cloud | Gestión de secretos en GCP |
| **External Secrets Operator** | Kubernetes | Sincroniza secretos desde sistemas externos a Kubernetes |

---

## Gestión de Versiones

### Semver (Semantic Versioning)

El estándar **Semantic Versioning** define un formato de versión `MAJOR.MINOR.PATCH`:

| Componente | Significado | Cuándo incrementar |
|---|---|---|
| **MAJOR** | Cambio incompatible con versiones anteriores | Cambios que rompen la API o contratos existentes |
| **MINOR** | Nueva funcionalidad compatible | Nuevas features sin romper compatibilidad |
| **PATCH** | Corrección de errores | Bug fixes, mejoras de seguridad |

```
1.0.0   → Primer release estable
1.1.0   → Nueva funcionalidad añadida
1.1.1   → Bug fix
2.0.0   → Cambio que rompe compatibilidad (breaking change)
```

### Etiquetado de Artefactos en CD

```
Convención recomendada para imágenes de contenedor:

mi-api:1.2.3           ← Tag de versión semver (para producción)
mi-api:1.2.3-abc1234   ← Versión + commit SHA (para trazabilidad)
mi-api:latest          ← Última versión (NO usar en producción — impredecible)
mi-api:main-abc1234    ← Rama + commit SHA (para entornos de dev/staging)
```

> **Regla de oro:** En producción, **nunca usar el tag `latest`**. Siempre referenciar una versión específica e inmutable. `latest` apunta a una imagen diferente cada vez que se construye una nueva versión, eliminando la reproducibilidad.

### Control de Versiones del Pipeline

El código del pipeline (`.github/workflows/*.yml`, `Jenkinsfile`, archivos de Terraform, Helm charts) debe estar en el mismo repositorio que el código de la aplicación — o en un repositorio de infraestructura dedicado — y gestionarse con las mismas prácticas de revisión de código (Pull Requests, aprobaciones).

---

## Entornos como Código: El Flujo Completo

```
Repositorio Git
├── src/                     ← Código de la aplicación
├── tests/                   ← Suite de pruebas
├── Dockerfile               ← Definición del contenedor
├── .github/workflows/
│   ├── ci.yml               ← Pipeline de CI
│   └── cd.yml               ← Pipeline de CD
├── infrastructure/
│   ├── terraform/
│   │   ├── dev/             ← Infraestructura del entorno de desarrollo
│   │   ├── staging/         ← Infraestructura del entorno de staging
│   │   └── production/      ← Infraestructura del entorno de producción
│   └── helm/
│       └── mi-app/          ← Helm chart de la aplicación
└── config/
    ├── dev.env              ← Configuración no sensible por entorno
    ├── staging.env
    └── production.env
```

---

## Actividad Práctica

> **Análisis de madurez de gestión de entornos:**
>
> Evalúa la situación actual de tu organización respondiendo:
>
> 1. ¿Cómo se crean actualmente los entornos de staging y producción? ¿Manualmente o con código?
> 2. ¿Qué herramienta de IaC utilizan o podrían utilizar?
> 3. ¿Cómo se gestionan los secretos actualmente? ¿Están seguros? ¿Rotan automáticamente?
> 4. ¿Cuánto tardaría recrear el entorno de producción desde cero si fuera necesario? ¿Días, horas o minutos?
> 5. ¿El pipeline de CD versiona y controla los cambios de infraestructura con el mismo rigor que el código?

---

## Siguiente Paso

Con los principios de entornos claros, el siguiente tema explora las herramientas especializadas de CD que implementan todo lo anterior.

➡️ Continúa con: [Tema 5 - Herramientas de CD](./05-herramientas-cd.md)
