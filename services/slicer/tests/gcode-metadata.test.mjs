import assert from "node:assert/strict";
import test from "node:test";

import {
  parseGcodeMetadata,
} from "../src/gcode-metadata.mjs";

test("extrae tiempo y consumo de filamento del G-code", () => {
  const gcode = `
; filament used [mm] = 4503.71
; filament used [cm3] = 10.83
; estimated printing time (normal mode) = 50m 41s
`;

  const metadata = parseGcodeMetadata(
    gcode,
    "pla",
  );

  assert.equal(
    metadata.estimatedPrintTime,
    "50m 41s",
  );

  assert.equal(
    metadata.estimatedPrintTimeSeconds,
    3041,
  );

  assert.equal(
    metadata.filamentMillimeters,
    4503.71,
  );

  assert.equal(
    metadata.filamentMeters,
    4.50371,
  );

  assert.equal(
    metadata.filamentVolumeCm3,
    10.83,
  );

  assert.ok(
    Math.abs(metadata.filamentGrams - 13.4292) <
      0.0001,
  );
});

test("devuelve null cuando el G-code no contiene métricas", () => {
  const metadata = parseGcodeMetadata(
    "G28\nG1 X10 Y10",
    "pla",
  );

  assert.equal(metadata.estimatedPrintTime, null);
  assert.equal(
    metadata.estimatedPrintTimeSeconds,
    null,
  );
  assert.equal(metadata.filamentMeters, null);
  assert.equal(metadata.filamentGrams, null);
});
