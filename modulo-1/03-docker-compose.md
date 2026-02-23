# Tema 3: Ejecución con Docker Compose

> **Objetivo:** Entender el rol de Docker Compose para definir y gestionar aplicaciones multi-contenedor, dominar la estructura del archivo `docker-compose.yml` y ejecutar los comandos esenciales para el ciclo de vida de los servicios.

---

## 3.1 ¿Qué es Docker Compose y Para Qué Sirve?

### El Problema: Aplicaciones Multi-Servicio

El comando `docker run` es perfecto para ejecutar **un** contenedor. Pero las aplicaciones empresariales reales rara vez son un solo componente.

Imagina una aplicación típica:

```
┌─────────────────────────────────────────────────────┐
│                 Aplicación Empresarial               │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│  │ Frontend  │  │  Backend  │  │   Base de     │   │
│  │  React    │  │  Node.js  │  │   Datos       │   │
│  │ :3000     │  │  :8080    │  │   PostgreSQL  │   │
│  └───────────┘  └───────────┘  └───────────────┘   │
│                                    ┌─────────────┐  │
│                                    │   Caché     │  │
│                                    │   Redis     │  │
│                                    │   :6379     │  │
│                                    └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

Sin Docker Compose, levantar este stack requeriría 4 comandos `docker run` separados, gestión manual de la red entre contenedores, y múltiples pasos para configurar las variables de entorno. Es frágil, difícil de reproducir y lento.

### La Solución: Docker Compose

**Docker Compose** permite definir toda esta arquitectura en **un único archivo YAML** (`docker-compose.yml`) y levantarla con **un solo comando**.

```bash
docker compose up -d    # Levanta toda la aplicación
docker compose down     # La apaga y limpia
```

### Casos de Uso Principales en Entornos Corporativos

| Caso de Uso | Descripción |
|-------------|-------------|
| **Entorno de desarrollo estandarizado** | Todo el equipo levanta el mismo stack con un comando, eliminando el "en mi máquina funciona" |
| **Pruebas de integración en CI** | El pipeline levanta la app + BD de pruebas, ejecuta los tests y limpia todo automáticamente |
| **Demos y presentaciones** | Levantar un entorno funcional completo en minutos para demostraciones a clientes |

> **Límite de Compose:** Docker Compose está diseñado para ejecutarse en **un solo host**. Para escalar a múltiples servidores con alta disponibilidad, el siguiente paso es **Kubernetes** (orquestador de contenedores a gran escala).

---

## 3.2 Estructura del Archivo `docker-compose.yml`

El archivo se organiza en secciones clave. A continuación se presenta la anatomía completa con explicaciones detalladas.

### Ejemplo Comentado Completo

```yaml
# docker-compose.yml

services:

  # ── Servicio: API Backend ────────────────────────────────────────
  api:
    # Opción A: construir desde un Dockerfile local
    build:
      context: ./backend       # Carpeta con el Dockerfile
      dockerfile: Dockerfile   # Nombre del Dockerfile (opcional si es 'Dockerfile')
    # Opción B: usar una imagen ya publicada en el registry
    # image: mi-empresa/mi-api:2.1

    ports:
      - "8080:8080"            # host:contenedor

    environment:
      - DB_HOST=db             # Nombre del servicio, no IP (Compose lo resuelve)
      - DB_PORT=5432
      - DB_NAME=mi_base
      - DB_USER=admin
      - DB_PASSWORD=${DB_PASSWORD}  # Leer de archivo .env (no hardcodear secretos)

    depends_on:
      db:
        condition: service_healthy    # Esperar a que la BD esté saludable

    restart: unless-stopped    # Reiniciar automáticamente si el contenedor falla

    networks:
      - backend-network

  # ── Servicio: Base de Datos ──────────────────────────────────────
  db:
    image: postgres:16-alpine

    environment:
      - POSTGRES_DB=mi_base
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=${DB_PASSWORD}

    volumes:
      - pg-data:/var/lib/postgresql/data    # Persistencia: los datos sobreviven al 'down'
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql  # Script de inicialización

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d mi_base"]
      interval: 10s
      timeout: 5s
      retries: 5

    networks:
      - backend-network

  # ── Servicio: Caché ──────────────────────────────────────────────
  cache:
    image: redis:7-alpine
    networks:
      - backend-network

# ── Redes ────────────────────────────────────────────────────────
networks:
  backend-network:
    driver: bridge    # Red privada para comunicación interna entre servicios

# ── Volúmenes ────────────────────────────────────────────────────
volumes:
  pg-data:    # Docker gestiona dónde almacena los datos en el host
```

---

### Anatomía de las Secciones Clave

#### `services`
Define cada uno de los contenedores que componen la aplicación. Cada servicio tiene su propio nombre (ej. `api`, `db`, `cache`) que también actúa como **hostname DNS** dentro de la red interna de Compose. Esto significa que el contenedor `api` puede conectarse a la base de datos simplemente usando `db` como hostname.

#### `ports`
Mapea puertos entre el host y el contenedor con la sintaxis `"HOST:CONTENEDOR"`.

```yaml
ports:
  - "8080:8080"   # Expone el puerto 8080 del contenedor en el puerto 8080 del host
  - "3000:3000"
```

> **Importante:** Solo expón al host los puertos que necesitas acceder desde afuera. Los servicios internos (BD, caché) no necesitan estar expuestos al host en producción.

#### `environment` y Variables de Entorno

Hay dos formas de manejar variables de entorno:

```yaml
# Forma 1: Lista (legible, pero hardcodea valores visibles)
environment:
  - NODE_ENV=production
  - PORT=8080

# Forma 2: Mapa (más expresivo)
environment:
  NODE_ENV: production
  PORT: 8080
  DB_PASSWORD: ${DB_PASSWORD}    # Lee del archivo .env en la misma carpeta
```

> ⚠️ **Nunca hardcodees contraseñas o tokens en el `docker-compose.yml`**. Usa referencias a variables del archivo `.env` (que debe estar en `.gitignore`) o usa secretos administrados (Docker Secrets, AWS Secrets Manager, HashiCorp Vault).

#### `depends_on`

Controla el **orden de inicio** de los servicios.

```yaml
# Modo básico: espera que el contenedor INICIE (no que esté LISTO)
depends_on:
  - db

# Modo recomendado: espera a que el healthcheck confirme que está LISTO
depends_on:
  db:
    condition: service_healthy
```

#### `volumes`

Los contenedores son **efímeros por naturaleza**: al hacer `docker compose down`, los datos dentro del contenedor se pierden. Los volúmenes resuelven esto.

```yaml
# Volumen gestionado por Docker (recomendado para bases de datos)
volumes:
  - pg-data:/var/lib/postgresql/data

# Bind mount (para desarrollo: sincroniza carpeta local con el contenedor)
volumes:
  - ./src:/app/src    # Cambios en ./src se reflejan inmediatamente en el contenedor
```

> **Bind mounts en desarrollo:** Son ideales para que los cambios de código se reflejen en el contenedor sin necesidad de hacer `docker build`. No usar en producción.

#### `networks`

Por defecto, Compose crea una red para todos los servicios. Puedes crear redes separadas para segmentar el tráfico:

```yaml
networks:
  frontend-network:   # Solo frontend + api
  backend-network:    # Solo api + db + cache
```

Esto implementa el principio de **menor privilegio de red**: la base de datos solo es accesible para la API, no directamente desde el frontend.

---

## 3.3 Comandos Esenciales de Docker Compose

### Gestión del Stack

```bash
# Levantar todos los servicios en segundo plano (detached)
docker compose up -d

# Levantar y reconstruir imágenes (usar cuando cambia el Dockerfile)
docker compose up -d --build

# Levantar solo un servicio específico (y sus dependencias)
docker compose up -d api

# Detener los servicios y eliminar contenedores y redes
docker compose down

# Detener y eliminar también los volúmenes (¡borra los datos!)
docker compose down -v
```

### Monitoreo y Debugging

```bash
# Ver el estado de todos los servicios
docker compose ps

# Ver logs de todos los servicios en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api

# Ejecutar un comando dentro de un contenedor en ejecución
docker compose exec api sh
docker compose exec db psql -U admin -d mi_base
```

### Gestión del Ciclo de Vida

```bash
# Reiniciar un servicio específico
docker compose restart api

# Detener un servicio sin eliminarlo
docker compose stop db

# Escalar un servicio (múltiples instancias)
docker compose up -d --scale api=3

# Ver el uso de recursos de los contenedores
docker compose top
```

---

## 3.4 Flujo de Trabajo Típico en Desarrollo

```
1. Clonar el repositorio
   git clone https://github.com/empresa/mi-proyecto.git

2. Crear archivo .env con las variables locales
   cp .env.example .env

3. Levantar el stack completo
   docker compose up -d

4. Verificar que todos los servicios están corriendo
   docker compose ps

5. Revisar logs si algo no funciona
   docker compose logs -f [servicio]

6. Trabajar en el código (cambios reflejados automáticamente con bind mounts)

7. Al terminar el día o la sesión
   docker compose down
```

---

## ✅ Verificación de Aprendizaje

1. ¿Cuál es la diferencia entre `docker run` y `docker compose up`?
2. ¿Qué problema resuelve la directiva `depends_on` con `condition: service_healthy` vs. la versión básica?
3. ¿Por qué es importante usar volúmenes para una base de datos en Docker Compose?
4. ¿Qué diferencia hay entre `docker compose down` y `docker compose down -v`?
5. ¿Por qué no se debe exponer el puerto de la base de datos al host en un entorno de producción?

---

## Siguiente Paso

Ahora que dominas Compose, veamos cómo empresas reales han transformado sus operaciones con estas herramientas.

➡️ Continúa con: [Tema 4 - Casos de Estudio Reales](./04-casos-de-estudio.md)
