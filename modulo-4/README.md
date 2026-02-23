# Módulo IV: Implementación de Despliegue Continuo

## Descripción General

Este módulo lleva el Despliegue Continuo (CD) del concepto a la práctica. Construye directamente sobre los fundamentos de CI/CD vistos en los módulos anteriores y los extiende hacia la entrega segura, automatizada y confiable del software en producción. Al finalizar, habrás comprendido las estrategias de despliegue de nivel empresarial, configurado pipelines de CD con herramientas modernas, aplicado principios de GitOps y diseñado loops de feedback que cierran el ciclo DevOps.

---

## Objetivos de Aprendizaje

Al completar este módulo, el estudiante será capaz de:

- Distinguir con precisión entre **Continuous Delivery** y **Continuous Deployment**, y seleccionar el enfoque adecuado según el contexto empresarial.
- Diseñar e implementar estrategias de despliegue sin tiempo de inactividad: **Blue-Green**, **Canary**, **Rolling Updates** y **Feature Toggles**.
- Construir pipelines de CD automatizados que promuevan artefactos inmutables entre entornos (dev → staging → producción).
- Gestionar entornos de forma reproducible utilizando principios de **Infraestructura como Código (IaC)**.
- Evaluar y seleccionar herramientas de CD: **ArgoCD**, **Spinnaker**, **Octopus Deploy** y servicios nativos de nube.
- Implementar el paradigma **GitOps** con ArgoCD para despliegues seguros y auditables en Kubernetes.
- Diseñar **loops de monitoreo y feedback** que detecten regresiones y activen rollbacks automáticos.
- Analizar casos de estudio empresariales reales para identificar patrones replicables.

---

## Estructura del Módulo

| # | Tema | Archivo |
|---|------|---------|
| 0 | Introducción: El Impacto del Despliegue Continuo | [00-introduccion.md](./00-introduccion.md) |
| 1 | Conceptos Clave: Delivery vs. Deployment | [01-conceptos-delivery-vs-deployment.md](./01-conceptos-delivery-vs-deployment.md) |
| 2 | Estrategias de Despliegue (Reducción de Riesgo) | [02-estrategias-despliegue.md](./02-estrategias-despliegue.md) |
| 3 | Automatización de Despliegues | [03-automatizacion-despliegues.md](./03-automatizacion-despliegues.md) |
| 4 | Gestión de Entornos y Versiones | [04-gestion-entornos-versiones.md](./04-gestion-entornos-versiones.md) |
| 5 | Herramientas de CD: ArgoCD, Spinnaker, Octopus y más | [05-herramientas-cd.md](./05-herramientas-cd.md) |
| 6 | Profundización: GitOps con ArgoCD | [06-gitops-argocd.md](./06-gitops-argocd.md) |
| 7 | Monitoreo y Feedback Loops | [07-monitoreo-feedback-loops.md](./07-monitoreo-feedback-loops.md) |
| 8 | Casos de Estudio Reales | [08-casos-de-estudio.md](./08-casos-de-estudio.md) |
| 9 | Cierre del Módulo | [09-cierre.md](./09-cierre.md) |

---

## Recursos Adicionales

- [DORA State of DevOps Report](https://dora.dev/research/)
- [Documentación oficial de ArgoCD](https://argo-cd.readthedocs.io/)
- [Documentación oficial de Spinnaker](https://spinnaker.io/docs/)
- [Documentación de Octopus Deploy](https://octopus.com/docs)
- [AWS CodeDeploy](https://docs.aws.amazon.com/codedeploy/)
- [Google Cloud Deploy](https://cloud.google.com/deploy/docs)
- [Accelerate — Forsgren, Humble y Kim](https://itrevolution.com/product/accelerate/)
- [Continuous Delivery — Jez Humble y David Farley](https://continuousdelivery.com/)
- [The DevOps Handbook — Gene Kim et al.](https://itrevolution.com/product/the-devops-handbook/)
- [GitOps — Weaveworks](https://www.weave.works/technologies/gitops/)

---

## Requisitos Previos

- Haber completado el **Módulo I** (Fundamentos de Contenedores, Docker y Docker Compose).
- Haber completado el **Módulo II** (Fundamentos de CI/CD y DevOps).
- Haber completado el **Módulo III** (Implementación de Integración Continua).
- Familiaridad básica con **Git** y control de versiones.
- Nociones básicas de **Kubernetes** son útiles pero no estrictamente requeridas.
