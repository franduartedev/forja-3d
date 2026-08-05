import assert from "node:assert/strict";
import test from "node:test";
import {
  modelPrimarySpec,
  modelVolumeCm3,
  TEMPLATES,
  validateModel,
  validateObjects,
} from "../lib/models";

test("every template default is valid and has useful output", () => {
  for (const template of TEMPLATES) {
    const validation = validateModel(template.id, template.defaults);
    assert.deepEqual(validation.errors, [], template.id);
    const spec = modelPrimarySpec(template.id, template.defaults);
    assert.ok(spec.label.length > 0);
    assert.match(spec.value, /mm/);
  }
});

test("required, finite and positive measurements are enforced", () => {
  const missingWall = validateModel("box", {
    width: 80,
    depth: 50,
    height: 30,
    bottom: 2,
  });
  assert.ok(missingWall.errors.length > 0);

  const invalidWidth = validateModel("plate", {
    width: Number.NaN,
    depth: 60,
    thickness: 3,
    holeDiameter: 4,
    margin: 10,
  });
  assert.ok(invalidWidth.errors.length > 0);

  const invalidThickness = validateModel("bracket", {
    width: 60,
    depth: 35,
    height: 45,
    thickness: 45,
    holeDiameter: 4.5,
  });
  assert.match(invalidThickness.errors.join(" "), /espesor/i);
});

test("volume estimates remain finite and positive for printable defaults", () => {
  for (const template of TEMPLATES.filter((item) => item.id !== "free")) {
    const volume = modelVolumeCm3(template.id, template.defaults);
    assert.ok(Number.isFinite(volume), template.id);
    assert.ok(volume > 0, template.id);
  }
  assert.equal(modelVolumeCm3("free", TEMPLATES[3].defaults), 0);
});

test("custom object validation catches invalid geometry and duplicate IDs", () => {
  const base = {
    id: "same",
    kind: "cube" as const,
    name: "Cubo",
    x: 0,
    y: 0,
    z: 0,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
  };
  assert.deepEqual(validateObjects([base]), []);
  const errors = validateObjects([
    base,
    { ...base, width: -1, x: Number.NaN },
  ]);
  assert.match(errors.join(" "), /inválidas/i);
  assert.match(errors.join(" "), /duplicado/i);
});

test("tube validation keeps the inner diameter inside the outer diameter", () => {
  const tube = {
    id: "tube",
    kind: "tube" as const,
    name: "Tubo",
    x: 0,
    y: 0,
    z: 0,
    width: 18,
    depth: 18,
    height: 10,
    rotation: 0,
  };
  assert.match(validateObjects([tube]).join(" "), /diámetro interior/i);
  assert.deepEqual(validateObjects([{ ...tube, depth: 10 }]), []);
});
