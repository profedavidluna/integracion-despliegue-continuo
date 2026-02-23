# Tema 2: Fundamentos de CI/CD

> *"Si duele, hazlo con más frecuencia. Y trae el dolor hacia adelante."*  
> — Jez Humble, co-autor de *Continuous Delivery*

---

## El Pipeline: La Única Ruta hacia Producción

El corazón técnico que habilita la cultura DevOps es el **pipeline de CI/CD**: una secuencia automatizada de etapas por las que pasa todo cambio de código antes de llegar a los usuarios. Su principio fundamental es simple pero poderoso:

> **Si un cambio no puede pasar por el pipeline, no llega a producción. Sin excepciones.**

Esta regla elimina los despliegues manuales, los atajos de emergencia y los entornos que "funcionan diferente" porque alguien configuró algo a mano hace seis meses.

```
Desarrollador
     │
     ▼
┌─────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌────────────┐
│  Commit │──▶│  Build   │──▶│   Test    │──▶│ Staging  │──▶│ Producción │
│  (Git)  │   │(Compilar)│   │(Unit/Integ│   │(Validar) │   │(Usuarios)  │
└─────────┘   └──────────┘   └───────────┘   └──────────┘   └────────────┘
                                                                    ▲
                              Si falla en cualquier etapa ──────────┘
                              el pipeline se detiene y notifica al equipo
```

---

## 2.1 Integración Continua (CI — Continuous Integration)

### Definición

Práctica en la que **todos los desarrolladores del equipo fusionan (merge) sus cambios de código en una rama compartida** (comúnmente `main` o `trunk`) con mucha frecuencia — idealmente, al menos una vez al día.

### ¿Qué Ocurre Automáticamente con Cada Commit?

Cuando un desarrollador hace `git push`, el servidor de CI:

1. **Descarga el código** (checkout).
2. **Compila el proyecto** (build) — detecta errores de sintaxis y compilación.
3. **Ejecuta las pruebas unitarias** — detecta regresiones de funcionalidad.
4. **Analiza la calidad del código** (linters, análisis estático) — detecta code smells y vulnerabilidades conocidas.
5. **Notifica al equipo** del resultado (verde ✅ o rojo ❌) en minutos.

### El Problema que Resuelve: El Infierno de Integración

Sin CI, los desarrolladores trabajan en ramas aisladas durante semanas o meses. Cuando intentan fusionar, se encuentran con:

- **Conflictos de merge masivos** que toman días en resolver.
- **Bugs de integración** donde el código de A rompe el código de B.
- **Contexto perdido**: el desarrollador ya no recuerda exactamente por qué escribió cierta línea hace tres semanas.

Con CI, los conflictos se detectan en minutos, cuando el contexto aún está fresco.

### Buenas Prácticas de CI

| Práctica | Por qué importa |
|----------|----------------|
| Integrar al menos 1 vez al día | Reduce el tamaño de los conflictos |
| Las pruebas deben ejecutarse en menos de 10 minutos | Feedback rápido; si tarda más, los desarrolladores dejan de esperar |
| El pipeline roto es la prioridad máxima del equipo | Un pipeline rojo que nadie repara pierde su valor como herramienta de calidad |
| No commitsear directamente a `main` sin pasar por CI | La rama principal debe estar siempre en estado desplegable |

---

## 2.2 Entrega Continua vs. Despliegue Continuo

Este es uno de los conceptos que más confusión genera en la industria. Ambos usan la sigla "CD", pero representan dos niveles distintos de madurez y automatización.

### Entrega Continua (Continuous Delivery)

> El código **siempre está listo para ser desplegado**. El despliegue a producción es una **decisión de negocio**, no una operación técnica de riesgo.

```
Commit → CI (Build + Test) → Staging (pruebas adicionales) → ⏸️ APROBACIÓN HUMANA → Producción
```

**Características:**
- El pipeline automatizado lleva el código hasta un entorno de pre-producción (Staging).
- En Staging, pueden ejecutarse pruebas de integración, pruebas de aceptación del usuario (UAT) y pruebas de rendimiento.
- Un humano (el Product Manager, el equipo de QA o el desarrollador responsable) revisa y **aprueba** el despliegue final a producción.
- **No hay urgencia técnica** para hacer el despliegue: el código está validado y puede desplegarse en cualquier momento.

**¿Cuándo usar Continuous Delivery?**
- Entornos altamente regulados (banca, salud, gobierno) donde se requiere aprobación formal.
- Productos donde el equipo de negocio quiere controlar el timing del lanzamiento de funcionalidades.
- Equipos que están comenzando su transformación DevOps y aún no tienen la confianza en su suite de pruebas.

---

### Despliegue Continuo (Continuous Deployment)

> **Todo código que pasa el pipeline va automáticamente a producción.** No hay intervención humana en el ciclo de entrega.

```
Commit → CI (Build + Test) → Staging (pruebas adicionales) → ✅ AUTO-DEPLOY → Producción
```

**Características:**
- Requiere una suite de pruebas automatizadas **muy madura y confiable**.
- Las funcionalidades en desarrollo se ocultan detrás de **feature flags** (interruptores de características) para que puedan desplegarse sin ser visibles para los usuarios.
- El monitoreo y la capacidad de hacer **rollback automático** son críticos.
- Es el nivel de madurez de compañías como Netflix, Amazon, Facebook y Etsy.

**¿Cuándo usar Continuous Deployment?**
- Cuando la suite de pruebas automatizadas cubre más del 80% del código crítico.
- Cuando el equipo tiene alta confianza en su sistema de monitoreo.
- Cuando la velocidad de iteración es una ventaja competitiva directa del producto.

---

### Comparación Visual

```
         INTEGRACIÓN        ENTREGA            DESPLIEGUE
         CONTINUA (CI)      CONTINUA           CONTINUO
              │                │                  │
Commit ───────┤                │                  │
              ▼                │                  │
           Build ──────────────┤                  │
              ▼                │                  │
           Tests ──────────────┤                  │
              ▼                │                  │
          Staging ─────────────┤                  │
                               ▼                  │
                        [👤 Aprobación] ───────────┤
                               │                  ▼
                               │           [🤖 Automático]
                               ▼                  │
                          Producción ◀─────────────┘
```

---

## 2.3 Buenas Prácticas del Pipeline

### Shift-Left: Mover la Calidad Hacia la Izquierda

La idea de **Shift-Left** es integrar las validaciones de calidad y seguridad lo más temprano posible en el pipeline, en lugar de dejarlas para el final.

```
❌ Enfoque tradicional (calidad al final):
   Código → Build → Deploy → 🔍 Pruebas de seguridad → Producción
   (Los problemas se encuentran cuando el código ya está listo para salir)

✅ Shift-Left (calidad desde el inicio):
   🔍 Análisis estático → Build → 🔍 Pruebas unitarias → 🔍 Pruebas de integración → Deploy → Producción
   (Los problemas se encuentran cuando son más baratos de corregir)
```

**¿Por qué importa?** Según estudios de IBM, el costo de corregir un bug se multiplica:
- x1 si se detecta durante el desarrollo.
- x10 si se detecta en pruebas de integración.
- x100 si se detecta en producción.

### Flujo de una Pieza (One-Piece Flow)

Concepto tomado del **Lean Manufacturing** (producción Toyota): en lugar de fabricar grandes lotes de piezas que esperan en cola, fabricar una pieza a la vez y moverla inmediatamente a la siguiente etapa.

En software:
- **Gran lote (anti-patrón):** Acumular 6 meses de cambios y desplegarlos en un solo evento. Alto riesgo, bajo feedback.
- **Flujo de una pieza:** Desplegar un cambio pequeño (a veces una sola línea), inmediatamente. Bajo riesgo, feedback inmediato.

### DevSecOps: Seguridad en el Pipeline

Integrar herramientas de seguridad directamente en el pipeline:

| Herramienta | Qué hace | Etapa del pipeline |
|-------------|----------|--------------------|
| **SAST** (Static Application Security Testing) | Analiza el código fuente buscando vulnerabilidades conocidas | Build / antes del commit |
| **SCA** (Software Composition Analysis) | Detecta vulnerabilidades en dependencias de terceros | Build |
| **DAST** (Dynamic Application Security Testing) | Ataca la aplicación en ejecución para encontrar vulnerabilidades | Staging |
| **Container Scanning** | Analiza las imágenes Docker buscando CVEs conocidos | Build / antes del push al registry |

---

## Reflexión

> **Pregunta para el equipo:** ¿Tu organización practica Integración Continua, Entrega Continua o Despliegue Continuo? ¿Qué sería necesario para avanzar al siguiente nivel?

---

## Siguiente Paso

Ahora que entiendes los conceptos, es momento de ver cómo se implementan en la práctica con las herramientas más populares de la industria.

➡️ Continúa con: [Tema 3 - Profundización en Integración Continua](./03-integracion-continua.md)
