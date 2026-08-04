# FORJA 3D — guía para agentes

## Objetivo

FORJA es una aplicación web open source, Argentina primero, para crear piezas
imprimibles sin exigir conocimientos previos de CAD.

## Comandos obligatorios

Antes de entregar cambios de código:

```bash
npm run lint
npm run typecheck
npm test
```

## Arquitectura

- `app/`: interfaz web y experiencia del editor.
- `lib/`: geometría, operaciones, persistencia y contratos compartidos.
- `services/slicer/`: especificación del futuro servicio nativo de laminado.
- `tests/`: pruebas unitarias y de exportación.
- `docs/`: decisiones de arquitectura y guías de desarrollo.

El frontend publicado en Sites nunca debe ejecutar ni simular G-code. El
laminado pertenece a un servicio separado que ejecutará PrusaSlicer con
perfiles aprobados y versionados.

## Seguridad de impresión

- No generar G-code sin un perfil de impresora explícito.
- No aceptar comandos G-code personalizados desde el navegador.
- Validar volumen de impresión, boquilla, altura de capa y temperaturas.
- Usar argumentos estructurados al invocar el laminador; nunca concatenar un
  comando de shell con datos del usuario.
- Descargar o enviar el G-code solamente después de mostrar impresora, material
  y perfil utilizados.
- Iniciar una impresión remota requiere una confirmación independiente del
  usuario. Subir un archivo a OctoPrint no implica comenzar a imprimir.

## Producto y UX

- Mantener la interfaz en español rioplatense claro.
- Priorizar controles visuales, cómodos y progresivos.
- No saturar el editor con paneles permanentes.
- Todo diseño inicial debe quedar completamente editable.
- No afirmar que una pieza está “lista para imprimir” si solo fue exportada en
  STL/3MF/STEP o si el laminado todavía no terminó.

