# Tema 1: Conceptos Clave — Continuous Delivery vs. Continuous Deployment

> **Objetivo:** Establecer con precisión la diferencia entre los dos enfoques de CD. Esta distinción es esencial para tomar decisiones de arquitectura de pipelines y para comunicar correctamente las capacidades del equipo a los stakeholders del negocio.

---

## La Ambigüedad de las Siglas "CD"

En la literatura de DevOps, "CD" puede referirse a dos prácticas diferentes pero relacionadas:

1. **Continuous Delivery** — Entrega Continua
2. **Continuous Deployment** — Despliegue Continuo

Ambas extienden el pipeline de CI más allá de la validación del código, pero difieren en **quién o qué toma la última decisión de llegar a producción**.

---

## Continuous Delivery (Entrega Continua)

### Definición

> La Entrega Continua es la disciplina de ingeniería en la que el software se construye de tal manera que **puede ser desplegado a producción en cualquier momento**.

En este modelo:

1. Cada commit que pasa el pipeline de CI produce un artefacto validado.
2. Ese artefacto es desplegado automáticamente en entornos de prueba (staging, QA, UAT).
3. Se ejecutan pruebas de aceptación, smoke tests y/o pruebas de rendimiento de forma automática.
4. El artefacto queda en un estado **"listo para producción"** (release candidate).
5. **El paso final hacia producción requiere una aprobación o acción manual** — ya sea un clic de un ingeniero senior, una aprobación del Product Owner o una ventana de mantenimiento programada.

### Diagrama

```
Commit → CI Pipeline → Artefacto Validado
                              │
                              ▼
                       Staging / QA  (automático)
                              │
                              ▼
                       Pruebas de Aceptación (automático)
                              │
                              ▼
                       ✅ Listo para Producción
                              │
                         [Aprobación Manual]
                              │
                              ▼
                          Producción
```

### ¿Cuándo es el modelo correcto?

La Entrega Continua es apropiada cuando:

- La organización tiene **requisitos regulatorios o de compliance** que exigen una aprobación humana antes de cada despliegue (ej. fintech, salud, gobierno).
- El negocio necesita **coordinar lanzamientos con campañas de marketing** o comunicaciones al cliente.
- Existe un **equipo de QA dedicado** que valida manualmente aspectos funcionales críticos.
- La organización está en transición hacia CD completo y aún no tiene la cobertura de pruebas automatizadas suficiente para confiar en despliegues 100% automáticos.

---

## Continuous Deployment (Despliegue Continuo)

### Definición

> El Despliegue Continuo elimina la última barrera humana en el pipeline. **Cada commit que pasa exitosamente todas las pruebas automatizadas se despliega automáticamente a producción**, sin ninguna intervención manual.

En este modelo:

1. El desarrollador hace un commit (o se aprueba un pull request).
2. El pipeline de CI ejecuta todas las pruebas automatizadas.
3. Si todas las pruebas pasan, el pipeline de CD despliega automáticamente a producción.
4. El sistema de monitoreo valida el estado del despliegue en tiempo real.
5. Si las métricas degradan, el rollback se activa automáticamente.

### Diagrama

```
Commit → CI Pipeline → Artefacto Validado
                              │
                              ▼
                       Staging / QA  (automático)
                              │
                              ▼
                       Pruebas de Aceptación (automático)
                              │
                              ▼
                       ✅ Todas las pruebas pasaron
                              │
                    [Sin intervención humana]
                              │
                              ▼
                          Producción  (automático)
                              │
                              ▼
                       Monitoreo Post-Despliegue
```

### ¿Cuándo es el modelo correcto?

El Despliegue Continuo es apropiado cuando:

- El equipo tiene una **cobertura de pruebas automatizadas de alta calidad** que cubre los flujos críticos del negocio.
- El equipo ha implementado **feature toggles** que permiten desacoplar el despliegue del lanzamiento de una funcionalidad.
- Existe un sistema de **monitoreo y alertas** robusto que detecta regresiones inmediatamente.
- La organización tiene experiencia con **rollbacks automáticos** y confía en ellos.
- El ritmo de cambios es alto y el costo de revisiones manuales supera el beneficio de la supervisión.

---

## Comparación Directa

| Dimensión | Continuous Delivery | Continuous Deployment |
|---|---|---|
| **Intervención humana final** | Sí — aprobación requerida para ir a producción | No — el pipeline decide automáticamente |
| **Requisito de pruebas** | Alta cobertura recomendada | Alta cobertura **obligatoria** |
| **Velocidad de entrega** | Alta | Máxima |
| **Control del negocio** | El negocio controla cuándo se lanza | El negocio controla qué se despliega mediante feature toggles |
| **Riesgo percibido** | Menor (hay una red de seguridad humana) | Mayor aparentemente, menor en práctica con buena cobertura |
| **Complejidad del pipeline** | Moderada | Alta (requiere monitoreo y rollback automáticos) |
| **Adecuado para** | Regulados, enterprise tradicional, equipos en transición | SaaS, alto ritmo de cambio, madurez DevOps alta |

---

## La Distinción Crítica: Despliegue vs. Lanzamiento

Independientemente del modelo CD elegido, existe una separación de conceptos que es fundamental dominar:

> **Despliegue (Deployment):** Es el acto técnico de instalar una nueva versión del software en un servidor o clúster. Lo domina el equipo de ingeniería.
>
> **Lanzamiento (Release):** Es la decisión de negocio de hacer visible una funcionalidad a los usuarios. Lo domina el Product Owner o el equipo de negocio.

Esta separación se logra mediante **Feature Toggles** (banderas de características): el código se despliega en producción con la nueva funcionalidad desactivada. Cuando el negocio decide, activa la funcionalidad para todos los usuarios (o para un segmento) sin necesidad de un nuevo despliegue.

### Beneficio Clave

```
Sin Feature Toggles:
  Despliegue = Lanzamiento  →  Ingeniería y Negocio coordinan cada salida a producción

Con Feature Toggles:
  Despliegue ≠ Lanzamiento  →  Ingeniería despliega continuamente
                                Negocio lanza cuando el momento es correcto
```

---

## La Evolución del Pipeline: CI → Delivery → Deployment

```
┌─────────────────────────────────────────────────────────┐
│                  Integración Continua (CI)               │
│  Commit → Build → Test → Artefacto validado              │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│              Continuous Delivery (CD)                    │
│  Artefacto → Staging → Acceptance Tests → [✋ Aprobación]│
│                                             → Producción  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│             Continuous Deployment (CD)                   │
│  Artefacto → Staging → Acceptance Tests → Producción     │
│                                [automático]               │
│                            + Monitoreo + Rollback         │
└─────────────────────────────────────────────────────────┘
```

---

## Consideración para el Contexto Empresarial

> **Para el instructor:** En entornos empresariales, la conversación sobre si implementar Delivery o Deployment completo suele estar influenciada por factores de compliance, cultura organizacional y nivel de madurez de las pruebas automatizadas.
>
> La recomendación práctica: **comenzar con Continuous Delivery** como objetivo inmediato — garantizar que el código esté siempre listo para producción — y evolucionar hacia Continuous Deployment a medida que la cobertura de pruebas y la confianza del equipo crecen.
>
> Muchas organizaciones logran un híbrido efectivo: Continuous Deployment para entornos internos (dev, staging) y Continuous Delivery (con aprobación ligera) para producción.

---

## Actividad para el Equipo

> **Ejercicio de posicionamiento:**
>
> En grupos de 3 a 4 personas, respondan:
>
> 1. ¿Qué modelo describe mejor la situación actual de su organización? ¿Por qué?
> 2. ¿Qué condiciones deben cumplirse en su empresa para moverse hacia Continuous Deployment?
> 3. ¿Qué funcionalidades actuales en su producto se beneficiarían de Feature Toggles? ¿Por qué?
> 4. ¿Qué stakeholders del negocio deben estar involucrados en la decisión sobre la frecuencia de lanzamientos?

---

## Siguiente Paso

Con la distinción conceptual clara, podemos abordar el siguiente desafío: **cómo desplegar de forma segura** una vez que el pipeline lleva el artefacto hasta las puertas de producción.

➡️ Continúa con: [Tema 2 - Estrategias de Despliegue](./02-estrategias-despliegue.md)
