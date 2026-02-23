# Integración y Despliegue Continuo con Contenedores

Curso empresarial sobre Integración y Despliegue Continuo (CI/CD) utilizando contenedores como unidad estándar de entrega de software.

## Estructura del Curso

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| [Módulo I](./modulo-1/README.md) | Fundamentos de Contenedores, Docker y Docker Compose | ✅ Disponible |
| [Módulo II](./modulo-2/README.md) | Fundamentos de CI/CD y DevOps | ✅ Disponible |
| [Módulo III](./modulo-3/README.md) | Implementación de Integración Continua | ✅ Disponible |

## Módulo I: Integración y Despliegue Continuo con Contenedores

Cubre desde la justificación de negocio hasta la práctica técnica:

- **Introducción:** El impacto de los contenedores en el mercado (estadísticas de industria)
- **Tema 1:** Fundamentos de contenedores — qué son, cómo funcionan, cómo se diferencian de las VMs
- **Tema 2:** Construcción de aplicaciones con Docker — Dockerfile, Multi-Stage Builds, buenas prácticas
- **Tema 3:** Orquestación local con Docker Compose — entornos multi-servicio
- **Casos de Estudio:** American Airlines, Netflix, Etsy y más
- **Referencia de Comandos:** Cheatsheet completo de Docker y Docker Compose

➡️ [Ir al Módulo I](./modulo-1/README.md)

## Módulo II: Fundamentos de CI/CD y DevOps

Construye sobre los contenedores del Módulo I para enseñar la capa cultural y de automatización:

- **Introducción:** El valor de negocio de DevOps — estadísticas DORA (velocidad, estabilidad, recuperación)
- **Tema 1:** Visión general de DevOps — el muro de la confusión, los Tres Caminos, el modelo CALMS
- **Tema 2:** Fundamentos de CI/CD — integración continua, entrega continua vs. despliegue continuo, Shift-Left
- **Tema 3:** Profundización en CI — Jenkins, GitHub Actions, buenas prácticas (TBD, Fail Fast, Pipeline as Code)
- **Tema 4:** Configuración del entorno — Infraestructura como Código, paridad Dev/Prod, GitOps
- **Casos de Estudio:** HP LaserJet, Flickr/Yahoo, Target y Netflix
- **Recursos:** Libros, cursos, videos, artículos, herramientas y comunidades

➡️ [Ir al Módulo II](./modulo-2/README.md)

## Módulo III: Implementación de Integración Continua

Lleva la CI del concepto a la práctica con GitHub Actions y Jenkins:

- **Introducción:** Impacto de CI — estadísticas DORA, Google a escala, el costo de no tener CI
- **Tema 1:** Integración con repositorios — webhooks vs. polling, Branch Policies, GitHub Flow
- **Tema 2:** Pipeline as Code — anatomía de un pipeline, beneficios del versionado, paralelismo
- **Tema 3:** Automatización de builds y pruebas — feedback rápido, Fail Fast, cobertura de código (JaCoCo)
- **Tema 4:** Mejores prácticas — cordón de Andon, Trunk-Based Development, Construir Una Vez
- **Tema 5:** GitHub Actions en profundidad — workflows YAML, Docker CI/CD, matrices de pruebas, secretos
- **Tema 6:** Jenkins en profundidad — arquitectura Controller/Agent, Jenkinsfile declarativo, plugins esenciales
- **Tema 7:** Casos de estudio — HP LaserJet (42x), Bazaarvoice, Google (75M pruebas/día), Etsy (50 deploys/día)

➡️ [Ir al Módulo III](./modulo-3/README.md)

## Requisitos Previos

- Conocimiento básico de línea de comandos
- Familiaridad con al menos un lenguaje de programación
- [Docker Desktop](https://docs.docker.com/get-docker/) instalado
