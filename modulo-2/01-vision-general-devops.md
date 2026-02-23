# Tema 1: Visión General de DevOps

> *"DevOps es el resultado de aplicar los principios más confiables de la manufactura física y del liderazgo a las cadenas de valor de TI."*  
> — Gene Kim, autor de *The Phoenix Project* y *The DevOps Handbook*

---

## 1.1 El Problema Tradicional: El Muro de la Confusión

Para entender DevOps, primero hay que entender el problema que resuelve. En el modelo tradicional de desarrollo de software, los equipos operaban en silos con **objetivos fundamentalmente opuestos**:

```
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│         DESARROLLO (Dev)            │     │         OPERACIONES (Ops)           │
│                                     │     │                                     │
│  ✅ Evaluado por: nuevas features   │     │  ✅ Evaluado por: uptime del servidor│
│  🎯 Objetivo: el CAMBIO             │  ≠  │  🎯 Objetivo: RESISTIR el cambio    │
│  📦 Entrega: "lanza código al muro" │     │  🔥 Recibe: incidentes, reproches   │
│                                     │     │                                     │
└─────────────────────────────────────┘     └─────────────────────────────────────┘
                              ▲                           ▲
                              └───────── CONFLICTO ───────┘
```

### El Ciclo Disfuncional

1. Dev termina una funcionalidad después de semanas o meses de trabajo aislado.
2. El código se "lanza por encima del muro" a Ops en un evento de despliegue masivo.
3. En producción, algo falla. El entorno no era idéntico al de desarrollo.
4. Comienza el juego de culpas: *"En mi máquina sí funciona."*
5. Ops parchea el servidor manualmente. El entorno queda en un estado desconocido.
6. Se repite el ciclo.

### El Resultado: Lanzamientos Dolorosos

- **Grandes lotes de cambios** acumulados → mayor probabilidad de conflicto e incidentes.
- **Despliegues infrecuentes** → cada lanzamiento es un evento estresante.
- **Feedback tardío** → los errores se detectan semanas después de escribirse.
- **Sin responsabilidad compartida** → Dev no sabe cómo funciona en producción; Ops no entiende el código.

---

## 1.2 ¿Qué es DevOps?

DevOps **no es**:
- ❌ Un rol o título de trabajo ("El DevOps del equipo").
- ❌ Un software que se puede comprar.
- ❌ Solo automatización o CI/CD.

DevOps **es**:
- ✅ Una **cultura y filosofía** que rompe los silos entre Desarrollo, QA y Operaciones.
- ✅ Un conjunto de **prácticas** que crean un flujo continuo de valor hacia el usuario final.
- ✅ Una forma de hacer que los ingenieros sean **responsables de extremo a extremo** de lo que construyen.

> *"Tú lo construyes, tú lo operas."*  
> — Werner Vogels, CTO de Amazon

Esta frase resume el cambio de mentalidad fundamental: el equipo que escribe el código es el mismo que lo despliega, monitorea y repara en producción. Esto crea un incentivo poderoso para escribir código de mayor calidad y más fácil de operar.

---

## 1.3 Los Tres Caminos de DevOps

El libro *The DevOps Handbook* de Gene Kim formaliza los principios de DevOps en tres patrones fundamentales llamados **"Los Tres Caminos"**:

### Primer Camino: Flujo (Flow)

**Objetivo:** Acelerar el trabajo de izquierda a derecha, desde Desarrollo hasta Operaciones y el cliente.

```
Desarrollo → Control de Versiones → Build → Pruebas → Staging → Producción → Cliente
     ←────────────────── El valor fluye en esta dirección ──────────────────→
```

**Prácticas que lo habilitan:**
- **Lotes pequeños:** Commitsear y desplegar cambios pequeños y frecuentes en lugar de grandes lanzamientos.
- **Trabajo visible:** Todo el trabajo en un tablero (Kanban/Jira), sin trabajo oculto o informal.
- **Automatización:** Eliminar los pasos manuales que crean fricciones y errores.
- **Limitar el WIP (Work in Progress):** No iniciar más trabajo del que el equipo puede completar.

### Segundo Camino: Feedback (Retroalimentación)

**Objetivo:** Crear flujos rápidos y continuos de información de derecha a izquierda, para que los problemas se detecten y corrijan inmediatamente.

```
Producción → Monitoreo → Alertas → Desarrollador → Corrección → Producción
     ←──────── El feedback fluye de vuelta en esta dirección ────────────
```

**Prácticas que lo habilitan:**
- **Telemetría y observabilidad:** Medir todo en producción (logs, métricas, trazas).
- **Pruebas automáticas en cada commit:** El desarrollador sabe en minutos si su código rompió algo.
- **Alertas tempranas:** Detectar degradación de rendimiento antes de que el usuario lo note.
- **Revisiones de código (Pull Requests):** Feedback entre pares antes de que el código llegue a producción.

### Tercer Camino: Aprendizaje y Experimentación Continua

**Objetivo:** Crear una **cultura de alta confianza** donde los fallos son oportunidades de aprendizaje, no eventos para asignar culpas.

**Prácticas que lo habilitan:**
- **Post-mortems sin culpa (Blameless Post-Mortems):** Analizar qué salió mal en el sistema, no quién se equivocó.
- **Experimentación controlada:** Usar feature flags, A/B testing y canary releases para reducir el riesgo de nuevas funcionalidades.
- **Compartir conocimiento:** Documentar aprendizajes, crear runbooks, compartir incidentes como lecciones.
- **Kaizen (Mejora continua):** Reservar tiempo en cada sprint para mejorar el proceso, no solo entregar funcionalidades.

---

## 1.4 El Modelo CALMS de DevOps

Muchas organizaciones adoptan el modelo **CALMS** como un marco de evaluación de madurez DevOps:

| Dimensión | Significado | Pregunta clave |
|-----------|-------------|----------------|
| **C** ultura | Las personas y los procesos primero | ¿El equipo colabora o compite? |
| **A** utomation | Automatizar lo repetible | ¿Qué pasos manuales aún existen en el pipeline? |
| **L** ean | Eliminar el desperdicio, optimizar el flujo | ¿Cuál es el Lead Time actual? ¿Dónde está el cuello de botella? |
| **M** easurement | Medir todo para mejorar | ¿Tenemos métricas de los cuatro indicadores DORA? |
| **S** haring | Compartir conocimiento y responsabilidad | ¿Hay silos de conocimiento en el equipo? |

---

## Reflexión

> **Pregunta para el estudiante:** ¿En cuál de los Tres Caminos crees que tu equipo tiene el mayor margen de mejora: Flujo, Feedback o Aprendizaje? ¿Por qué?

---

## Siguiente Paso

Con la filosofía DevOps clara, es momento de ver la herramienta técnica que la hace posible: el pipeline de CI/CD.

➡️ Continúa con: [Tema 2 - Fundamentos de CI/CD](./02-fundamentos-cicd.md)
