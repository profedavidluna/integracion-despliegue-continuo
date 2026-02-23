# Tema 4: Configuración del Entorno

> *"La entrega continua es imposible si los entornos se configuran a mano."*  
> — Jez Humble y David Farley, *Continuous Delivery*

---

## El Problema: La Deriva de Configuración (Configuration Drift)

Imagina este escenario clásico:

1. El equipo de Ops configura el servidor de producción manualmente hace 18 meses.
2. Se instalan parches de seguridad, se ajustan archivos de configuración, se añaden dependencias de urgencia.
3. Nadie documenta los cambios.
4. Hoy, el servidor de producción es **diferente** al de staging, que es diferente al de desarrollo.
5. El código que pasa todas las pruebas en staging falla misteriosamente en producción.

Este fenómeno se llama **Configuration Drift** (deriva de configuración) y es uno de los mayores enemigos del delivery confiable.

```
Estado inicial (todos iguales):        Estado después de 18 meses:
   Dev  = Staging = Prod               Dev  ≠ Staging ≠ Prod
   ✅ Confiable                        ❌ "Funciona en staging pero no en prod"
```

**La solución:** Gestionar la infraestructura exactamente igual que el código fuente — con control de versiones, revisiones de pares y procesos automatizados.

---

## 4.1 Infraestructura como Código (IaC — Infrastructure as Code)

### Definición

IaC es la práctica de **definir y gestionar la infraestructura** (servidores, redes, bases de datos, reglas de firewall, etc.) utilizando **archivos de configuración declarativos** en lugar de configuraciones manuales mediante clics en una consola o comandos ad-hoc.

```
❌ Enfoque tradicional (manual):
   Ops → Consola de AWS → Hacer clic en "Lanzar instancia" → Configurar manualmente
   Resultado: proceso no reproducible, no versionado, propenso a errores humanos

✅ IaC:
   Desarrollador → archivo main.tf → git commit → pipeline aplica la infraestructura
   Resultado: proceso reproducible, versionado, revisable, idempotente
```

### Beneficios Clave

| Beneficio | Impacto |
|-----------|---------|
| **Reproducibilidad** | El mismo archivo crea el mismo entorno en Dev, Staging y Prod |
| **Versionabilidad** | Cada cambio de infraestructura tiene historial en Git |
| **Auditabilidad** | Saber exactamente qué cambió, cuándo y quién lo aprobó |
| **Velocidad** | Crear un entorno completo en minutos, no días |
| **Entornos efímeros** | Crear y destruir entornos para pruebas, sin costo permanente |
| **Disaster Recovery** | Recrear toda la infraestructura desde cero en minutos |

### Herramientas Principales de IaC

| Herramienta | Empresa | Tipo | Fortaleza |
|-------------|---------|------|-----------|
| **Terraform** | HashiCorp | Declarativo, Multi-cloud | Estándar de la industria; funciona con AWS, Azure, GCP y más de 3,000 proveedores |
| **AWS CloudFormation** | Amazon | Declarativo, AWS-only | Integración nativa con todos los servicios de AWS |
| **Azure Bicep / ARM** | Microsoft | Declarativo, Azure-only | Integración nativa con Azure |
| **Ansible** | Red Hat | Imperativo / Agentless | Configuración de sistemas operativos y aplicaciones; no requiere agente |
| **Pulumi** | Pulumi Corp | Multi-cloud, multi-lenguaje | Permite escribir IaC en Python, TypeScript, Go, etc. |

### Ejemplo Básico: Terraform

```hcl
# main.tf — Define un servidor en AWS con Terraform

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Definición del servidor de aplicación
resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
  instance_type = "t3.micro"

  tags = {
    Name        = "app-server-staging"
    Environment = "staging"
    ManagedBy   = "Terraform"
  }
}
```

Con `terraform apply`, este archivo crea el servidor automáticamente. Con `terraform destroy`, lo elimina. Si modificas el archivo y vuelves a aplicar, Terraform calcula exactamente qué necesita cambiar y aplica solo esa diferencia.

---

## 4.2 Paridad entre Entornos

### El Objetivo: Dev = Staging = Producción

Uno de los principios fundamentales de la entrega continua (Principio #10 de la metodología 12-Factor App) es mantener los entornos de desarrollo, staging y producción lo más **idénticos posible**:

```
┌─────────────────────────────────────────────────────────────┐
│                   ENTORNOS IDÉNTICOS                        │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │   DEV    │ == │ STAGING  │ == │     PRODUCCIÓN       │  │
│  │          │    │          │    │                      │  │
│  │ App v1.2 │    │ App v1.2 │    │ App v1.2             │  │
│  │ Node 20  │    │ Node 20  │    │ Node 20              │  │
│  │ PG 15.3  │    │ PG 15.3  │    │ PG 15.3              │  │
│  └──────────┘    └──────────┘    └──────────────────────┘  │
│                                                             │
│  Si funciona en Dev, funcionará en Producción. ✅           │
└─────────────────────────────────────────────────────────────┘
```

### Cómo Lograr la Paridad: Docker

Los contenedores que aprendiste en el **Módulo I** son los héroes de la paridad de entornos:

- El desarrollador ejecuta la aplicación localmente en un contenedor con exactamente **la misma imagen base** que correrá en producción.
- La imagen Docker se construye una sola vez en el pipeline de CI y se usa en todos los entornos posteriores.
- No hay diferencias de sistema operativo, versiones de runtime ni dependencias del sistema.

```
Pipeline de CI/CD con paridad garantizada:
                                            ┌─── Staging  ───┐
Código → Build → Imagen Docker ────────────├─── Testing  ───┤
                 (una sola imagen)          └─── Producción ─┘
                                               (misma imagen)
```

### Variables de Entorno para Diferenciar Comportamientos

La única diferencia legítima entre entornos son las **configuraciones** (URLs de bases de datos, credenciales, flags de debug). Estas no deben estar en el código ni en la imagen Docker, sino inyectadas como variables de entorno:

```bash
# Desarrollo (docker-compose.yml)
DB_URL=postgresql://localhost:5432/app_dev
LOG_LEVEL=debug

# Producción (secrets del sistema de orquestación)
DB_URL=postgresql://prod-db.empresa.com:5432/app_prod
LOG_LEVEL=warn
```

---

## 4.3 Control de Versiones para TODO

En DevOps, el repositorio Git actúa como la **única fuente de la verdad** para todo lo que define el sistema:

```
Repositorio Git (La única fuente de la verdad)
├── src/                          ← Código fuente de la aplicación
├── tests/                        ← Pruebas automatizadas
├── Dockerfile                    ← Definición de la imagen del contenedor
├── docker-compose.yml            ← Definición del entorno local
├── .github/workflows/ci-cd.yml  ← Definición del pipeline CI/CD
├── terraform/                    ← Definición de la infraestructura (IaC)
│   ├── main.tf
│   └── variables.tf
├── k8s/                          ← Manifiestos de Kubernetes
│   ├── deployment.yaml
│   └── service.yaml
└── scripts/                      ← Scripts de base de datos, migraciones
    └── migrations/
```

### GitOps: Llevando el Control de Versiones al Extremo

**GitOps** es una práctica avanzada donde el estado deseado de toda la infraestructura y las aplicaciones se define en un repositorio Git. Un agente automatizado (como ArgoCD o Flux) detecta cambios en el repositorio y los aplica automáticamente al clúster.

```
Desarrollador → git push → Repositorio Git → AgentGitOps → Clúster Kubernetes
                                               (ArgoCD/Flux)  (aplica el estado deseado)
```

**Ventaja clave:** Para hacer un rollback, simplemente haces `git revert` al commit anterior. La infraestructura retrocede automáticamente.

---

## Reflexión

> **Ejercicio:** Revisa tu proyecto actual y lista qué elementos **no están** en control de versiones. ¿Hay configuraciones de servidores que solo existen en la mente de alguien del equipo? ¿Scripts que están "solo en el servidor"? Esta lista es tu deuda técnica de IaC.

---

## Siguiente Paso

Ahora veremos cómo empresas reales aplicaron estos principios para transformar sus operaciones.

➡️ Continúa con: [Tema 5 - Casos de Estudio Reales](./05-casos-de-estudio.md)
