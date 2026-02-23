# Tema 1: Integración con Repositorios de Código (Git)

> **Objetivo:** Comprender cómo el servidor de CI se comunica con el sistema de control de versiones para detectar cambios y disparar pipelines automáticamente. Esta es la conexión fundamental que hace posible la automatización.

---

## El Punto de Partida de Todo Pipeline

Un pipeline de CI no se activa por arte de magia. Necesita saber **cuándo** hay código nuevo que procesar. Esa información viene del repositorio de código (Git), y la forma en que el servidor de CI la recibe define la velocidad y eficiencia del flujo completo.

```
Desarrollador hace git push
         │
         ▼
   Repositorio Git
  (GitHub / GitLab / Bitbucket)
         │
    ¿Cómo se entera el servidor de CI?
         │
    ┌────┴────┐
    ▼         ▼
Webhook    Polling SCM
(activo)   (pasivo)
```

---

## Mecanismos de Disparo (Triggers)

### Opción 1: Webhooks (Recomendado)

Un **webhook** es una notificación HTTP automática que el repositorio envía al servidor de CI en el momento exacto en que ocurre un evento.

**¿Cómo funciona?**

```
1. Desarrollador hace git push → GitHub detecta el evento
2. GitHub envía inmediatamente un HTTP POST al servidor de CI
   con el payload del evento (rama, commit SHA, autor, etc.)
3. El servidor de CI recibe la notificación y dispara el pipeline
   en ese instante

Tiempo total de latencia: segundos
```

**Configuración típica en GitHub:**

```
Repositorio → Settings → Webhooks → Add webhook
  Payload URL: https://mi-jenkins.empresa.com/github-webhook/
  Content type: application/json
  Events: Push events, Pull requests
```

**Ventajas del Webhook:**
- ✅ Respuesta en tiempo real (latencia de segundos)
- ✅ Sin carga innecesaria en el servidor
- ✅ El pipeline refleja el estado exacto del repositorio en todo momento
- ✅ Estándar de la industria para todos los servicios de CI/CD modernos

**Limitación:**
- Requiere que el servidor de CI sea accesible públicamente (o con una URL accesible desde el repositorio). Si hay firewalls que bloquean el tráfico entrante, se necesita una alternativa.

---

### Opción 2: Polling SCM (Sondeo Periódico)

El servidor de CI **consulta periódicamente** al repositorio preguntando si hay cambios nuevos.

**¿Cómo funciona?**

```
Cada X minutos:
   Servidor de CI → "¿Hay commits nuevos desde la última vez?"
                               ↓
   Si hay cambios: dispara el pipeline
   Si no hay cambios: espera hasta la próxima consulta
```

**Configuración de Polling en Jenkins (sintaxis cron):**

```groovy
// En el Jenkinsfile o configuración del pipeline
triggers {
    pollSCM('H/5 * * * *')  // Consulta cada 5 minutos
}
```

**Ventajas del Polling:**
- ✅ Funciona detrás de firewalls estrictos que bloquean conexiones entrantes
- ✅ No requiere configuración especial en el repositorio

**Desventajas del Polling:**
- ❌ Retraso de hasta X minutos entre el push y la ejecución del pipeline
- ❌ Genera carga constante en el servidor de CI aunque no haya cambios
- ❌ Desperdicia recursos: la mayoría de las consultas no encuentran nada nuevo

> **Regla práctica:** Usa webhooks siempre que sea posible. Reserva el polling solo para entornos con restricciones de red que impidan webhooks.

---

## Eventos Típicos que Disparan un Pipeline

No todos los eventos del repositorio deben activar el mismo pipeline. Una estrategia bien diseñada diferencia qué pipeline ejecutar según el contexto:

| Evento | Cuándo ocurre | Pipeline típico |
|--------|---------------|-----------------|
| `push` a `main` | Merge de una PR aprobada | CI completo: build + tests + análisis de calidad |
| `pull_request` abierto/actualizado | Un desarrollador propone cambios | CI de validación: build + tests rápidos |
| `push` a rama `feature/*` | Desarrollo activo en una rama | CI ligero: build + pruebas unitarias |
| `schedule` (cron) | Horario fijo (ej. medianoche) | CI completo + pruebas de integración lentas |
| `tag` publicado | Preparación de un release | Pipeline de release: build + tests + empaquetado + versionado |

---

## Integración Estratégica: Branch Policies

Conectar el CI al repositorio no es suficiente si los desarrolladores pueden hacer merge sin que el pipeline haya pasado. Las **Branch Policies** (políticas de rama) cierran ese hueco.

### ¿Qué Son las Branch Policies?

Son reglas configuradas directamente en el repositorio que impiden que código sin validar llegue a las ramas protegidas (normalmente `main` o `master`).

**Configuración en GitHub (Branch Protection Rules):**

```
Repositorio → Settings → Branches → Add rule
  Branch name pattern: main
  ☑ Require a pull request before merging
  ☑ Require status checks to pass before merging
      → Status checks: CI / build-and-test  ← el nombre del job de CI
  ☑ Require branches to be up to date before merging
  ☑ Do not allow bypassing the above settings
```

**Flujo resultante con Branch Policies activas:**

```
Desarrollador abre Pull Request
         │
         ▼
GitHub dispara webhook → Pipeline de CI se ejecuta
         │
    ┌────┴────────────────────┐
    ▼                         ▼
Pipeline VERDE ✅         Pipeline ROJO ❌
Merge habilitado          Merge bloqueado
         │
         ▼
El desarrollador ve exactamente
qué prueba falló y por qué
```

### Beneficio Organizacional

Con Branch Policies activas, la rama `main` es **siempre verde por definición**. Es imposible introducir código roto si el sistema está bien configurado, porque el repositorio mismo lo impide — no depende de la disciplina individual de nadie.

---

## Estrategia de Ramas y CI: Un Modelo de Referencia

La integración de CI con el repositorio es más efectiva cuando se combina con una estrategia de ramas clara. El modelo más recomendado en equipos de alto rendimiento es **GitHub Flow**:

```
main (siempre estable, siempre deployable)
 │
 ├── feature/login-oauth          → PR → CI → Merge
 ├── fix/bug-timeout              → PR → CI → Merge
 └── chore/actualizar-dependencias → PR → CI → Merge
```

**Reglas del modelo:**
1. `main` siempre está en un estado desplegable.
2. Todo cambio se hace en una rama de corta duración (días, no semanas).
3. No se hace merge sin que el pipeline de CI haya pasado.
4. Los merges se hacen a través de Pull Requests (revisión de código + CI).

---

## Actividad Práctica

> **Para el equipo:** Configura un webhook en un repositorio de GitHub apuntando a un servicio de pruebas como [https://webhook.site](https://webhook.site). Realiza un `git push` y observa en tiempo real el payload JSON que GitHub envía. Identifica los campos: `ref` (la rama), `commits[0].id` (el SHA del commit) y `pusher.name` (el autor).
>
> Esta es exactamente la información que el servidor de CI recibe para saber qué construir y quién lo envió.

---

## Siguiente Paso

Con el servidor de CI conectado al repositorio, el siguiente paso es definir **qué hace** ese servidor cuando recibe el evento: el pipeline.

➡️ Continúa con: [Tema 2 - Configuración de Pipelines](./02-configuracion-pipelines.md)
