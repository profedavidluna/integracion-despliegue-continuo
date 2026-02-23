# Tema 2: Configuración de Pipelines — Pipeline as Code

> **Objetivo:** Entender por qué los pipelines deben definirse como código versionado en el repositorio, y aprender la anatomía de un pipeline moderno antes de profundizar en herramientas específicas.

---

## ¿Qué Es un Pipeline de CI?

Un **pipeline de CI** es la secuencia automatizada de pasos que transforma el código fuente de un repositorio en un artefacto validado y listo para ser desplegado. Cada paso del pipeline tiene un propósito específico y falla explícitamente si algo sale mal.

```
Código fuente
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                     PIPELINE DE CI                          │
│                                                             │
│  [Checkout] → [Dependencias] → [Build] → [Test] → [Empaq.] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
Artefacto validado (imagen Docker, JAR, ejecutable, etc.)
```

Cada etapa es una **puerta de calidad**: si falla, el artefacto no avanza. El equipo es notificado inmediatamente.

---

## El Problema con los Pipelines Configurados por GUI

Antes de que existiera el concepto de "Pipeline as Code", los servidores de CI (especialmente Jenkins en sus inicios) se configuraban haciendo clic en una interfaz gráfica. Esta práctica tiene defectos fundamentales:

| Problema | Consecuencia |
|----------|--------------|
| La configuración solo existe en la base de datos del servidor | Si el servidor de CI muere, se pierde la configuración del pipeline |
| No hay historial de cambios | No se puede saber quién cambió qué en el pipeline ni cuándo |
| No se puede revisar en Pull Request | Los cambios al pipeline no pasan por revisión de código |
| Difícil de replicar | Configurar el mismo pipeline en otro servidor requiere repetir manualmente todos los clics |
| Deriva de configuración | Con el tiempo, los pipelines evolucionan de forma inconsistente entre proyectos |

---

## Pipeline as Code: La Solución Moderna

**Pipeline as Code** es la práctica de definir toda la configuración del pipeline en un archivo de texto (YAML, Groovy, etc.) que se versiona junto al código fuente en el mismo repositorio.

```
mi-proyecto/
├── src/
│   └── main/...
├── tests/
│   └── ...
├── Dockerfile
├── Jenkinsfile          ← Pipeline de Jenkins (Groovy DSL)
└── .github/
    └── workflows/
        └── ci.yml       ← Workflow de GitHub Actions (YAML)
```

### Beneficios del Pipeline as Code

**1. Versionado junto al código**

El pipeline evoluciona con la aplicación. Si en un futuro el proyecto migra de Java 11 a Java 21, o de Maven a Gradle, el pipeline cambia en el mismo commit que hace ese cambio. No hay desfase.

```bash
git log --oneline .github/workflows/ci.yml
a3f1b2c  ci: migrar de Java 11 a Java 21
9d4e5f6  ci: agregar análisis de SonarQube
1c2d3e4  ci: habilitar caché de dependencias Maven
```

**2. Auditoría completa**

Cada cambio al pipeline queda registrado en Git: quién lo hizo, cuándo y por qué (mensaje de commit). Esto es crítico en entornos con auditorías de cumplimiento.

**3. Revisión de código del pipeline**

Los cambios al pipeline se proponen a través de Pull Requests, exactamente igual que los cambios al código de la aplicación. El equipo puede revisar, comentar y aprobar antes de que entren.

**4. Reproducibilidad**

Cualquier equipo puede clonar el repositorio y tener el mismo pipeline exactamente. Si el servidor de CI falla, la recuperación es trivial: se apunta el nuevo servidor al repositorio y el pipeline está listo.

**5. Consistencia entre proyectos**

Al tratar el pipeline como código, es posible crear plantillas reutilizables (templates) que todos los proyectos de la organización comparten. Los cambios globales (una nueva política de seguridad, una nueva herramienta de análisis) se aplican en un solo lugar.

---

## Anatomía de un Pipeline Moderno

Un pipeline bien diseñado sigue estas etapas, en este orden:

```
┌──────────────────────────────────────────────────────────────────┐
│  ETAPA 1: CHECKOUT                                               │
│  Descargar el código fuente del repositorio al agente/runner     │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│  ETAPA 2: RESTAURAR DEPENDENCIAS                                 │
│  Descargar librerías (Maven, npm, pip, etc.) — idealmente desde  │
│  caché para no repetir la descarga en cada ejecución             │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│  ETAPA 3: BUILD (CONSTRUCCIÓN)                                   │
│  Compilar el código fuente. Detecta errores de sintaxis y        │
│  compilación antes de ejecutar cualquier prueba                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│  ETAPA 4: PRUEBAS UNITARIAS                                      │
│  Ejecutar el conjunto de pruebas unitarias. Si falla UNA sola,  │
│  el pipeline se detiene (principio Fail Fast)                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│  ETAPA 5: ANÁLISIS DE CALIDAD                                    │
│  Cobertura de código, análisis estático (SonarQube, ESLint,     │
│  Checkstyle), verificación de vulnerabilidades de dependencias   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│  ETAPA 6: EMPAQUETADO (PACKAGING)                                │
│  Construir el artefacto final: imagen Docker, archivo JAR/WAR,  │
│  bundle de frontend, ejecutable, etc.                            │
└──────────────────────────────────────────────────────────────────┘
```

> **Nota:** No todos los proyectos necesitan todas estas etapas en el pipeline de CI. El criterio es: **¿esta etapa da información valiosa rápidamente?** Las etapas lentas (pruebas de integración, pruebas E2E) se mueven a pipelines separados que se ejecutan con menos frecuencia.

---

## Pipelines Paralelos vs. Secuenciales

Un pipeline no tiene que ser completamente lineal. Los pasos independientes pueden ejecutarse en paralelo para reducir el tiempo total de feedback.

**Pipeline secuencial (más simple, más lento):**
```
[Build] → [Test JS] → [Test Python] → [Análisis] → [Docker] 
Total: 4 + 8 + 6 + 5 + 3 = 26 minutos
```

**Pipeline con paralelismo (más complejo, más rápido):**
```
           ┌─► [Test JS]  (8 min) ─┐
[Build] ──►│                       ├─► [Análisis] → [Docker]
           └─► [Test Python](6 min)┘
Total: 4 + 8 + 5 + 3 = 20 minutos (ahorro de 6 minutos en cada ejecución)
```

Cuando el equipo hace docenas de commits al día, ahorrar 6 minutos por ejecución puede traducirse en horas de tiempo de máquina y feedback más rápido.

---

## Las Herramientas y Sus Archivos de Pipeline

| Herramienta | Archivo de Pipeline | Lenguaje de Configuración | Ubicación |
|-------------|--------------------|-----------------------------|-----------|
| GitHub Actions | `ci.yml` (nombre libre) | YAML | `.github/workflows/` |
| Jenkins | `Jenkinsfile` | Groovy DSL | Raíz del repositorio |
| GitLab CI | `.gitlab-ci.yml` | YAML | Raíz del repositorio |
| CircleCI | `config.yml` | YAML | `.circleci/` |
| Azure Pipelines | `azure-pipelines.yml` | YAML | Raíz o ubicación personalizada |

---

## Actividad Práctica

> **Ejercicio mental para el equipo:** Toma un proyecto actual de tu organización y responde:
>
> 1. ¿Cuántas etapas tendría su pipeline de CI ideal?
> 2. ¿Qué etapas podrían ejecutarse en paralelo?
> 3. ¿Qué etapas son demasiado lentas para el pipeline principal y deberían moverse a un pipeline nocturno?
>
> Diseña el diagrama del pipeline antes de escribir una sola línea de configuración. El diseño del pipeline es una decisión de arquitectura.

---

## Siguiente Paso

Con la arquitectura del pipeline clara, el siguiente paso es el corazón del mismo: automatizar el build y las pruebas.

➡️ Continúa con: [Tema 3 - Automatización de Builds y Pruebas Unitarias](./03-automatizacion-builds-pruebas.md)
