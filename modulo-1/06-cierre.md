# Cierre del Módulo I

> *"El valor del software no está en escribirlo, sino en entregarlo."*  
> — Mary Poppendieck, autora de *Lean Software Development*

---

## Lo Que Aprendiste

Felicitaciones por completar el Módulo I. Has construido una base sólida que te permite:

| Habilidad | Estado |
|-----------|--------|
| Explicar qué es un contenedor y su impacto en la industria | ✅ |
| Diferenciar contenedores de Máquinas Virtuales con precisión técnica | ✅ |
| Describir los mecanismos del kernel (Namespaces, Cgroups) que hacen posibles los contenedores | ✅ |
| Escribir un Dockerfile efectivo con instrucciones principales | ✅ |
| Aplicar buenas prácticas de construcción (Multi-Stage, non-root, .dockerignore) | ✅ |
| Definir un entorno multi-servicio con Docker Compose | ✅ |
| Ejecutar los comandos esenciales de Docker y Docker Compose | ✅ |
| Relacionar los conceptos técnicos con impacto empresarial real | ✅ |

---

## El Mapa del Viaje: ¿Dónde Estás?

Los contenedores son el primer piso de un edificio más alto. Aquí está la perspectiva del camino completo:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Nivel 4: SRE / Platform Engineering / GitOps           │
│     (Flujo de trabajo de Ingeniería de Confiabilidad)       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     Nivel 3: Orquestación a Escala                          │
│     (Kubernetes, Helm, Service Mesh)                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     Nivel 2: CI/CD en la Nube                               │
│     (GitHub Actions, GitLab CI, Jenkins — Próximos módulos) │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     Nivel 1: Fundamentos de Contenedores  ← TÚ ESTÁS AQUÍ  │
│     (Docker, Docker Compose)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## El Siguiente Paso Lógico: De Compose a la Nube con CI/CD

Docker Compose es ideal para un solo host (tu laptop, un servidor de desarrollo). Pero en producción empresarial aparecen preguntas que Compose no puede responder:

- ¿Cómo distribuyo los contenedores en **múltiples servidores**?
- ¿Cómo garantizo **alta disponibilidad** si un servidor falla?
- ¿Cómo **escalo automáticamente** cuando el tráfico aumenta a las 3 AM?
- ¿Cómo automatizo el proceso completo de build → pruebas → despliegue con cada cambio de código (**CI/CD**)?

Estas son exactamente las preguntas que los siguientes módulos del curso responderán.

---

## Conceptos Clave del Módulo

Antes de avanzar, asegúrate de tener claros estos términos:

| Concepto | Definición en Una Línea |
|----------|------------------------|
| **Contenedor** | Unidad estándar de software que empaqueta código + dependencias |
| **Imagen Docker** | Plantilla inmutable para crear contenedores |
| **Dockerfile** | Script declarativo que define cómo construir una imagen |
| **Docker Registry** | Repositorio centralizado de imágenes |
| **Namespace** | Mecanismo de aislamiento del kernel de Linux |
| **Cgroup** | Mecanismo de limitación de recursos del kernel de Linux |
| **Multi-Stage Build** | Técnica para separar el entorno de build del entorno de producción |
| **Infraestructura Inmutable** | Paradigma donde los componentes se reemplazan, no se modifican |
| **Docker Compose** | Herramienta para definir y gestionar aplicaciones multi-contenedor |
| **CI/CD** | Continuous Integration / Continuous Delivery — automatización del pipeline de entrega |

---

## Actividad Final del Módulo

### Desafío Integrador

Aplica todo lo aprendido en este proyecto:

**Escenario:** Tu empresa tiene una aplicación web con los siguientes componentes:
- Una API REST en Node.js (puerto 3000)
- Una base de datos PostgreSQL
- Un servicio de caché Redis

**Tareas:**
1. Escribe el `Dockerfile` para la API Node.js aplicando **todas** las buenas prácticas del módulo (multi-stage, non-root user, .dockerignore).
2. Crea el archivo `docker-compose.yml` que defina los tres servicios con:
   - Red interna para comunicación entre servicios
   - Volumen persistente para PostgreSQL
   - Variables de entorno usando un archivo `.env`
   - Healthcheck para la base de datos
   - `depends_on` con condición de salud
3. Levanta el entorno con `docker compose up -d` y verifica que todos los servicios estén corriendo.
4. Ejecuta `docker compose logs -f` para confirmar que la API puede conectarse a la base de datos.

---

## Recursos para Profundizar

| Recurso | Tipo | Enlace |
|---------|------|--------|
| Documentación oficial de Docker | Referencia | https://docs.docker.com/ |
| Play with Docker | Laboratorio online | https://labs.play-with-docker.com/ |
| Docker Best Practices | Guía oficial | https://docs.docker.com/develop/develop-images/dockerfile_best-practices/ |
| CNCF Annual Survey | Reporte de industria | https://www.cncf.io/reports/cncf-annual-survey-2023/ |
| Accelerate (libro) | Libro | Nicole Forsgren, Jez Humble, Gene Kim |
| The Phoenix Project (libro) | Novela técnica | Gene Kim, Kevin Behr, George Spafford |

---

## Hasta el Próximo Módulo

En el **Módulo II** daremos el siguiente salto: construirás tu primer **pipeline de CI/CD real** en la nube usando GitHub Actions, y aprenderás a automatizar el proceso completo desde el commit hasta el despliegue. Los contenedores que aprendiste a construir en este módulo serán el artefacto central de ese pipeline.

**Nos vemos en el Módulo II: Pipelines de CI/CD con GitHub Actions.**

---

*Módulo I completado — Integración y Despliegue Continuo con Contenedores*
