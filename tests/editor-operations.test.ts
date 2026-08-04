import assert from "node:assert/strict";
import test from "node:test";
import {
  alignObjectSelection,
  distributeObjectSelection,
  normalizeObjectSelection,
  patchObjectSelection,
  reorderObject,
} from "../lib/editor-operations";
import type { CustomObject } from "../lib/models";

function object(id: string, x: number, y: number, z: number): CustomObject {
  return {
    id,
    kind: "cube",
    name: id,
    x,
    y,
    z,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
    operation: "solid",
  };
}

test("normalizes stale and duplicated selection IDs", () => {
  const objects = [object("a", 0, 0, 0), object("b", 1, 0, 0)];

  assert.deepEqual(normalizeObjectSelection(objects, ["missing", "b", "b"]), {
    selectedIds: ["b"],
    selectedId: "b",
  });
  assert.deepEqual(normalizeObjectSelection(objects, ["missing"]), {
    selectedIds: ["a"],
    selectedId: "a",
  });
  assert.deepEqual(normalizeObjectSelection([], ["a"]), {
    selectedIds: [],
    selectedId: null,
  });
});

test("moves every selected object by the same delta", () => {
  const objects = [
    object("a", 1, 2, 3),
    object("b", 8, 4, -2),
    object("c", 20, 0, 10),
  ];
  const result = patchObjectSelection(
    objects,
    "a",
    { x: 6, y: 5, z: 1 },
    ["a", "b"],
    true,
  );

  assert.deepEqual(
    result.map(({ x, y, z }) => ({ x, y, z })),
    [
      { x: 6, y: 5, z: 1 },
      { x: 13, y: 7, z: -4 },
      { x: 20, y: 0, z: 10 },
    ],
  );
  assert.notStrictEqual(result[0], objects[0]);
  assert.strictEqual(result[2], objects[2]);
});

test("patches only the source when group movement is disabled", () => {
  const objects = [object("a", 0, 0, 0), object("b", 5, 0, 0)];
  const result = patchObjectSelection(
    objects,
    "a",
    { rotation: 45 },
    ["a", "b"],
    false,
  );

  assert.equal(result[0].rotation, 45);
  assert.equal(result[1].rotation, 0);
});

test("aligns and distributes selections without touching other objects", () => {
  const objects = [
    object("a", -9, 5, 6),
    object("b", 2, 8, -4),
    object("c", 12, 3, 12),
    object("outside", 99, 7, 99),
  ];

  const aligned = alignObjectSelection(objects, ["a", "b", "c"], "x");
  assert.deepEqual(aligned.slice(0, 3).map((item) => item.x), [1.67, 1.67, 1.67]);
  assert.equal(aligned[3].x, 99);

  const floored = alignObjectSelection(objects, ["a", "b"], "floor");
  assert.deepEqual(floored.slice(0, 2).map((item) => item.y), [0, 0]);

  const distributed = distributeObjectSelection(
    objects,
    ["a", "b", "c"],
    "x",
  );
  assert.deepEqual(distributed.slice(0, 3).map((item) => item.x), [-9, 1.5, 12]);
  assert.equal(distributed[3].x, 99);
});

test("locked objects remain fixed during edits, alignment and distribution", () => {
  const locked = { ...object("locked", 0, 4, 0), locked: true };
  const objects = [
    locked,
    object("a", 10, 5, 10),
    object("b", 20, 6, 20),
    object("c", 40, 7, 40),
  ];

  assert.strictEqual(
    patchObjectSelection(objects, "locked", { x: 50 }, ["locked"], false),
    objects,
  );
  const moved = patchObjectSelection(
    objects,
    "a",
    { x: 15, z: 5 },
    ["locked", "a"],
    true,
  );
  assert.deepEqual(
    moved.map(({ x, z }) => ({ x, z })),
    [
      { x: 0, z: 0 },
      { x: 15, z: 5 },
      { x: 20, z: 20 },
      { x: 40, z: 40 },
    ],
  );

  const aligned = alignObjectSelection(objects, ["locked", "a", "b"], "floor");
  assert.equal(aligned[0].y, 4);
  assert.deepEqual(aligned.slice(1, 3).map((item) => item.y), [0, 0]);

  const distributed = distributeObjectSelection(
    objects,
    ["locked", "a", "b", "c"],
    "x",
  );
  assert.equal(distributed[0].x, 0);
  assert.deepEqual(distributed.slice(1).map((item) => item.x), [10, 25, 40]);
});

test("reorders an object by one layer without mutating the input", () => {
  const objects = [
    object("a", 0, 0, 0),
    object("b", 0, 0, 0),
    object("c", 0, 0, 0),
  ];
  const reordered = reorderObject(objects, "b", "up");
  assert.deepEqual(reordered.map((item) => item.id), ["b", "a", "c"]);
  assert.deepEqual(objects.map((item) => item.id), ["a", "b", "c"]);
  assert.strictEqual(reorderObject(objects, "a", "up"), objects);
});
