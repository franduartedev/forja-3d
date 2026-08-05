# FORJA Slicer Service

Servicio HTTP de laminado para FORJA 3D.

Recibe modelos STL mediante una solicitud `multipart/form-data`, valida los parámetros de impresión, ejecuta PrusaSlicer dentro de Docker y devuelve el archivo G-code generado de forma síncrona.

## Estado actual

El servicio permite:

* validar archivos STL;
* limitar archivos a 50 MB;
* aplicar un perfil de impresora conocido;
* configurar altura de capa;
* configurar porcentaje de relleno;
* activar o desactivar soportes;
* seleccionar PLA, PLA+ o PETG;
* ejecutar PrusaSlicer con un timeout de 120 segundos;
* validar el G-code generado;
* limpiar los archivos temporales;
* devolver el G-code directamente por HTTP.

El perfil disponible actualmente es:

```text
biqu-b1-0.4
```

Corresponde a una BIQU B1 con boquilla de 0,4 mm.

## Estructura

```text
services/slicer/
├── Dockerfile
├── README.md
├── smoke-test/
│   ├── biqu-b1-smoke.ini
│   └── cube-20mm.stl
├── src/
│   ├── prusa-runner.mjs
│   ├── server.mjs
│   ├── slice-request.mjs
│   └── slice-service.mjs
└── tests/
```

## API

### `GET /health`

Comprueba que el servicio esté activo y que PrusaSlicer esté disponible.

Ejemplo:

```bash
curl http://localhost:3001/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "forja-slicer",
  "version": "0.1.0",
  "slicer": {
    "name": "PrusaSlicer",
    "version": "PrusaSlicer-2.9.2"
  },
  "profiles": [
    "biqu-b1-0.4"
  ]
}
```

Si PrusaSlicer no está disponible, responde con estado HTTP `503`.

### `POST /v1/slice`

Recibe un archivo STL y devuelve un archivo G-code.

La solicitud debe usar:

```text
Content-Type: multipart/form-data
```

#### Campos

| Campo              | Tipo                | Valores                    |
| ------------------ | ------------------- | -------------------------- |
| `file`             | archivo             | STL de hasta 50 MB         |
| `printerProfileId` | texto               | `biqu-b1-0.4`              |
| `layerHeightMm`    | texto numérico      | `0.12`, `0.2` o `0.28`     |
| `infillPercent`    | entero              | entre `0` y `100`          |
| `supports`         | booleano como texto | `true` o `false`           |
| `material`         | texto               | `pla`, `pla-plus` o `petg` |

#### Ejemplo

```bash
curl \
  --fail-with-body \
  -D /tmp/forja-slice-headers.txt \
  -X POST \
  -F "file=@services/slicer/smoke-test/cube-20mm.stl" \
  -F "printerProfileId=biqu-b1-0.4" \
  -F "layerHeightMm=0.2" \
  -F "infillPercent=20" \
  -F "supports=false" \
  -F "material=pla" \
  http://localhost:3001/v1/slice \
  --output /tmp/cube-20mm.gcode
```

El cuerpo de la respuesta contiene directamente el archivo G-code.

#### Headers de respuesta

```text
Content-Type: text/x-gcode
Content-Disposition: attachment; filename="cube-20mm.gcode"
X-Request-Id: identificador único
X-Printer-Profile-Id: biqu-b1-0.4
X-Layer-Height-Mm: 0.2
X-Infill-Percent: 20
X-Supports: false
X-Material: pla
```

El header `X-Request-Id` permite identificar una solicitud en registros y errores.

## Materiales

Las temperaturas actuales son configuraciones iniciales controladas por el servicio.

| Material | Boquilla |  Cama |
| -------- | -------: | ----: |
| PLA      |   200 °C | 60 °C |
| PLA+     |   210 °C | 60 °C |
| PETG     |   235 °C | 75 °C |

Estas temperaturas no pueden ser enviadas libremente por el cliente.

## Errores

Los errores se devuelven como JSON.

Ejemplo:

```json
{
  "error": {
    "code": "SLICING_FAILED",
    "message": "PrusaSlicer no pudo generar el archivo G-code.",
    "requestId": "identificador-de-la-solicitud"
  }
}
```

Códigos principales:

| Código                    | Descripción                            |
| ------------------------- | -------------------------------------- |
| `INVALID_FILE`            | falta el archivo o no es un STL válido |
| `FILE_TOO_LARGE`          | el archivo supera los 50 MB            |
| `INVALID_PRINTER_PROFILE` | perfil de impresora no soportado       |
| `INVALID_LAYER_HEIGHT`    | altura de capa no permitida            |
| `INVALID_INFILL`          | relleno fuera del rango permitido      |
| `INVALID_SUPPORTS`        | valor de soportes inválido             |
| `INVALID_MATERIAL`        | material no soportado                  |
| `UNSUPPORTED_MEDIA_TYPE`  | la solicitud no usa multipart          |
| `INVALID_MULTIPART`       | el formulario no pudo interpretarse    |
| `SLICING_FAILED`          | PrusaSlicer falló o superó el timeout  |

## Seguridad y límites

* tamaño máximo del STL: 50 MB;
* timeout de laminado: 120 segundos;
* perfiles controlados por el servidor;
* argumentos enviados a PrusaSlicer sin construir comandos de shell;
* nombres de archivos sanitizados;
* directorio temporal independiente por solicitud;
* limpieza de archivos temporales incluso ante errores;
* el cliente no puede enviar G-code inicial o final;
* el servicio no inicia una impresión automáticamente.

## Docker

Construir la imagen:

```bash
sudo docker build \
  -t forja-slicer:latest \
  -f services/slicer/Dockerfile \
  .
```

Ejecutar el servicio:

```bash
sudo docker run --rm \
  --name forja-slicer \
  -p 3001:3001 \
  forja-slicer:latest
```

El servicio queda disponible en:

```text
http://localhost:3001
```

Detenerlo desde otra terminal:

```bash
sudo docker stop forja-slicer
```

## Pruebas

Ejecutar todas las pruebas del servicio:

```bash
node --test services/slicer/tests/*.test.mjs
```

La suite cubre:

* validación del formulario;
* límites y formatos;
* endpoint de salud;
* endpoint de laminado;
* errores HTTP;
* creación y limpieza de temporales;
* construcción de argumentos de PrusaSlicer;
* temperaturas por material;
* soportes;
* timeout;
* validación del G-code resultante.

## Smoke test de Docker

Durante la construcción de la imagen se lamina:

```text
services/slicer/smoke-test/cube-20mm.stl
```

utilizando:

```text
services/slicer/smoke-test/biqu-b1-smoke.ini
```

La construcción falla si PrusaSlicer no puede generar un G-code válido.

## Limitaciones actuales

* solo existe el perfil `biqu-b1-0.4`;
* el procesamiento es síncrono;
* no hay cola de trabajos;
* no se almacena el G-code después de responder;
* todavía no se calculan tiempo estimado ni gramos de filamento;
* no se comprueba todavía si el modelo excede la cama;
* no se repara automáticamente un STL no manifold;
* el servicio todavía no autentica usuarios.

## Próximos pasos

* conectar el frontend de FORJA con `POST /v1/slice`;
* mostrar progreso y errores comprensibles;
* extraer tiempo estimado y consumo de filamento;
* añadir validación de dimensiones contra la cama;
* añadir más perfiles de impresoras;
* incorporar una cola de trabajos si aumenta la carga;
* aplicar límites por usuario antes de una publicación abierta.
