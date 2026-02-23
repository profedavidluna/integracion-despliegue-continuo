# Tema 2: Estrategias de Despliegue — Reducción de Riesgo en Producción

> **Objetivo:** Dominar las estrategias que permiten desplegar software en producción con cero tiempo de inactividad, bajo riesgo y capacidad de reversión inmediata. Desplegar en producción no debe ser un evento temido — debe ser una operación rutinaria y controlada.

---

## El Problema: El Riesgo del Despliegue Tradicional

Un despliegue tradicional (detener el sistema, actualizar, reiniciar) presenta un patrón de riesgo previsible:

```
Sistema v1 en producción
        │
  [Apagado del servicio]  ← Tiempo de inactividad
        │
  [Instalación de v2]     ← Posible fallo
        │
  [Inicio del servicio]
        │
  Sistema v2 en producción — o sistema caído si algo falló
```

Este modelo tiene tres problemas críticos:
1. **Tiempo de inactividad obligatorio** durante la transición.
2. **Rollback costoso:** volver a v1 requiere otro ciclo de apagado e instalación.
3. **Sin gradualidad:** el 100% de los usuarios experimenta el cambio simultáneamente.

Las estrategias modernas resuelven los tres problemas.

---

## Estrategia 1: Blue-Green Deployment (Despliegue Azul-Verde)

### Concepto

Se mantienen **dos entornos de producción idénticos** en paralelo:
- El entorno **Azul (Blue):** la versión actual en producción, atendiendo el 100% del tráfico.
- El entorno **Verde (Green):** el entorno en espera, donde se despliega la nueva versión.

### Flujo de Operación

```
Usuarios
   │
   │ (100% del tráfico)
   ▼
┌─────────────────┐         ┌─────────────────┐
│   AZUL (Blue)   │         │  VERDE (Green)  │
│   Versión 1.0   │ (activo) │   Versión 2.0   │ (en preparación)
│                 │         │                 │
└─────────────────┘         └─────────────────┘

Paso 1: Desplegar v2.0 en entorno Verde (sin afectar el tráfico)
Paso 2: Ejecutar smoke tests y pruebas de aceptación en Verde
Paso 3: Cambiar el enrutador (load balancer) de Azul → Verde

Usuarios
   │
   │ (100% del tráfico)
   ▼
┌─────────────────┐         ┌─────────────────┐
│   AZUL (Blue)   │         │  VERDE (Green)  │
│   Versión 1.0   │ (standby)│   Versión 2.0   │ (activo)
│                 │         │                 │
└─────────────────┘         └─────────────────┘
```

### Rollback Instantáneo

Si la versión 2.0 presenta problemas, la recuperación es **inmediata**: se revierte el enrutador de Verde → Azul. El entorno Azul nunca se modificó y puede retomar el 100% del tráfico en segundos.

### Ventajas

| Ventaja | Descripción |
|---|---|
| **Cero tiempo de inactividad** | La transición de tráfico es instantánea |
| **Rollback en segundos** | El entorno anterior permanece intacto |
| **Pruebas en producción real** | Verde puede probarse con tráfico real antes de la transición completa |
| **Despliegues predecibles** | No hay ambigüedad sobre qué versión está activa |

### Consideraciones

- Requiere **el doble de infraestructura** durante el período de transición.
- Las **migraciones de base de datos** requieren compatibilidad hacia atrás (tanto v1 como v2 deben funcionar con el mismo esquema).
- Es especialmente efectivo en arquitecturas de **contenedores y nube**, donde duplicar infraestructura es económico y automatizable.

### Herramientas que lo soportan

- AWS Elastic Beanstalk (swap environment URLs)
- AWS CodeDeploy (blue/green para ECS, Lambda)
- Google Cloud Deploy
- Kubernetes (con Services y múltiples Deployments)
- Spinnaker (soporte nativo avanzado)

---

## Estrategia 2: Canary Deployment (Despliegue Canario)

### El Origen del Nombre

> Los mineros de carbón llevaban canarios a las minas para detectar gases tóxicos. Si el canario moría, había peligro. Los despliegues Canary aplican el mismo principio: exponer la nueva versión a un pequeño subconjunto de usuarios para detectar problemas antes de que afecten a todos.

### Concepto

La nueva versión se despliega **gradualmente**, comenzando con un pequeño porcentaje del tráfico y aumentando progresivamente a medida que el sistema de monitoreo confirma su estabilidad.

### Flujo de Operación

```
Fase 1: 5% del tráfico → v2.0 (Canary)
        95% del tráfico → v1.0 (Stable)
              │
              ▼
        Monitoreo: ¿errores? ¿latencia? ¿métricas de negocio?
              │
    ┌─────────┴─────────┐
    │                   │
  ✅ OK               ❌ Problema
    │                   │
    ▼                   ▼
Fase 2: 25%          Rollback: 0%
              │
              ▼
Fase 3: 50%  →  Fase 4: 100%  →  Versión 2.0 reemplaza a 1.0
```

### Ventajas

| Ventaja | Descripción |
|---|---|
| **Exposición controlada** | Solo un subconjunto de usuarios experimenta la nueva versión |
| **Detección temprana** | Los problemas se detectan con impacto limitado |
| **Rollback gradual o total** | Se puede detener en cualquier fase |
| **Datos reales** | La validación ocurre con tráfico de producción real |

### ¿Cuándo usar Canary vs. Blue-Green?

| Criterio | Blue-Green | Canary |
|---|---|---|
| Velocidad de la transición | Instantánea | Gradual (horas o días) |
| Infraestructura requerida | Duplicada durante la transición | Incremental |
| Validación antes de transición completa | Smoke tests internos | Tráfico real de usuarios |
| Ideal para | Cambios bien probados internamente | Cambios de alto impacto o incertidumbre |

---

## Estrategia 3: Rolling Updates (Actualizaciones Progresivas)

### Concepto

En lugar de duplicar toda la infraestructura (como en Blue-Green), los servidores o contenedores antiguos se reemplazan uno a uno (o en grupos) por instancias con la nueva versión.

### Flujo de Operación

```
Estado inicial: 4 instancias con v1.0
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ v1 │ │ v1 │ │ v1 │ │ v1 │  (100% tráfico en v1)
└────┘ └────┘ └────┘ └────┘

Paso 1: Reemplazar 1 instancia
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ v2 │ │ v1 │ │ v1 │ │ v1 │  (25% en v2, 75% en v1)
└────┘ └────┘ └────┘ └────┘

Paso 2: Reemplazar 1 más
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ v2 │ │ v2 │ │ v1 │ │ v1 │  (50% en v2, 50% en v1)
└────┘ └────┘ └────┘ └────┘

... hasta que todas las instancias ejecutan v2.0
```

### Características

- **No requiere duplicar la infraestructura** completa — solo una instancia de reserva es suficiente.
- Kubernetes implementa Rolling Updates de forma nativa con su objeto `Deployment`.
- El rollback requiere invertir el proceso → puede ser más lento que Blue-Green.
- Durante la transición, **coexisten dos versiones** simultáneamente → las APIs deben ser compatibles.

### Configuración en Kubernetes

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Máximo de pods adicionales durante la actualización
      maxUnavailable: 0  # Cero pods caídos en ningún momento
```

---

## Estrategia 4: Feature Toggles y Pruebas A/B

### Feature Toggles (Banderas de Características)

Un **Feature Toggle** (también llamado Feature Flag o Feature Switch) es un mecanismo de configuración que permite activar o desactivar funcionalidades del código en tiempo de ejecución, sin necesidad de un nuevo despliegue.

```python
# Ejemplo conceptual de Feature Toggle
if feature_flags.is_enabled("nuevo_checkout_flow", user=current_user):
    return render_nuevo_checkout()
else:
    return render_checkout_clasico()
```

#### Tipos de Feature Toggles

| Tipo | Descripción | Ejemplo de Uso |
|---|---|---|
| **Release Toggle** | Oculta una funcionalidad hasta que esté lista para lanzarse | Nueva página de pago en desarrollo |
| **Experiment Toggle** | Habilita funcionalidad para un subconjunto de usuarios | Prueba A/B de una nueva UI |
| **Ops Toggle** | Control operacional de funcionalidades en producción | Deshabilitar búsqueda avanzada bajo alta carga |
| **Permission Toggle** | Habilita funcionalidades para segmentos específicos | Funciones premium para clientes enterprise |

#### Beneficio Principal

Desacopla el **despliegue** del **lanzamiento**:
- El código se despliega con la funcionalidad desactivada.
- El negocio activa la funcionalidad cuando el momento es correcto (sin ingeniería).
- El rollback de una funcionalidad es instantáneo (desactivar el toggle) sin revertir el código.

### Pruebas A/B

Las **pruebas A/B** extienden el concepto de Feature Toggle para la experimentación científica:

```
Usuarios
   │
   ├── 50% → Versión A (checkout con foto del producto)
   └── 50% → Versión B (checkout sin foto del producto)

Métrica: ¿Cuál convierte más?
  → La versión ganadora se activa para el 100%
```

#### Diferencia entre Canary y A/B Testing

| Aspecto | Canary Deployment | Prueba A/B |
|---|---|---|
| **Objetivo** | Validar estabilidad técnica | Validar comportamiento del usuario |
| **Métrica de éxito** | Tasa de errores, latencia, disponibilidad | Tasa de conversión, engagement, retención |
| **Decisión** | Técnica (ingeniería) | De negocio (producto, marketing) |
| **Duración** | Horas (hasta estabilizar) | Días o semanas (para significancia estadística) |

---

## Selección de Estrategia: Guía de Decisión

```
¿Necesitas cero tiempo de inactividad?
├── No → Despliegue tradicional (solo para sistemas internos no críticos)
└── Sí → ¿Tienes recursos para duplicar infraestructura?
          ├── Sí + Necesitas rollback en segundos → Blue-Green
          └── No o prefieres exposición gradual → Rolling Update o Canary
                    └── ¿Quieres validación con usuarios reales antes del 100%?
                              ├── Sí → Canary
                              └── No → Rolling Update

¿Necesitas separar despliegue de lanzamiento?
└── Sí → Feature Toggles (complementa cualquier estrategia de despliegue)
```

---

## Actividad Práctica

> **Ejercicio de diseño:**
>
> Para cada escenario, define qué estrategia de despliegue aplicarías y justifica tu elección:
>
> 1. Una plataforma de e-commerce que no puede tener tiempo de inactividad durante el Buen Fin o Black Friday.
> 2. Un banco que necesita actualizar su motor de cálculo de intereses y requiere aprobación del equipo de riesgo antes de afectar al 100% de los clientes.
> 3. Una startup SaaS que quiere probar si un nuevo dashboard de analytics mejora la retención de usuarios.
> 4. Un sistema de facturación legacy ejecutándose en servidores virtuales con infraestructura limitada.

---

## Siguiente Paso

Con las estrategias comprendidas, el siguiente paso es ver cómo se implementan estas dentro de un pipeline de CD automatizado.

➡️ Continúa con: [Tema 3 - Automatización de Despliegues](./03-automatizacion-despliegues.md)
