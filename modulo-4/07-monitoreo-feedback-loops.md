# Tema 7: Monitoreo y Feedback Loops

> **Objetivo:** Comprender cómo el monitoreo post-despliegue cierra el ciclo DevOps, convirtiendo datos de producción en señales de calidad que retroalimentan al equipo de desarrollo. Un sistema de CD sin monitoreo es simplemente una forma de llegar más rápido a los problemas sin darse cuenta.

---

## El Ciclo DevOps No Termina en el Despliegue

El pipeline de CI/CD es frecuentemente representado como una línea recta:

```
Plan → Code → Build → Test → Release → Deploy
```

Pero la representación correcta es un **ciclo de retroalimentación continuo**:

```
       ┌─────────────────────────────────────────────┐
       │                                              │
Plan → Code → Build → Test → Release → Deploy → Monitor
  ↑                                              │
  └──────────── Feedback (aprendizaje) ──────────┘
```

El monitoreo no es una etapa final — es la fuente de información que alimenta las decisiones del equipo sobre qué construir a continuación, qué mejorar y qué reparar.

---

## Los Tres Niveles de Monitoreo

### Nivel 1: Monitoreo de Infraestructura

Verifica que los recursos computacionales funcionen correctamente.

| Métrica | Qué Indica | Herramienta |
|---|---|---|
| Uso de CPU | Saturación de procesamiento | Prometheus, CloudWatch, Datadog |
| Uso de memoria | Memory leaks, saturación | Prometheus, Grafana |
| Uso de disco | Riesgo de disco lleno | Node Exporter, CloudWatch |
| Estado de pods/instancias | Reinicios inesperados, crashloops | Kubernetes Events, Datadog |
| Latencia de red | Problemas de conectividad | Jaeger, AWS X-Ray |

### Nivel 2: Monitoreo de Aplicación

Verifica que la aplicación funcione según lo esperado.

| Métrica | Qué Indica | Herramienta |
|---|---|---|
| Tasa de errores HTTP (5xx) | Fallos en el servicio | Prometheus, ELK Stack |
| Latencia de respuesta (p50, p95, p99) | Degradación de rendimiento | Jaeger, Datadog APM |
| Throughput (requests/segundo) | Carga y capacidad del sistema | Prometheus, Grafana |
| Tasa de éxito de transacciones | Funcionalidad correcta | Datadog, New Relic |
| Tamaño de colas de mensajes | Acumulación de trabajo pendiente | Prometheus, Grafana |

### Nivel 3: Monitoreo de Negocio (Business Metrics)

Verifica que las funcionalidades aporten valor al usuario y al negocio.

| Métrica | Qué Indica |
|---|---|
| Tasa de conversión (checkout completados) | Impacto en ingresos |
| Usuarios activos en tiempo real | Adopción de la plataforma |
| Tasa de abandono de carrito | Fricción en el proceso de compra |
| Tiempo de carga percibido por el usuario | Experiencia del usuario real |
| Retención a 1 día / 7 días | Satisfacción y valor del producto |

> **Principio clave:** Un despliegue puede ser técnicamente exitoso (0 errores HTTP, latencia normal) y aun así haber degradado una métrica de negocio. El monitoreo de negocio cierra ese gap.

---

## Las Cuatro Señales Doradas (Google SRE)

El libro **"Site Reliability Engineering"** de Google define cuatro métricas que, juntas, ofrecen una visión completa de la salud de un servicio:

| Señal | Descripción | Ejemplo de Alerta |
|---|---|---|
| **Latencia** | Tiempo que toma servir una solicitud | p99 > 500ms durante más de 5 minutos |
| **Tráfico** | Demanda sobre el sistema | Caída del 50% en requests/seg (posible incidente) |
| **Errores** | Tasa de solicitudes fallidas | Tasa de errores 5xx > 1% durante 2 minutos |
| **Saturación** | Qué tan "lleno" está el sistema | CPU > 90% durante más de 5 minutos |

> **Fuente:** *Site Reliability Engineering* — Google (Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Richard Murphy — O'Reilly Media, 2016).

---

## Feedback Loops: Los Ciclos de Retroalimentación

Un **feedback loop** (ciclo de retroalimentación) es el mecanismo por el cual la información generada por el sistema en producción llega al equipo de desarrollo de forma rápida y accionable.

### Los Tres Feedback Loops Esenciales

#### Loop 1: Feedback del Pipeline (Inmediato — segundos a minutos)

```
Commit → CI/CD Pipeline
               │
               ▼
         ¿Tests pasan? ─── No ──► Notificación al desarrollador (Slack/Teams)
               │                   en < 5 minutos
              Sí
               │
               ▼
         ¿Despliegue OK? ── No ──► Rollback automático + Alerta al equipo
               │
              Sí
               │
               ▼
         Despliegue exitoso → Notificación de confirmación
```

**Objetivo:** El desarrollador recibe feedback sobre la calidad de su commit en minutos, no horas.

#### Loop 2: Feedback de Observabilidad (Rápido — minutos a horas)

```
Despliegue en producción
        │
        ▼
Monitoreo detecta anomalía (tasa de errores, latencia)
        │
        ▼
Alerta activada → Equipo notificado → Diagnóstico
        │
        ▼
Rollback o hotfix → Nuevo despliegue
```

**Objetivo:** Los incidentes en producción se detectan automáticamente antes de que los usuarios los reporten.

#### Loop 3: Feedback de Negocio (Lento — días a semanas)

```
Funcionalidad desplegada con Feature Toggle
        │
        ▼
Datos de comportamiento del usuario recopilados
(tasa de conversión, tiempo en página, NPS, etc.)
        │
        ▼
Análisis del equipo de producto → Decisión
        │
        ▼
Activar feature toggle para todos / Revertir / Iterar
```

**Objetivo:** Las decisiones de producto se basan en evidencia real de usuarios, no en suposiciones.

---

## Herramientas del Stack de Observabilidad

### Stack Open-Source: Prometheus + Grafana

**Prometheus** recopila métricas de la aplicación e infraestructura. **Grafana** las visualiza en dashboards.

```yaml
# Ejemplo: configuración básica de Prometheus para Kubernetes
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
```

```yaml
# Regla de alerta: tasa de errores alta después de un despliegue
groups:
  - name: deployment-alerts
    rules:
      - alert: HighErrorRatePostDeployment
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Tasa de errores elevada — posible regresión post-despliegue"
          description: "Tasa de errores 5xx = {{ $value | humanizePercentage }}"
```

### Tabla Comparativa de Herramientas de Observabilidad

| Herramienta | Categoría | Descripción |
|---|---|---|
| **Prometheus** | Métricas | Recopilación y almacenamiento de métricas de series de tiempo |
| **Grafana** | Visualización | Dashboards para métricas, logs y trazas |
| **Jaeger / Zipkin** | Trazas distribuidas | Seguimiento de solicitudes a través de microservicios |
| **ELK Stack** | Logs | Elasticsearch + Logstash + Kibana para análisis de logs |
| **Loki** | Logs | Alternativa ligera de Grafana Labs para logs |
| **Datadog** | All-in-one | Plataforma comercial completa (métricas, logs, trazas, APM) |
| **New Relic** | All-in-one | Plataforma comercial con foco en rendimiento de aplicaciones |
| **PagerDuty** | Alertas | Gestión de incidentes y escalado de alertas |

---

## Monitoreo de Despliegues Canary

El monitoreo es especialmente crítico en los despliegues Canary. El sistema debe comparar automáticamente las métricas del grupo Canary vs. el grupo Estable:

```
Despliegue Canary (5% del tráfico)
        │
        ▼
┌────────────────────────────────────────────┐
│         Análisis Automático de Canary       │
│                                              │
│  Métrica              Estable    Canary      │
│  ─────────────────    ───────    ──────      │
│  Tasa de errores      0.1%       0.15%  ✅   │
│  Latencia p99         250ms      280ms  ✅   │
│  CPU promedio         45%        48%    ✅   │
│  Tasa de éxito trans  99.5%      99.4%  ✅   │
│                                              │
│  Resultado: PASS → Promover al 25%           │
└────────────────────────────────────────────┘
```

Herramientas como **Spinnaker** (con Kayenta) y **Argo Rollouts** (extensión de ArgoCD) automatizan este análisis estadístico.

---

## Argo Rollouts: Despliegues Progresivos con Análisis

**Argo Rollouts** extiende ArgoCD con soporte nativo para despliegues Canary y Blue-Green con análisis automático:

```yaml
# Rollout con análisis automático de Canary
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: mi-api
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10       # 10% del tráfico al canary
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate-check
        - setWeight: 50       # 50% si el análisis pasó
        - pause: {duration: 5m}
        - setWeight: 100      # 100% si todo OK
  template:
    spec:
      containers:
        - name: mi-api
          image: mi-api:1.2.3
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate-check
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{status!~"5..",app="mi-api",version="canary"}[5m]))
            /
            sum(rate(http_requests_total{app="mi-api",version="canary"}[5m]))
```

---

## Post-Mortems y Aprendizaje Continuo

El feedback loop más valioso a largo plazo es el **post-mortem sin culpa** (blameless post-mortem):

> Después de cada incidente significativo en producción, el equipo documenta:
> 1. **¿Qué pasó?** — Línea de tiempo objetiva del incidente.
> 2. **¿Por qué pasó?** — Análisis de causas raíz (5 Whys, Fishbone).
> 3. **¿Cómo se detectó?** — ¿El monitoreo lo detectó o lo reportó un cliente?
> 4. **¿Cómo se resolvió?** — Acciones de mitigación y resolución.
> 5. **¿Qué mejoras sistémicas se implementarán?** — Acciones correctivas para prevenir recurrencia.

**El principio clave:** Los incidentes no son fallas de las personas — son oportunidades de mejora del sistema.

---

## Actividad para el Equipo

> **Diseño de dashboard de despliegue:**
>
> En grupos de 3 a 4 personas, diseñen (en papel o una herramienta de diagramación) el dashboard ideal para monitorear un despliegue Canary de su aplicación. Incluyan:
>
> 1. ¿Qué métricas técnicas mostrarían (mínimo 4)?
> 2. ¿Qué métricas de negocio mostrarían (mínimo 2)?
> 3. ¿Cuál es el umbral de alerta para cada métrica?
> 4. ¿Qué acción automatizada se activaría si se supera ese umbral?
> 5. ¿A quién se notificaría y por qué canal?

---

## Siguiente Paso

Con el ciclo completo comprendido — desde el concepto hasta el monitoreo — es momento de ver cómo organizaciones reales han implementado estos principios y qué resultados obtuvieron.

➡️ Continúa con: [Tema 8 - Casos de Estudio Reales](./08-casos-de-estudio.md)
