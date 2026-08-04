# FORJA Slicer Service

Este directorio reserva el límite del servicio que ejecutará el laminador. No
contiene todavía un binario ni genera G-code: la V1 de esta etapa define primero
el contrato, las validaciones y el perfil de prueba.

## API prevista

### `GET /health`

Informa versión del servicio, versión de PrusaSlicer y perfiles disponibles.

### `POST /v1/slice`

Recibe un STL y los ajustes definidos en `lib/slicing-contract.ts`. Devuelve:

- G-code descargable;
- perfil y versión utilizados;
- tiempo y material estimados;
- advertencias del laminador;
- identificador temporal del trabajo.

## Límites iniciales

- máximo 25 MB por STL;
- un único perfil habilitado: `biqu-b1-0.4`;
- sin G-code inicial/final enviado por el cliente;
- sin inicio automático de impresión;
- tiempo máximo de laminado y carpeta temporal por trabajo.

