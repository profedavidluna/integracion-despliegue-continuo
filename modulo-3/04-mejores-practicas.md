# Tema 4: Mejores Prácticas en Integración Continua

> **Objetivo:** Internalizar las reglas organizacionales y técnicas que transforman un pipeline automatizado en una herramienta de cultura de equipo. La CI sin estas prácticas es una herramienta; con ellas, es una ventaja competitiva.

---

## Por Qué las Prácticas Importan Tanto como las Herramientas

Un equipo puede instalar Jenkins o GitHub Actions en un día. Pero si los desarrolladores integran su código una vez por semana, si el pipeline rojo se ignora durante días, o si se construye el artefacto diferente en cada entorno — las herramientas no hacen ninguna diferencia.

Las siguientes prácticas son las que separan a los equipos de alto rendimiento (clasificación DORA "Elite") de los de rendimiento medio.

---

## Práctica 1: Tirar del Cordón de Andon — Stop the Line

### El Origen

El **cordón de Andon** es un concepto del Sistema de Producción de Toyota. En las líneas de ensamblaje de Toyota, cualquier trabajador puede tirar de un cordón físico para detener toda la línea de producción si detecta un defecto. La filosofía: es mejor detener y corregir ahora que producir defectos que se descubren más tarde a un costo mucho mayor.

### La Aplicación en CI

Cuando el pipeline de CI falla — se pone **rojo** —, el equivalente en software es tirar del cordón de Andon:

```
Pipeline ROJO detectado
          │
          ▼
❌ STOP: Ninguna nueva característica se integra al trunk
          │
          ▼
Todo el equipo disponible se involucra (swarming)
          │
          ▼
Se identifica y corrige la causa raíz
          │
          ▼
✅ Pipeline vuelve a VERDE → Trabajo normal se reanuda
```

**Lo que NO se debe hacer:**
- ❌ Ignorar el pipeline rojo y seguir trabajando ("lo arreglamos después")
- ❌ Desactivar la prueba que falla para que el pipeline pase
- ❌ Hacer commit encima del error sin entender la causa raíz
- ❌ Aceptar un pipeline "permanentemente rojo" como estado normal

**Regla de oro:** Un pipeline que lleva más de 10 minutos rojo sin atención es una emergencia de equipo, no un problema individual del desarrollador que rompió el build.

---

## Práctica 2: Desarrollo Basado en Trunk (Trunk-Based Development)

### El Problema: El Infierno de Integración

Las ramas de características (feature branches) de larga duración son la fuente más común del "infierno de integración":

```
Semana 1: Desarrollador A crea rama feature/nueva-ui
Semana 2: Desarrollador B crea rama feature/nuevo-motor
Semana 3: main tiene 150 commits nuevos que ninguna rama tiene
Semana 4: Intentan hacer merge... 

💥 Conflictos masivos
💥 Pruebas de integración fallan en cascada
💥 El equipo pasa días resolviendo conflictos en lugar de crear valor
```

### La Solución: Trunk-Based Development (TBD)

En Trunk-Based Development, los desarrolladores integran su trabajo a la rama principal (`main` / `trunk`) **al menos una vez al día**, manteniendo las ramas de muy corta duración (horas o días, no semanas).

```
✅ Trunk-Based Development:
main ──●──●──●──●──●──●──●──●──●──● (commits frecuentes)
         ↑     ↑
    Ramas de vida <= 1-2 días

❌ Anti-patrón (ramas de larga duración):
main ─────────────────────────────────●
      └── feature/nueva-ui ───────────┘ (6 semanas de divergencia)
```

### ¿Y si la Funcionalidad No Está Lista?

La solución para integrar código incompleto sin exponerlo a los usuarios es el **Feature Flag** (interruptor de característica):

```python
# feature_flags.py
FEATURE_FLAGS = {
    "nuevo_motor_recomendaciones": os.getenv("FF_NUEVO_MOTOR", "false") == "true"
}

# En el código de la aplicación
if feature_flags.FEATURE_FLAGS["nuevo_motor_recomendaciones"]:
    resultado = nuevo_motor.calcular(usuario)  # Código nuevo (desactivado)
else:
    resultado = motor_actual.calcular(usuario)  # Código actual (activo)
```

Con Feature Flags:
- El código incompleto se integra al trunk pero no se activa para los usuarios
- Se activa gradualmente: primero para el equipo interno, luego para un % de usuarios, luego para todos
- Si hay problemas, se desactiva en segundos sin necesidad de un despliegue

---

## Práctica 3: Construir una Vez — Artefacto Inmutable

### El Anti-patrón: Compilar en Cada Entorno

```
Desarrollo → [mvn build] → dev.jar
                              ↓ (tiempo, diferente máquina)
Test       → [mvn build] → test.jar  ← ¡Diferente! Nuevas dependencias
                              ↓ (tiempo, diferente máquina)
Producción → [mvn build] → prod.jar ← ¡Diferente otra vez!

"Funcionaba en Testing pero no en Producción" ← Causa raíz
```

### La Práctica: Construir Una Vez, Promover el Mismo Artefacto

```
main → [CI Pipeline: mvn package] → app-v1.2.3.jar + hash SHA256
                    │
    ┌───────────────┼───────────────────┐
    ▼               ▼                   ▼
  [DEV]          [TEST]           [PRODUCCIÓN]
El mismo jar    El mismo jar      El mismo jar
El mismo hash   El mismo hash     El mismo hash

"Si pasó en Testing, pasará en Producción" ← Garantía
```

### Implementación con Imágenes Docker

Docker es el mecanismo moderno más efectivo para implementar esta práctica:

```bash
# En el pipeline de CI (una sola vez):
docker build -t mi-empresa/mi-api:${GIT_SHA} .
docker push mi-empresa/mi-api:${GIT_SHA}

# La misma imagen se despliega en cada entorno:
# Desarrollo:
kubectl set image deployment/api api=mi-empresa/mi-api:abc1234

# Testing:
kubectl set image deployment/api api=mi-empresa/mi-api:abc1234

# Producción:
kubectl set image deployment/api api=mi-empresa/mi-api:abc1234
```

El tag es el SHA del commit de Git — identificador único e inmutable. Si alguien pregunta "¿qué versión hay en producción?", la respuesta es un hash de Git que apunta exactamente al commit.

---

## Práctica 4: Integración Frecuente

La integración frecuente al trunk no es solo sobre velocidad — es sobre **reducir el riesgo**.

| Tamaño del commit / PR | Riesgo de integración | Facilidad de revisión | Tiempo de revisión |
|------------------------|----------------------|-----------------------|-------------------|
| 5–50 líneas | 🟢 Bajo | 🟢 Alta | Minutos |
| 50–200 líneas | 🟡 Moderado | 🟡 Media | 30 min – 1 hora |
| 200–500 líneas | 🟠 Alto | 🔴 Baja | Horas |
| 500+ líneas | 🔴 Muy alto | 🔴 Muy baja | Días |

> **Regla práctica:** Si un Pull Request requiere más de 1 hora de revisión, es candidato a ser dividido en PRs más pequeños.

---

## Práctica 5: No Comprometer el Pipeline

Las siguientes acciones están explícitamente prohibidas en equipos de alto rendimiento:

| Acción Prohibida | Por Qué Es Dañina |
|------------------|-------------------|
| Deshabilitar una prueba para que el pipeline pase | Elimina la señal de calidad; el bug seguirá existiendo |
| Saltarse el pipeline ("bypass" de Branch Policy) | Introduce código no validado en el trunk |
| Hacer commits de "arreglo rápido" sin ejecutar las pruebas localmente primero | Genera más ruido de pipeline rojo |
| Ignorar notificaciones de pipeline fallido | El problema se acumula y se vuelve más costoso |
| Configurar el pipeline para "no fallar nunca" (umbral de cobertura en 0%) | El pipeline deja de ser una herramienta de calidad |

---

## Práctica 6: Notificaciones Efectivas

Un pipeline que falla en silencio no sirve. Las notificaciones deben ser:

1. **Inmediatas:** El desarrollador debe enterarse en segundos, no en horas
2. **Dirigidas:** Solo notificar a quien rompió el build (y al equipo), no a toda la empresa
3. **Accionables:** El mensaje debe incluir el link directo al log del fallo
4. **En el canal correcto:** Slack, Teams, correo — donde el equipo realmente presta atención

```yaml
# GitHub Actions: notificación a Slack cuando el pipeline falla
- name: Notificar fallo al equipo
  if: failure()
  uses: slackapi/slack-github-action@v1.27
  with:
    channel-id: 'ci-alerts'
    slack-message: |
      ❌ Pipeline fallido en *${{ github.repository }}*
      Rama: `${{ github.ref_name }}`
      Autor: ${{ github.actor }}
      Ver logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

## Resumen: La Lista de Verificación de CI

Usa esta lista para evaluar la madurez de CI de tu equipo:

| # | Práctica | ¿Tu equipo lo hace? |
|---|----------|---------------------|
| 1 | El pipeline se ejecuta en cada commit/PR | ⬜ Sí / ⬜ No |
| 2 | El pipeline corre en menos de 10 minutos | ⬜ Sí / ⬜ No |
| 3 | Un pipeline rojo detiene el trabajo del equipo | ⬜ Sí / ⬜ No |
| 4 | Las ramas duran menos de 2 días | ⬜ Sí / ⬜ No |
| 5 | El mismo artefacto se promueve entre entornos | ⬜ Sí / ⬜ No |
| 6 | La cobertura de código tiene un umbral mínimo | ⬜ Sí / ⬜ No |
| 7 | El pipeline está definido como código en el repo | ⬜ Sí / ⬜ No |
| 8 | Las Branch Policies impiden merges sin CI verde | ⬜ Sí / ⬜ No |
| 9 | Las notificaciones de fallo llegan en < 5 minutos | ⬜ Sí / ⬜ No |
| 10 | Los secretos no están hardcodeados en el pipeline | ⬜ Sí / ⬜ No |

Un equipo con 8–10 ítems marcados está en clasificación DORA "Alto" o "Elite". Con 3 o menos, hay trabajo transformacional por hacer.

---

## Siguiente Paso

Con las prácticas claras, es momento de aplicarlas en las herramientas concretas. Comenzamos con GitHub Actions.

➡️ Continúa con: [Tema 5 - Profundización: GitHub Actions](./05-github-actions.md)
