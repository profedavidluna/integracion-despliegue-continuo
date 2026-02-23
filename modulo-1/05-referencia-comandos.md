# Tema 5: Referencia de Comandos Docker

> **Objetivo:** Consolidar el conocimiento práctico con una guía de referencia rápida de los comandos Docker más importantes, organizados por categoría. Esta sección está diseñada para ser consultada durante el trabajo diario.

---

## Categoría 1: Control y Ciclo de Vida de Contenedores

### `docker run` — Crear y ejecutar un contenedor

Es el comando principal para crear e iniciar un contenedor a partir de una imagen.

```bash
# Ejecutar en segundo plano (daemon/detached) con un nombre amigable
docker run -d --name mi_web nginx

# Mapear puertos: host:contenedor
docker run -d -p 8080:80 --name mi_web nginx

# Modo interactivo con terminal, eliminar el contenedor al salir
docker run -it --rm ubuntu /bin/bash

# Inyectar variables de entorno
docker run -e NODE_ENV=production -e PORT=8080 mi-app:1.0

# Combinar múltiples opciones (el uso más común en producción)
docker run -d \
  --name api-service \
  -p 8080:8080 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=secreto \
  --restart unless-stopped \
  mi-empresa/api:2.0
```

**Flags más importantes de `docker run`:**

| Flag | Descripción |
|------|-------------|
| `-d` | Ejecutar en segundo plano (detached) |
| `-p HOST:CONTAINER` | Mapear puertos |
| `--name` | Asignar un nombre al contenedor |
| `-e KEY=VALUE` | Inyectar variable de entorno |
| `-it` | Modo interactivo con terminal (TTY) |
| `--rm` | Eliminar el contenedor automáticamente al detenerse |
| `-v HOST:CONTAINER` | Montar un volumen o directorio |
| `--network` | Conectar a una red específica |
| `--restart` | Política de reinicio (`no`, `always`, `unless-stopped`, `on-failure`) |
| `--memory` | Límite de memoria (ej. `--memory 512m`) |
| `--cpus` | Límite de CPU (ej. `--cpus 0.5`) |

> **Buena práctica:** Usa siempre `--name` para asignar nombres descriptivos. Gestionar contenedores por nombre es mucho más claro que por ID (`a3f2b1c4d5e6`). Usa `--rm` para contenedores de tareas temporales o scripts de migración.

---

### `docker ps` — Listar contenedores

```bash
# Mostrar solo contenedores activos
docker ps

# Mostrar TODOS los contenedores (incluidos detenidos)
docker ps -a

# Mostrar solo los IDs (útil para scripts)
docker ps -q

# Mostrar contenedores activos con formato personalizado
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

### `docker stop` y `docker rm` — Detener y eliminar contenedores

```bash
# Detener un contenedor de forma ordenada (envía SIGTERM, espera 10s, luego SIGKILL)
docker stop mi_web

# Detener múltiples contenedores
docker stop mi_web mi_db mi_cache

# Eliminar un contenedor detenido
docker rm mi_web

# Forzar la eliminación de un contenedor en ejecución
docker rm -f mi_web

# Eliminar TODOS los contenedores detenidos (limpieza)
docker container prune

# Detener y eliminar en un solo paso (flujo de trabajo común)
docker stop mi_web && docker rm mi_web
```

---

### `docker exec` — Ejecutar comandos dentro de un contenedor en ejecución

```bash
# Abrir una terminal interactiva en un contenedor corriendo
docker exec -it mi_web /bin/sh

# Ejecutar un comando único y ver el resultado
docker exec mi_web ls /usr/src/app

# Ejecutar como usuario específico
docker exec -u root mi_web cat /etc/passwd
```

---

### `docker logs` — Ver la salida de los contenedores

```bash
# Ver los logs de un contenedor
docker logs mi_web

# Seguir los logs en tiempo real (como tail -f)
docker logs -f mi_web

# Ver solo las últimas 50 líneas
docker logs --tail 50 mi_web

# Ver logs con timestamps
docker logs -t mi_web

# Combinar: últimas 100 líneas en tiempo real con timestamp
docker logs -f --tail 100 -t mi_web
```

---

## Categoría 2: Gestión de Imágenes

### Construcción de imágenes

```bash
# Construir una imagen desde el directorio actual
docker build -t mi-empresa/mi-app:1.0 .

# Construir con un Dockerfile específico
docker build -f Dockerfile.prod -t mi-empresa/mi-app:1.0 .

# Construir sin usar caché (útil para asegurar builds limpios)
docker build --no-cache -t mi-empresa/mi-app:1.0 .

# Construir solo una etapa específica (Multi-Stage Build)
docker build --target builder -t mi-empresa/mi-app:builder .
```

### Gestión del registry

```bash
# Autenticarse en un registry
docker login                          # Docker Hub
docker login registry.empresa.com     # Registry privado

# Descargar una imagen del registry
docker pull nginx:alpine
docker pull registry.empresa.com/mi-app:2.0

# Subir una imagen al registry
docker push mi-empresa/mi-app:1.0

# Crear un alias (tag) de una imagen
docker tag mi-empresa/mi-app:1.0 mi-empresa/mi-app:latest
```

### Inspección de imágenes

```bash
# Listar imágenes locales
docker images

# Ver el historial de capas de una imagen
docker history mi-empresa/mi-app:1.0

# Ver los metadatos completos de una imagen (JSON)
docker image inspect mi-empresa/mi-app:1.0

# Eliminar una imagen
docker rmi mi-empresa/mi-app:1.0

# Eliminar todas las imágenes no utilizadas (limpieza)
docker image prune -a
```

---

## Categoría 3: Gestión de Redes

```bash
# Listar redes disponibles
docker network ls

# Crear una red personalizada
docker network create mi-red

# Conectar un contenedor a una red
docker network connect mi-red mi_web

# Desconectar un contenedor de una red
docker network disconnect mi-red mi_web

# Ver detalles de una red (qué contenedores están conectados)
docker network inspect mi-red
```

---

## Categoría 4: Gestión de Volúmenes

```bash
# Listar volúmenes
docker volume ls

# Crear un volumen nombrado
docker volume create mi-datos

# Ver detalles de un volumen (dónde está en el host)
docker volume inspect mi-datos

# Eliminar un volumen específico
docker volume rm mi-datos

# Eliminar todos los volúmenes no utilizados (¡precaución: borra datos!)
docker volume prune
```

---

## Categoría 5: Diagnóstico y Monitoreo

```bash
# Ver el uso de recursos en tiempo real (CPU, memoria, red, I/O)
docker stats

# Ver el uso de recursos de un contenedor específico
docker stats mi_web

# Ver los procesos corriendo dentro de un contenedor
docker top mi_web

# Ver información detallada de un contenedor (configuración, red, volúmenes)
docker inspect mi_web

# Ver los eventos del daemon de Docker en tiempo real
docker events

# Ver el uso de espacio en disco por Docker
docker system df
```

---

## Categoría 6: Limpieza del Sistema

```bash
# Eliminar todos los recursos no utilizados (contenedores, redes, imágenes sin tag)
docker system prune

# Limpieza agresiva: incluir imágenes sin contenedores activos
docker system prune -a

# Incluir también volúmenes (¡precaución: borra datos!)
docker system prune -a --volumes
```

---

## Cheatsheet de Referencia Rápida

| Acción | Comando |
|--------|---------|
| Correr contenedor en background | `docker run -d --name <nombre> <imagen>` |
| Ver contenedores activos | `docker ps` |
| Ver todos los contenedores | `docker ps -a` |
| Ver logs en tiempo real | `docker logs -f <nombre>` |
| Abrir terminal en contenedor | `docker exec -it <nombre> /bin/sh` |
| Detener contenedor | `docker stop <nombre>` |
| Eliminar contenedor | `docker rm <nombre>` |
| Construir imagen | `docker build -t <nombre>:<tag> .` |
| Listar imágenes | `docker images` |
| Subir imagen al registry | `docker push <nombre>:<tag>` |
| Ver uso de recursos | `docker stats` |
| Limpiar sistema | `docker system prune` |

---

## Siguiente Paso

Tienes las herramientas y los conceptos. Es hora de cerrar el módulo con una mirada hacia el futuro.

➡️ Continúa con: [Cierre del Módulo](./06-cierre.md)
