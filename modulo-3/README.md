# Módulo III: Implementación de Integración Continua

## Descripción General

Este módulo lleva la Integración Continua (CI) del concepto a la práctica. Construye directamente sobre los fundamentos de CI/CD vistos en el Módulo II y los aplica con profundidad técnica usando las dos herramientas más relevantes de la industria: **GitHub Actions** y **Jenkins**. Al finalizar, habrás configurado pipelines reales, automatizado builds y pruebas, y adoptado las buenas prácticas que distinguen a los equipos de clase mundial.

---

## Objetivos de Aprendizaje

Al completar este módulo, el estudiante será capaz de:

- Configurar la integración entre un servidor de CI y un repositorio Git usando **webhooks** y **polling**.
- Aplicar **Branch Policies** para proteger ramas principales y hacer cumplir el pipeline.
- Construir pipelines completos usando **Pipeline as Code** (`Jenkinsfile` y `.github/workflows/*.yml`).
- Automatizar el ciclo de **build, pruebas unitarias y métricas de cobertura** de código.
- Implementar pipelines paralelos y condicionales en GitHub Actions y Jenkins.
- Gestionar secretos y credenciales de forma segura en ambas herramientas.
- Aplicar las mejores prácticas del mundo real: Trunk-Based Development, Fail Fast, Construir Una Vez.
- Analizar casos de estudio reales para identificar patrones replicables en su organización.

---

## Estructura del Módulo

| # | Tema | Archivo |
|---|------|---------|
| 0 | Introducción: Estadísticas de Impacto de CI | [00-introduccion.md](./00-introduccion.md) |
| 1 | Integración con Repositorios de Código (Git) | [01-integracion-repositorios.md](./01-integracion-repositorios.md) |
| 2 | Configuración de Pipelines (Pipeline as Code) | [02-configuracion-pipelines.md](./02-configuracion-pipelines.md) |
| 3 | Automatización de Builds y Pruebas Unitarias | [03-automatizacion-builds-pruebas.md](./03-automatizacion-builds-pruebas.md) |
| 4 | Mejores Prácticas en Integración Continua | [04-mejores-practicas.md](./04-mejores-practicas.md) |
| 5 | Profundización: GitHub Actions | [05-github-actions.md](./05-github-actions.md) |
| 6 | Profundización: Jenkins | [06-jenkins.md](./06-jenkins.md) |
| 7 | Casos de Estudio Reales | [07-casos-de-estudio.md](./07-casos-de-estudio.md) |
| 8 | Cierre del Módulo | [08-cierre.md](./08-cierre.md) |

---

## Recursos Adicionales

- [Documentación oficial de GitHub Actions](https://docs.github.com/es/actions)
- [Documentación oficial de Jenkins](https://www.jenkins.io/doc/)
- [Marketplace de GitHub Actions](https://github.com/marketplace?type=actions)
- [Plugins de Jenkins](https://plugins.jenkins.io/)
- [DORA State of DevOps Report](https://dora.dev/research/)
- [Accelerate — Forsgren, Humble y Kim](https://itrevolution.com/product/accelerate/)
- [Continuous Delivery — Jez Humble y David Farley](https://continuousdelivery.com/)

---

## Requisitos Previos

- Haber completado el **Módulo I** (Fundamentos de Contenedores, Docker y Docker Compose).
- Haber completado el **Módulo II** (Fundamentos de CI/CD y DevOps).
- Tener una cuenta de **GitHub** activa.
- Tener **Docker Desktop** instalado ([guía de instalación](https://docs.docker.com/get-docker/)).
- Familiaridad básica con al menos un gestor de dependencias (Maven, npm, pip, etc.).
