# Tema 1: Fundamentos de Contenedores

> **Objetivo:** Comprender qué es un contenedor, en qué se diferencia de una Máquina Virtual y cuáles son los mecanismos del sistema operativo que lo hacen posible.

---

## 1.1 ¿Qué es un Contenedor?

### La Analogía del Transporte Marítimo

Para entender los contenedores de software, la mejor analogía proviene de la industria del transporte marítimo.

**Antes del contenedor estándar (pre-1956):**
- Las mercancías se empacaban de formas distintas: cajas de madera, barriles, sacos, etc.
- Cada barco, grúa y tren tenía un diseño diferente.
- La carga y descarga era lenta, cara y propensa a errores.
- Los productos se dañaban frecuentemente durante el traslado.

**Después del contenedor estándar (Malcom McLean, 1956):**
- Un solo formato estándar para cualquier mercancía.
- Las grúas, barcos y camiones se diseñaron para manejar **una sola interfaz**.
- La carga y descarga pasó de días a horas.
- El comercio global se aceleró radicalmente.

```
┌─────────────────────────────────────────────────┐
│           CONTENEDOR DE TRANSPORTE              │
│                                                 │
│  [ Ropa ]  [ Electrónicos ]  [ Alimentos ]      │
│                                                 │
│  La grúa no sabe qué hay adentro.               │
│  Solo sabe cómo manejar el contenedor.          │
└─────────────────────────────────────────────────┘
```

### La Equivalencia en Software

Un **contenedor de software** aplica el mismo principio:

- **Problema histórico:** Las aplicaciones se desplegaban de formas distintas. Cada equipo tenía su propio proceso, sus propias dependencias, su propio SO. Migrar entre entornos era doloroso e impredecible.
- **Solución:** Un contenedor es una **unidad de software estándar** que empaqueta el código de la aplicación **junto con todas sus dependencias** (bibliotecas, configuraciones y binarios de sistema).

> **Resultado clave:** La aplicación se ejecuta de manera **idéntica** en el portátil del desarrollador, en el servidor de pruebas y en la nube de producción. El problema del *"en mi máquina sí funciona"* desaparece por diseño.

---

## 1.2 Contenedores vs. Máquinas Virtuales (VMs)

Una confusión frecuente es pensar que un contenedor es simplemente una *"VM ligera"*. Son tecnologías diferentes con filosofías distintas.

### Máquinas Virtuales

```
┌─────────────────────────────────────────────┐
│              Hardware Físico                │
├─────────────────────────────────────────────┤
│              Hypervisor (VMware, etc.)      │
├──────────────┬──────────────┬───────────────┤
│   VM 1       │   VM 2       │   VM 3        │
│  ┌────────┐  │  ┌────────┐  │  ┌────────┐   │
│  │  App   │  │  │  App   │  │  │  App   │   │
│  ├────────┤  │  ├────────┤  │  ├────────┤   │
│  │  OS    │  │  │  OS    │  │  │  OS    │   │
│  │ invitado│  │  │ invitado│  │  │ invitado│  │
│  └────────┘  │  └────────┘  │  └────────┘   │
└──────────────┴──────────────┴───────────────┘
```

- **Virtualizan el hardware.**
- Cada VM ejecuta un **Sistema Operativo completo** (Windows, Linux, etc.).
- Peso: varios **Gigabytes** por VM.
- Tiempo de inicio: **varios minutos**.
- Aislamiento: muy alto.

### Contenedores

```
┌─────────────────────────────────────────────┐
│              Hardware Físico                │
├─────────────────────────────────────────────┤
│        Sistema Operativo Anfitrión          │
├─────────────────────────────────────────────┤
│            Docker Engine (Runtime)          │
├──────────────┬──────────────┬───────────────┤
│ Contenedor 1 │ Contenedor 2 │ Contenedor 3  │
│  ┌────────┐  │  ┌────────┐  │  ┌────────┐   │
│  │  App   │  │  │  App   │  │  │  App   │   │
│  ├────────┤  │  ├────────┤  │  ├────────┤   │
│  │ Libs   │  │  │ Libs   │  │  │ Libs   │   │
│  └────────┘  │  └────────┘  │  └────────┘   │
└──────────────┴──────────────┴───────────────┘
       ↑ Comparten el kernel del SO anfitrión
```

- **Virtualizan el Sistema Operativo.**
- Comparten el **kernel** del sistema anfitrión.
- Peso: **Megabytes** por contenedor.
- Tiempo de inicio: **milisegundos**.
- Aislamiento: alto (a nivel de proceso).

### Tabla Comparativa

| Característica | Máquina Virtual | Contenedor |
|----------------|-----------------|------------|
| Qué virtualiza | Hardware | Sistema Operativo |
| Tamaño | Gigabytes | Megabytes |
| Tiempo de inicio | Minutos | Milisegundos |
| Sistema Operativo propio | Sí (completo) | No (comparte kernel) |
| Portabilidad | Media | Alta |
| Densidad (apps por servidor) | Baja | Alta |
| Uso típico | Aislamiento total de OS | Aplicaciones y microservicios |

> **¿Cuándo usar VMs vs. Contenedores?** Las VMs son ideales cuando necesitas ejecutar un SO diferente (ej. Windows en un host Linux) o cuando el aislamiento total del hardware es un requerimiento de seguridad. Para el ciclo de vida moderno de aplicaciones, los contenedores son la herramienta estándar.

---

## 1.3 Arquitectura Base: La Magia de Linux

Los contenedores no son magia. Son una **abstracción elegante** construida sobre dos características del kernel de Linux que existen desde hace décadas.

### Namespaces (Espacios de Nombre): El Aislamiento

Los namespaces responden a la pregunta: **¿cómo hace el contenedor para "creer" que es el único proceso en el sistema?**

Un namespace crea una vista aislada de un recurso del sistema operativo. Docker utiliza múltiples tipos de namespaces simultáneamente:

| Namespace | Qué aísla |
|-----------|-----------|
| `pid` | Árbol de procesos (el contenedor solo ve sus propios procesos) |
| `net` | Interfaces de red (cada contenedor tiene su propia IP) |
| `mnt` | Sistema de archivos (el contenedor tiene su propio `/`) |
| `uts` | Hostname y nombre de dominio |
| `ipc` | Comunicación entre procesos |
| `user` | UIDs y GIDs (mapeo de usuarios) |

### Cgroups (Control Groups): La Gestión de Recursos

Los cgroups responden a la pregunta: **¿cómo se evita que un contenedor consuma todos los recursos del servidor?**

Permiten **limitar, medir y controlar** el uso de recursos del hardware:

- **CPU:** Limitar cuántos núcleos puede usar un contenedor.
- **Memoria RAM:** Establecer un techo de memoria (el contenedor se detiene si lo supera).
- **I/O de disco:** Controlar la velocidad de lectura/escritura.
- **Red:** Limitar el ancho de banda disponible.

> **Problema del "vecino ruidoso" (*noisy neighbor*):** En un servidor con múltiples contenedores, sin cgroups, una aplicación con un bug de memoria podría consumir todos los recursos y afectar al resto. Los cgroups son la barrera que garantiza que cada contenedor opere dentro de sus límites declarados.

### Resumen Visual de la Arquitectura

```
┌──────────────────────────────────────────────────┐
│                  Tu Aplicación                   │
├──────────────────────────────────────────────────┤
│                  Docker Engine                   │
│   ┌────────────────┐  ┌───────────────────────┐  │
│   │   Namespaces   │  │       Cgroups         │  │
│   │  (Aislamiento) │  │  (Límites de Recursos)│  │
│   └────────────────┘  └───────────────────────┘  │
├──────────────────────────────────────────────────┤
│              Kernel de Linux                     │
├──────────────────────────────────────────────────┤
│              Hardware Físico                     │
└──────────────────────────────────────────────────┘
```

---

## 1.4 Conceptos Clave de Docker

Docker es la plataforma de contenedores más ampliamente adoptada. Antes de usarla, es esencial dominar su vocabulario central.

### Docker Image (Imagen)

- Es una **plantilla de solo lectura** con las instrucciones para crear un contenedor.
- Se construye en **capas** (cada instrucción del Dockerfile genera una capa). Esto permite la reutilización y la optimización del almacenamiento.
- **Analogía de programación:** Es como una **clase en Java** o un **archivo `.jar`**: define el molde, pero no es la aplicación en ejecución.

### Docker Container (Contenedor)

- Es la **instancia en ejecución** de una imagen.
- Una misma imagen puede originar múltiples contenedores en paralelo.
- **Analogía de programación:** Es como un **objeto instanciado** a partir de una clase.

```
Imagen (Image)  ──→  docker run  ──→  Contenedor (Container)
   (Clase)                               (Objeto)
```

### Docker Registry (Registro)

- Es el repositorio donde se almacenan y distribuyen las imágenes.
- **Docker Hub** (`hub.docker.com`) es el registro público por defecto: contiene miles de imágenes oficiales (`nginx`, `postgres`, `node`, `python`, etc.).
- Las empresas suelen operar registros privados: **Amazon ECR**, **Google Artifact Registry**, **Azure Container Registry**, **Harbor**.

```
Desarrollador  →  docker push  →  Registry  →  docker pull  →  Servidor de Producción
```

---

## ✅ Verificación de Aprendizaje

Antes de continuar, asegúrate de poder responder estas preguntas:

1. ¿Cuál es la diferencia fundamental entre un contenedor y una Máquina Virtual?
2. ¿Qué mecanismo del kernel de Linux garantiza que el contenedor no vea los procesos de otros contenedores?
3. ¿Qué mecanismo del kernel de Linux evita que un contenedor consuma toda la memoria del servidor?
4. ¿Cuál es la relación entre una imagen Docker y un contenedor Docker?
5. ¿Qué es un Docker Registry y por qué las empresas tienen registros privados?

---

## Siguiente Paso

Ahora que entiendes los fundamentos, es momento de **construir tu primera imagen**.

➡️ Continúa con: [Tema 2 - Construcción de Aplicaciones en Contenedores](./02-construccion-con-docker.md)
