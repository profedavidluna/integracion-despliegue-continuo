# Tema 3: Automatización de Builds y Pruebas Unitarias

> **Objetivo:** Implementar el núcleo del pipeline de CI — la automatización del proceso de construcción y la ejecución de pruebas — aplicando el principio de **feedback rápido** que distingue a los equipos de alto rendimiento.

---

## El Principio Rector: Feedback Rápido

El objetivo de automatizar builds y pruebas en un pipeline de CI no es solo ejecutarlos — es ejecutarlos lo suficientemente rápido como para que el desarrollador pueda **corregir el error en el mismo contexto mental** en que lo cometió.

La investigación de la industria establece una regla empírica:

| Tiempo del pipeline | Efecto en el equipo |
|--------------------|---------------------|
| **< 5 minutos** | El desarrollador espera el resultado antes de empezar otra tarea |
| **5–10 minutos** | Puede cambiar de contexto brevemente, aún útil |
| **10–20 minutos** | El contexto mental se pierde; el error cuesta más corregir |
| **> 20 minutos** | La herramienta deja de ser útil como feedback loop |

> **Objetivo práctico:** El pipeline principal de CI (build + pruebas unitarias) debe completarse en **menos de 10 minutos**. Si tarda más, investiga qué etapa es el cuello de botella y optimízala.

---

## Etapa 1: Ejecución del Build (Construcción)

El build es la etapa donde el código fuente se transforma en algo ejecutable. Sus objetivos son:

1. **Descargar dependencias** — los paquetes y librerías que el proyecto necesita.
2. **Compilar el código** — en lenguajes compilados (Java, C#, Go, TypeScript), detecta errores de sintaxis y tipo.
3. **Verificar que el proyecto está en un estado consistente** — que todas las dependencias resuelven correctamente.

### Comandos de Build por Ecosistema

| Ecosistema | Herramienta | Comando de Build |
|------------|-------------|-----------------|
| Java | Maven | `mvn clean package -DskipTests` |
| Java | Gradle | `./gradlew build -x test` |
| .NET | dotnet CLI | `dotnet build --configuration Release` |
| Node.js | npm | `npm ci && npm run build` |
| Python | pip + setuptools | `pip install -r requirements.txt && python setup.py build` |
| Go | go | `go build ./...` |
| Rust | cargo | `cargo build --release` |

> **`npm ci` vs `npm install`:** En pipelines de CI siempre usa `npm ci` (clean install). Instala exactamente las versiones del `package-lock.json`, es más rápido y reproducible, y falla si hay inconsistencias entre `package.json` y el lock file.

### Caché de Dependencias: Un Optimizador Crítico

Descargar dependencias desde internet en cada ejecución del pipeline puede representar el 60–80% del tiempo total. La solución es el **caché de dependencias**:

```yaml
# GitHub Actions: caché automática de Maven
- name: Configurar JDK con caché Maven
  uses: actions/setup-java@v4
  with:
    java-version: '17'
    distribution: 'temurin'
    cache: maven  # ← Activa caché automática del repositorio local de Maven
```

```yaml
# GitHub Actions: caché manual de npm
- name: Cachear node_modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

El `hashFiles` genera una clave de caché basada en el contenido del archivo de lock. Si las dependencias no cambian, se usa el caché. Si el lock file cambia, se invalida el caché y se descargan las nuevas dependencias.

---

## Etapa 2: Pruebas Unitarias

Las pruebas unitarias son la columna vertebral de la CI. Son pruebas **rápidas, aisladas e independientes** que validan el comportamiento de clases, funciones o módulos individuales sin depender de sistemas externos (bases de datos, APIs, sistema de archivos).

### Características de una Prueba Unitaria Bien Escrita

| Característica | Descripción |
|---------------|-------------|
| **Rápida** | Millisegundos, no segundos. Miles de pruebas deben ejecutarse en minutos |
| **Aislada** | No depende del orden de ejecución, no comparte estado con otras pruebas |
| **Repetible** | Produce el mismo resultado en cualquier máquina, en cualquier momento |
| **Auto-validante** | Pasa o falla sin intervención humana; no requiere inspección manual |
| **Oportuna** | Se escribe antes o durante el desarrollo (TDD o BDD), no después |

### El Principio Fail Fast

> Si **una sola prueba falla**, el pipeline debe detenerse inmediatamente y notificar al equipo. No tiene sentido continuar ejecutando etapas posteriores (análisis de calidad, empaquetado, despliegue) si el código ya está roto.

```
Prueba 1: ✅ PASS
Prueba 2: ✅ PASS
Prueba 3: ❌ FAIL ← Pipeline se detiene aquí
Prueba 4: (no ejecutada)
...
Notificación enviada al desarrollador
```

**Comandos de ejecución de pruebas por ecosistema:**

| Ecosistema | Herramienta de Pruebas | Comando |
|------------|------------------------|---------|
| Java | JUnit + Maven | `mvn test` |
| Java | JUnit + Gradle | `./gradlew test` |
| .NET | xUnit / NUnit | `dotnet test` |
| Node.js | Jest | `npm test` o `npx jest` |
| Python | pytest | `pytest tests/` |
| Go | go test | `go test ./...` |
| Ruby | RSpec | `bundle exec rspec` |

---

## Etapa 3: Métricas de Calidad y Cobertura de Código

La cobertura de código mide qué porcentaje del código fuente es ejecutado por las pruebas automatizadas. No es una métrica perfecta, pero es un indicador útil de gaps en el testing.

### ¿Qué Es la Cobertura de Código?

```java
public class Calculadora {
    public int sumar(int a, int b) {      // ← Cubierto por test ✅
        return a + b;
    }

    public int dividir(int a, int b) {    // ← ¿Cubierto?
        if (b == 0) {                     // ← Rama NOT cubierta ❌
            throw new ArithmeticException("División por cero");
        }
        return a / b;                     // ← Línea cubierta ✅
    }
}
// Cobertura de líneas: 3/4 = 75%
// Cobertura de ramas: 1/2 = 50%
```

### Herramientas de Cobertura por Ecosistema

| Ecosistema | Herramienta | Reporte generado |
|------------|-------------|-----------------|
| Java (Maven) | **JaCoCo** | HTML, XML (integra con SonarQube) |
| Java (Gradle) | **JaCoCo** | HTML, XML |
| .NET | **Coverlet** | Cobertura XML, lcov |
| Node.js | **Istanbul / nyc / Jest coverage** | lcov, HTML |
| Python | **Coverage.py** | HTML, XML |
| Go | **go test -cover** | Nativo |

### Configuración de JaCoCo en Maven

```xml
<!-- pom.xml -->
<build>
    <plugins>
        <plugin>
            <groupId>org.jacoco</groupId>
            <artifactId>jacoco-maven-plugin</artifactId>
            <version>0.8.11</version>
            <executions>
                <execution>
                    <goals>
                        <goal>prepare-agent</goal>
                    </goals>
                </execution>
                <execution>
                    <id>report</id>
                    <phase>test</phase>
                    <goals>
                        <goal>report</goal>
                    </goals>
                </execution>
                <!-- Falla el build si la cobertura es menor al 80% -->
                <execution>
                    <id>check</id>
                    <goals>
                        <goal>check</goal>
                    </goals>
                    <configuration>
                        <rules>
                            <rule>
                                <element>BUNDLE</element>
                                <limits>
                                    <limit>
                                        <counter>LINE</counter>
                                        <value>COVEREDRATIO</value>
                                        <minimum>0.80</minimum>
                                    </limit>
                                </limits>
                            </rule>
                        </rules>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

Con esta configuración, `mvn verify` fallará si la cobertura de líneas cae por debajo del 80%, haciendo cumplir el estándar de calidad automáticamente en el pipeline.

### ¿Cuánta Cobertura es Suficiente?

| Contexto | Umbral mínimo recomendado |
|----------|---------------------------|
| Proyecto nuevo (greenfield) | **> 80%** (establece el estándar desde el inicio) |
| Proyecto maduro con CI establecida | **> 70–80%** (mantener y mejorar gradualmente) |
| Proyecto legacy (brownfield) | **No bajar del nivel actual** + incrementar gradualmente |
| Código crítico (pagos, seguridad) | **> 90%** |

> **Anti-patrón a evitar:** Escribir pruebas unitarias vacías o triviales solo para aumentar el porcentaje de cobertura sin validar comportamiento real. La cobertura es un indicador de riesgo, no un objetivo en sí mismo.

---

## Análisis Estático de Código

Además de las pruebas funcionales, el pipeline de CI puede incluir herramientas que analizan el código sin ejecutarlo, buscando:

- Vulnerabilidades de seguridad conocidas
- Código duplicado (que indica oportunidades de refactorización)
- Violaciones de estilo de código (que dificultan el mantenimiento)
- Complejidad ciclomática excesiva (código difícil de probar y mantener)

| Herramienta | Ecosistema | Qué detecta |
|-------------|------------|-------------|
| **SonarQube / SonarCloud** | Multi-lenguaje | Bugs, vulnerabilidades, code smells, cobertura |
| **Checkstyle** | Java | Estilo de código (convenciones) |
| **SpotBugs** | Java | Bugs potenciales en bytecode |
| **ESLint** | JavaScript/TypeScript | Estilo, errores, mejores prácticas |
| **Pylint / Flake8** | Python | Estilo PEP-8, errores comunes |
| **Dependabot / Snyk** | Multi-lenguaje | Vulnerabilidades en dependencias |

---

## Publicación de Resultados

Los reportes generados por las pruebas y el análisis de cobertura deben hacerse visibles en la interfaz del servidor de CI, no solo en los logs.

```yaml
# GitHub Actions: publicar resultados de pruebas Jest
- name: Publicar resultados de pruebas
  uses: dorny/test-reporter@v1
  if: always()  # ← Se ejecuta aunque las pruebas fallen
  with:
    name: Jest Tests
    path: reports/jest-results.xml
    reporter: jest-junit

# GitHub Actions: publicar cobertura en el comentario del PR
- name: Publicar cobertura
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/lcov.info
```

---

## Actividad Práctica

> **Ejercicio para el equipo:** Toma un proyecto existente y responde estas preguntas con datos reales:
>
> 1. Ejecuta `mvn test` (o el equivalente) y mide cuánto tarda. ¿Cumple el objetivo de < 10 minutos?
> 2. Configura JaCoCo (o la herramienta equivalente) y ejecuta el análisis de cobertura. ¿Qué porcentaje obtienes?
> 3. Identifica el módulo o clase con menor cobertura. ¿Qué casos de prueba faltan?
>
> Estos datos son el punto de partida para establecer umbrales de calidad realistas en tu pipeline.

---

## Siguiente Paso

Con los builds y pruebas automatizadas, es momento de ver las reglas organizacionales que hacen que todo esto funcione en un equipo real.

➡️ Continúa con: [Tema 4 - Mejores Prácticas en Integración Continua](./04-mejores-practicas.md)
