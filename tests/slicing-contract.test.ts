import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SLICE_SETTINGS,
  type SliceRequest,
  validateSliceRequest,
} from "../lib/slicing-contract";

function request(overrides: Partial<SliceRequest> = {}): SliceRequest {
  return {
    schemaVersion: 1,
    model: {
      fileName: "pieza-forja.stl",
      byteLength: 2048,
      bounds: { width: 80, depth: 50, height: 30 },
    },
    settings: DEFAULT_SLICE_SETTINGS,
    ...overrides,
  };
}

test("default BIQU B1 slicing request is valid", () => {
  assert.deepEqual(validateSliceRequest(request()), { errors: [], warnings: [] });
});

test("rejects models outside the BIQU B1 print volume", () => {
  const result = validateSliceRequest(
    request({
      model: {
        fileName: "pieza-grande.stl",
        byteLength: 2048,
        bounds: { width: 236, depth: 200, height: 20 },
      },
    }),
  );
  assert.match(result.errors.join(" "), /volumen de impresión/i);
});

test("rejects unsafe or malformed slicing inputs", () => {
  const result = validateSliceRequest(
    request({
      model: {
        fileName: "vacio.stl",
        byteLength: 0,
        bounds: { width: 0, depth: 50, height: 30 },
      },
      settings: { ...DEFAULT_SLICE_SETTINGS, infillPercent: 120 },
    }),
  );
  assert.match(result.errors.join(" "), /relleno/i);
  assert.match(result.errors.join(" "), /límites inválidos/i);
  assert.match(result.errors.join(" "), /vacío/i);
});

