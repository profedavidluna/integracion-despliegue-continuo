# Introducción: El Valor de Negocio de DevOps

> **¿Por qué empezar con datos?** Las mejores decisiones de ingeniería se justifican con evidencia, no con intuición. Antes de escribir un solo pipeline, necesitas entender *por qué* esto importa en términos de negocio. Los números hablan por sí solos.

---

## El Reporte DORA: La Ciencia detrás de DevOps

El **DORA (DevOps Research and Assessment)** es un programa de investigación científica de Google que, desde 2014, mide el rendimiento de miles de equipos de ingeniería en todo el mundo. Sus hallazgos son el estándar de referencia de la industria.

DORA clasifica a las organizaciones en cuatro niveles de rendimiento: **Elite, Alto, Medio y Bajo**. La brecha entre los extremos es asombrosa:

| Métrica | Organizaciones Elite | Organizaciones de Bajo Rendimiento | Diferencia |
|---------|----------------------|-------------------------------------|------------|
| **Frecuencia de despliegues** | Varias veces al día | Una vez cada 6 meses o menos | **30x más frecuente** |
| **Lead Time** (del commit a producción) | Menos de 1 hora | Entre 6 meses y 1 año | **200x más rápido** |
| **Tasa de fallos en producción** | 0–15% | 46–60% | **60x menor** |
| **MTTR** (tiempo de recuperación ante incidentes) | Menos de 1 hora | Entre 1 semana y 1 mes | **2,604x más rápido** |

> **Fuente:** [DORA State of DevOps Report](https://dora.dev/research/) — Investigación anual de Google con más de 33,000 profesionales encuestados globalmente.

---

## Adopción y Mercado: Datos de la Industria

La transformación DevOps no es solo un movimiento técnico; es una realidad económica del mercado:

| Indicador | Dato |
|-----------|------|
| Empresas que ya implementan pipelines de CI/CD | **> 80%** |
| Valor del mercado de herramientas CI (2024) | **$1,400 millones USD** |
| Proyección del mercado para 2029 | **$3,720 millones USD** |
| Equipos con CI/CD que entregan más rápido | **2.5x más veloz** que equipos tradicionales |

> **Fuentes:** MarketsandMarkets Research, Gartner, Stack Overflow Developer Survey.

---

## ¿Qué Significa Esto para Tu Organización?

Traducir los datos a impacto de negocio es lo que diferencia a un ingeniero técnico de un **profesional estratégico**:

### 1. Velocidad como Ventaja Competitiva
Un lead time de minutos en lugar de meses significa que puedes **responder a las necesidades del mercado en tiempo real**. Si tu competidor tarda un mes en corregir un bug crítico o lanzar una nueva función y tú tardas una hora, la diferencia se traduce directamente en cuota de mercado.

### 2. La Estabilidad No Es Opuesta a la Velocidad
La intuición dice: "si desplegamos más rápido, aumenta el riesgo". Los datos de DORA demuestran lo contrario. Las organizaciones que despliegan **más frecuentemente** también tienen **menor tasa de fallos**. La clave está en que los cambios pequeños son intrínsecamente menos riesgosos que los grandes lotes.

### 3. El Costo del Tiempo de Inactividad
Si el MTTR de tu equipo es de días o semanas, cada incidente en producción representa horas de ingeniería, pérdida de confianza del cliente y, dependiendo del sector, multas regulatorias. Reducir el MTTR de semanas a minutos es un ahorro directo y medible.

---

## La Pregunta del Hilo Conductor

> **Para el instructor:** Pide a los estudiantes que respondan esta pregunta antes de continuar:
>
> *"¿Cuánto tiempo le toma actualmente a tu equipo pasar un cambio de código, desde la computadora de un desarrollador, hasta que esté disponible y funcionando para el usuario final?"*
>
> Esta métrica se llama **Lead Time for Changes** y es uno de los cuatro indicadores clave de DORA. Guarda tu respuesta: la usaremos como referencia para medir el progreso al final del módulo.

---

## Siguiente Paso

Con estos datos como contexto, es momento de entender la filosofía que hace posibles estos resultados.

➡️ Continúa con: [Tema 1 - Visión General de DevOps](./01-vision-general-devops.md)
