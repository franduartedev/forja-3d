# Arquitectura de FORJA

## Estado actual

La aplicación web genera geometría en el navegador, permite editarla y exporta
STL, 3MF y STEP. El frontend se publica como un Worker compatible con Sites.

## Próxima etapa: laminado

El G-code depende de la impresora, boquilla, firmware, material y perfil de
calidad. Por eso FORJA no debe generarlo en el Worker ni tratarlo como un formato
de exportación genérico.

```text
Editor FORJA
    -> STL + ajustes validados
    -> API de laminado
    -> PrusaSlicer CLI
    -> G-code + estimaciones + advertencias
    -> descarga o envío a OctoPrint
```

### Frontend

- Construye el STL.
- Muestra solamente perfiles habilitados por el servidor.
- Envía ajustes estructurados, nunca comandos libres.
- Previsualiza resultado, tiempo y material.
- Exige confirmación antes de iniciar una impresión remota.

### Servicio de laminado

- Se ejecutará en un contenedor separado del frontend.
- Mantendrá perfiles de impresora versionados.
- Invocará PrusaSlicer sin shell y con tiempo/memoria limitados.
- Procesará cada trabajo en una carpeta temporal aislada.
- Validará el STL y sus dimensiones antes de laminar.
- Devolverá el G-code como descarga; no iniciará impresiones.

### OctoPrint

La primera integración solo subirá el G-code a la estación Enova. Seleccionar o
comenzar la impresión serán acciones separadas. La cámara y Home Assistant no
forman parte de esta etapa.

## Primer perfil

El contrato inicial usa `biqu-b1-0.4`: BIQU B1, firmware Marlin, volumen de
235 × 235 × 270 mm y boquilla de 0,4 mm. Antes de habilitar G-code para usuarios,
este perfil debe compararse contra el perfil real usado por Fran en Cura y
validarse con impresiones pequeñas.

## Evolución prevista

1. Panel “Preparar impresión” conectado al contrato compartido.
2. Servicio local de laminado en la PC principal.
3. Perfil BIQU B1 calibrado y pruebas con PLA.
4. Descarga de G-code con vista previa por capas.
5. Envío opcional a OctoPrint en la Enova.
6. Nuevos perfiles aportados y revisados por la comunidad.

