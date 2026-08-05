import assert from "node:assert/strict";
import test from "node:test";
import {
  isTemplateId,
  recordValue,
  restoreCutouts,
  restoreKnownSettings,
  restoreMeasurements,
  restoreObjects,
} from "../lib/project-storage";
import type { Cutout, CustomObject } from "../lib/models";

const fallbackObject: CustomObject = {
  id: "fallback",
  kind: "cube",
  name: "Cubo",
  x: 0,
  y: 0,
  z: 0,
  width: 10,
  depth: 10,
  height: 10,
  rotation: 0,
};
const fallbackCutout: Cutout = {
  id: "fallback",
  kind: "round",
  face: "base",
  x: 0,
  z: 0,
  width: 4,
  height: 4,
};

test("restores only known and finite project settings", () => {
  assert.deepEqual(
    restoreMeasurements(
      { width: 140, depth: "bad", unknown: 99 },
      { width: 120, depth: 100 },
    ),
    { width: 140, depth: 100 },
  );
  assert.deepEqual(
    restoreKnownSettings(
      { enabled: false, count: Number.NaN, label: 20 },
      { enabled: true, count: 4, label: "FORJA" },
    ),
    { enabled: false, count: 4, label: "FORJA" },
  );
});

test("filters malformed and duplicate cutouts and objects", () => {
  const cutout = { ...fallbackCutout, id: "valid" };
  assert.deepEqual(
    restoreCutouts([cutout, cutout, { ...cutout, width: -1 }], []),
    [cutout],
  );

  const object = { ...fallbackObject, id: "valid" };
  assert.deepEqual(
    restoreObjects([object, object, { ...object, x: Number.NaN }], []),
    [object],
  );
  assert.deepEqual(restoreObjects("invalid", [fallbackObject]), [
    fallbackObject,
  ]);
});

test("restores optional visibility, lock state and corner finish", () => {
  const object = {
    ...fallbackObject,
    id: "stateful",
    hidden: true,
    locked: true,
    cornerRadius: 3.5,
  };
  assert.deepEqual(restoreObjects([object], []), [object]);
  assert.deepEqual(
    restoreObjects([{ ...object, hidden: "yes" }], []),
    [],
  );
  assert.deepEqual(
    restoreObjects([{ ...object, cornerRadius: -1 }], []),
    [],
  );
});

test("restores every supported free-editor shape", () => {
  const kinds = [
    "cube",
    "cylinder",
    "sphere",
    "cone",
    "tube",
    "wedge",
    "text",
  ] as const;
  const objects = kinds.map((kind, index) => ({
    ...fallbackObject,
    id: `shape-${index}`,
    kind,
  }));
  assert.deepEqual(restoreObjects(objects, []), objects);
});

test("validates template IDs and safely reads unknown records", () => {
  assert.equal(isTemplateId("free"), true);
  assert.equal(isTemplateId("unknown"), false);
  assert.equal(recordValue({ box: 12 }, "box"), 12);
  assert.equal(recordValue(null, "box"), undefined);
});
