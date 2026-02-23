# Tema 2: Construcción de Aplicaciones en Contenedores

> **Objetivo:** Aprender a escribir un Dockerfile efectivo, entender sus instrucciones principales y aplicar las buenas prácticas que usan los equipos de ingeniería en entornos corporativos.

---

## 2.1 El Dockerfile

Un **Dockerfile** es un archivo de texto plano (sin extensión) que contiene una secuencia de instrucciones declarativas para construir una imagen Docker. Piensa en él como la **receta** que Docker sigue para preparar el entorno de tu aplicación.

El flujo es siempre el mismo:

```
Dockerfile  ──→  docker build  ──→  Image  ──→  docker run  ──→  Container
 (Receta)         (Construir)      (Plantilla)   (Ejecutar)      (App viva)
```

### Instrucciones Principales

| Instrucción | Propósito | Ejemplo |
|-------------|-----------|---------|
| `FROM` | Define la **imagen base** sobre la cual construirás | `FROM node:20-alpine` |
| `WORKDIR` | Establece el **directorio de trabajo** dentro del contenedor | `WORKDIR /app` |
| `COPY` | Copia archivos desde el host **hacia** la imagen | `COPY package.json ./` |
| `ADD` | Similar a `COPY`, además acepta URLs y descomprime `.tar` | `ADD app.tar.gz /app` |
| `RUN` | Ejecuta comandos durante la **construcción** de la imagen | `RUN npm install` |
| `ENV` | Establece **variables de entorno** | `ENV NODE_ENV=production` |
| `EXPOSE` | Documenta el puerto que la app usa (no lo abre en el host) | `EXPOSE 3000` |
| `CMD` | Comando por defecto al **iniciar** el contenedor (reemplazable) | `CMD ["npm", "start"]` |
| `ENTRYPOINT` | Punto de entrada fijo del contenedor (no reemplazable fácilmente) | `ENTRYPOINT ["node"]` |
| `USER` | Define el usuario con el que correrá la aplicación | `USER appuser` |

> **`CMD` vs `ENTRYPOINT`:** Usa `ENTRYPOINT` cuando el contenedor siempre debe ejecutar el mismo proceso (ej. un servidor). Usa `CMD` para argumentos por defecto que el usuario puede sobreescribir al hacer `docker run`.

---

### Ejemplo Práctico: Aplicación Node.js

```dockerfile
# Etapa única — para aprendizaje inicial
FROM node:20-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar primero el archivo de dependencias (optimización de caché)
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el resto del código fuente
COPY . .

# Documentar el puerto de la aplicación
EXPOSE 3000

# Comando de inicio
CMD ["node", "server.js"]
```

> **Nota para el instructor:** Este ejemplo puede adaptarse fácilmente a otros stacks:
> - **Java/Spring Boot:** `FROM eclipse-temurin:21-jdk-alpine` + `RUN ./mvnw package`
> - **Python/FastAPI:** `FROM python:3.12-slim` + `RUN pip install -r requirements.txt`
> - **PHP/Laravel:** `FROM php:8.3-fpm-alpine` + `RUN composer install`

---

### ¿Por Qué el Orden de las Instrucciones Importa? (Caché de Capas)

Docker construye las imágenes en **capas**. Cada instrucción genera una capa, y Docker almacena estas capas en caché. Si una capa no cambia entre builds, Docker la reutiliza en lugar de reconstruirla.

```
┌─────────────────────────────┐ ← Capa 7: CMD ["node", "server.js"]
├─────────────────────────────┤ ← Capa 6: COPY . .          ← Cambia frecuentemente
├─────────────────────────────┤ ← Capa 5: RUN npm ci         ← Solo cambia si package.json cambia
├─────────────────────────────┤ ← Capa 4: COPY package.json  ← Solo cambia si package.json cambia
├─────────────────────────────┤ ← Capa 3: WORKDIR /app
├─────────────────────────────┤ ← Capa 2: FROM node:20-alpine ← Raramente cambia
└─────────────────────────────┘
```

**Regla de oro:** Coloca las instrucciones que **cambian con menos frecuencia al inicio** y las que **cambian más frecuentemente al final**. Copiar `package.json` antes del código fuente es el ejemplo clásico: `npm install` solo se vuelve a ejecutar cuando cambian las dependencias, no con cada cambio de código.

---

## 2.2 Buenas Prácticas de Construcción

Estas prácticas marcan la diferencia entre una imagen de calidad de producción y una imagen que funciona "pero que nadie debería usar en producción".

---

### Práctica 1: Multi-Stage Builds (Construcciones Multi-Etapa) ⭐

Es la técnica más importante para entornos corporativos. Permite usar una imagen pesada con todas las herramientas necesarias para **compilar** la aplicación (JDK, Maven, compiladores) y luego copiar **únicamente el artefacto final** a una imagen mínima para producción.

**Beneficios:**
- Imágenes de producción drásticamente más pequeñas.
- Menor superficie de ataque (sin compiladores ni herramientas de build en producción).
- Proceso de build reproducible y aislado.

**Ejemplo para Java (Spring Boot):**

```dockerfile
# ── Etapa 1: BUILD ──────────────────────────────────────────────
# Usamos el JDK completo con Maven para compilar
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build
COPY pom.xml .
# Descargar dependencias primero (optimización de caché)
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests

# ── Etapa 2: PRODUCCIÓN ──────────────────────────────────────────
# Usamos solo el JRE (mucho más ligero que el JDK)
FROM eclipse-temurin:21-jre-alpine AS production

WORKDIR /app
# Solo copiamos el .jar final desde la etapa de build
COPY --from=builder /build/target/app.jar ./app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

```
Imagen con JDK + Maven + código fuente:  ~500 MB
Imagen final con solo el JRE + .jar:    ~120 MB
Reducción:                              ~76%
```

---

### Práctica 2: Imágenes Base Ligeras

La elección de la imagen base tiene un impacto enorme en el tamaño, la velocidad y la seguridad.

| Imagen Base | Tamaño aproximado | Cuándo usarla |
|-------------|-------------------|---------------|
| `ubuntu:22.04` | ~77 MB | Compatibilidad máxima, desarrollo |
| `debian:bookworm-slim` | ~75 MB | Buena compatibilidad, algo más ligera |
| `alpine:3.19` | ~7 MB | Producción, cuando se prueba compatibilidad |
| `distroless` (Google) | ~2-20 MB | Producción con máxima seguridad |

> **¿Qué es Distroless?** Son imágenes de Google que no contienen shell (`bash`, `sh`), ni gestor de paquetes (`apt`, `apk`). Reducen la superficie de ataque al mínimo: un atacante que comprometa el contenedor no tiene herramientas para moverse lateralmente.

---

### Práctica 3: Usar `.dockerignore`

Funciona exactamente como `.gitignore`: le dice a Docker qué archivos **no** debe incluir al hacer `COPY . .`.

**`.dockerignore` recomendado:**

```
# Control de versiones
.git
.gitignore

# Dependencias (se instalan dentro del contenedor)
node_modules/
vendor/
target/

# Archivos de entorno locales (¡nunca deben ir en la imagen!)
.env
.env.local
*.env

# Logs
*.log
logs/

# Archivos de build y temporales
dist/
build/
.cache/
tmp/

# Documentación
*.md
docs/

# Configuración de IDE
.vscode/
.idea/
```

> ⚠️ **Alerta de seguridad:** El error más frecuente es copiar archivos `.env` con credenciales dentro de la imagen y luego subirla a un registry público. Usa `.dockerignore` y variables de entorno en tiempo de ejecución para manejar secretos.

---

### Práctica 4: No Ejecutar Como Root

Por defecto, los procesos dentro de un contenedor corren como el usuario `root`. Aunque el aislamiento de namespaces los contiene, es una **mala práctica de seguridad**: si una vulnerabilidad permite escapar del contenedor, el atacante tendría privilegios de superusuario en el host.

**Solución:** Crear un usuario dedicado sin privilegios:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .

# Crear un grupo y usuario sin privilegios
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Cambiar la propiedad de los archivos
RUN chown -R appuser:appgroup /app

# Cambiar al usuario sin privilegios antes de iniciar la app
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

---

### Práctica 5: Escaneo de Vulnerabilidades

Integrar el análisis de seguridad de imágenes en el pipeline de CI/CD es una práctica estándar en equipos maduros. Las herramientas más usadas:

| Herramienta | Descripción | Integración |
|-------------|-------------|-------------|
| **Docker Scout** | Nativa de Docker, integrada en Docker Hub y CLI | `docker scout cves mi-imagen:tag` |
| **Trivy** (Aqua Security) | Open source, muy completo, escanea imágenes y código | `trivy image mi-imagen:tag` |
| **Clair** (Quay.io) | Open source, orientado a pipelines CI | Integración vía API |

**Ejemplo de integración en un pipeline CI (GitHub Actions):**

```yaml
- name: Escanear imagen con Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'mi-empresa/mi-app:${{ github.sha }}'
    format: 'table'
    exit-code: '1'          # Falla el pipeline si hay vulnerabilidades CRÍTICAS
    severity: 'CRITICAL,HIGH'
```

> **Filosofía "Shift Left":** Al escanear durante el build del CI, detectas vulnerabilidades **antes** de que lleguen a producción, no después. Es exponencialmente más barato y seguro corregir un problema en el pipeline que en producción.

---

## 2.3 Comandos Esenciales de Build

```bash
# Construir una imagen con una etiqueta
docker build -t mi-empresa/mi-app:1.0 .

# Construir especificando el Dockerfile (si no se llama 'Dockerfile')
docker build -f Dockerfile.prod -t mi-empresa/mi-app:1.0 .

# Ver las capas e información de una imagen
docker image inspect mi-empresa/mi-app:1.0

# Ver el historial de capas (muy útil para optimizar)
docker history mi-empresa/mi-app:1.0

# Listar imágenes locales
docker images

# Eliminar una imagen
docker rmi mi-empresa/mi-app:1.0

# Subir la imagen al registry
docker push mi-empresa/mi-app:1.0
```

---

## ✅ Verificación de Aprendizaje

1. ¿Cuál es la diferencia entre `CMD` y `ENTRYPOINT`?
2. ¿Por qué se recomienda copiar `package.json` antes del código fuente al construir una imagen Node.js?
3. ¿Qué ventaja tiene un Multi-Stage Build sobre un Dockerfile de etapa única?
4. ¿Por qué ejecutar el proceso de la aplicación como `root` dentro del contenedor es un riesgo de seguridad?
5. ¿Qué función cumple el archivo `.dockerignore`?

---

## Siguiente Paso

Con tu imagen construida y optimizada, el siguiente paso es aprender a **coordinar múltiples contenedores** para levantar una aplicación completa.

➡️ Continúa con: [Tema 3 - Ejecución con Docker Compose](./03-docker-compose.md)
