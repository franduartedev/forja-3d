import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_STL_BYTES,
  SliceRequestError,
  validateSliceFormData,
} from "../src/slice-request.mjs";

function createValidFormData() {
  const formData = new FormData();

  formData.set(
    "file",
    new File(["solid test"], "pieza.stl", {
      type: "model/stl",
    }),
  );

  formData.set("printerProfileId", "biqu-b1-0.4");
  formData.set("layerHeightMm", "0.2");
  formData.set("infillPercent", "20");
  formData.set("supports", "false");
  formData.set("material", "pla");

  return formData;
}

test("acepta una solicitud válida", () => {
  const result = validateSliceFormData(createValidFormData());

  assert.equal(result.file.name, "pieza.stl");
  assert.deepEqual(result.settings, {
    printerProfileId: "biqu-b1-0.4",
    layerHeightMm: 0.2,
    infillPercent: 20,
    supports: false,
    material: "pla",
  });
});

test("rechaza solicitudes sin archivo", () => {
  const formData = createValidFormData();
  formData.delete("file");

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.ok(error instanceof SliceRequestError);
      assert.equal(error.code, "INVALID_FILE");
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test("rechaza archivos que no sean STL", () => {
  const formData = createValidFormData();

  formData.set(
    "file",
    new File(["contenido"], "pieza.obj", {
      type: "text/plain",
    }),
  );

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.equal(error.code, "INVALID_FILE");
      assert.match(error.message, /\.stl/);
      return true;
    },
  );
});

test("rechaza archivos mayores a 50 MB", () => {
  const formData = createValidFormData();

  const oversizedFile = new File(
    [new Uint8Array(MAX_STL_BYTES + 1)],
    "pieza.stl",
    {
      type: "model/stl",
    },
  );

  formData.set("file", oversizedFile);

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.equal(error.code, "FILE_TOO_LARGE");
      assert.equal(error.statusCode, 413);
      return true;
    },
  );
});

test("rechaza un perfil de impresora no habilitado", () => {
  const formData = createValidFormData();
  formData.set("printerProfileId", "impresora-desconocida");

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.equal(error.code, "INVALID_PRINTER_PROFILE");
      return true;
    },
  );
});

test("rechaza alturas de capa no permitidas", () => {
  const formData = createValidFormData();
  formData.set("layerHeightMm", "0.5");

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.equal(error.code, "INVALID_LAYER_HEIGHT");
      return true;
    },
  );
});

test("rechaza relleno fuera de rango", () => {
  const formData = createValidFormData();
  formData.set("infillPercent", "101");

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.equal(error.code, "INVALID_INFILL");
      return true;
    },
  );
});

test("rechaza supports con un valor distinto de true o false", () => {
  const formData = createValidFormData();
  formData.set("supports", "si");

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.equal(error.code, "INVALID_REQUEST");
      return true;
    },
  );
});

test("rechaza materiales no habilitados", () => {
  const formData = createValidFormData();
  formData.set("material", "abs");

  assert.throws(
    () => validateSliceFormData(formData),
    (error) => {
      assert.equal(error.code, "INVALID_MATERIAL");
      return true;
    },
  );
});
