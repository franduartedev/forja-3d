import assert from "node:assert/strict";
import test from "node:test";
import { createModelGeometries } from "../lib/model-geometry";
import {
  createEditableTemplateDesign,
  createFreePreset,
  createFreePrimitive,
  createStarterDesign,
  STARTER_DESIGNS,
} from "../lib/shape-library";

let nextId = 0;
const idFactory = (prefix: string) => `${prefix}-${nextId += 1}`;

test("creates a primitive at the requested workplane position", () => {
  const object = createFreePrimitive({
    kind: "text",
    operation: "hole",
    index: 2,
    point: { x: 18, z: -7 },
    idFactory,
  });
  assert.equal(object.name, "Texto 3");
  assert.equal(object.text, "FORJA");
  assert.equal(object.operation, "hole");
  assert.deepEqual({ x: object.x, z: object.z }, { x: 18, z: -7 });
  assert.equal(object.hidden, false);
  assert.equal(object.locked, false);
});

test("washer preset is one solid and one taller cutting cylinder", () => {
  const objects = createFreePreset(
    "washer",
    0,
    { x: 4, z: 6 },
    idFactory,
  );
  assert.equal(objects.length, 2);
  assert.deepEqual(
    objects.map((object) => object.operation),
    ["solid", "hole"],
  );
  assert.ok(objects[1].height > objects[0].height);
  assert.deepEqual(
    objects.map(({ x, z }) => ({ x, z })),
    [{ x: 4, z: 6 }, { x: 4, z: 6 }],
  );
});

test("new primitive defaults match their editable dimensions", () => {
  const cone = createFreePrimitive({
    kind: "cone",
    operation: "solid",
    index: 0,
    idFactory,
  });
  const tube = createFreePrimitive({
    kind: "tube",
    operation: "solid",
    index: 1,
    idFactory,
  });
  const wedge = createFreePrimitive({
    kind: "wedge",
    operation: "solid",
    index: 2,
    idFactory,
  });

  assert.equal(cone.height, 18);
  assert.ok(tube.depth < tube.width);
  assert.equal(wedge.depth, 20);
});

test("starter designs are composed of fully editable objects", () => {
  assert.deepEqual(
    STARTER_DESIGNS.map((design) => design.id),
    [
      "phone-stand",
      "tray",
      "tool-holder",
      "nameplate",
      "wall-hook",
      "cable-guide",
      "corner-bracket",
      "sensor-case",
      "desk-organizer",
      "battery-holder",
      "headphone-hook",
      "plant-marker",
      "key-rack",
      "sd-card-holder",
      "pen-cup",
      "mini-shelf",
      "remote-holder",
      "control-knob",
      "pcb-mount",
      "mini-planter",
      "toothbrush-holder",
      "soap-dish",
      "drawer-divider",
      "cable-spool",
      "door-stop",
      "bookend",
      "led-channel",
      "label-tag",
      "bit-organizer",
      "switch-plate",
      "napkin-holder",
    ],
  );

  const phoneStand = createStarterDesign(
    "phone-stand",
    0,
    { x: 0, z: 0 },
    idFactory,
  );
  const tray = createStarterDesign("tray", 1, { x: 5, z: 6 }, idFactory);
  const toolHolder = createStarterDesign(
    "tool-holder",
    2,
    { x: 0, z: 0 },
    idFactory,
  );
  const nameplate = createStarterDesign(
    "nameplate",
    3,
    { x: 0, z: 0 },
    idFactory,
  );

  assert.equal(phoneStand.length, 3);
  assert.equal(tray.length, 5);
  assert.equal(toolHolder.filter((item) => item.operation === "hole").length, 6);
  assert.equal(nameplate.find((item) => item.kind === "text")?.text, "FORJA");
  assert.equal(nameplate.filter((item) => item.operation === "hole").length, 2);
  assert.ok(
    [phoneStand, tray, toolHolder, nameplate]
      .flat()
      .every((item) => item.hidden === false && item.locked === false),
  );

  const deskOrganizer = createStarterDesign(
    "desk-organizer",
    4,
    { x: 0, z: 0 },
    idFactory,
  );
  const batteryHolder = createStarterDesign(
    "battery-holder",
    5,
    { x: 0, z: 0 },
    idFactory,
  );
  const headphoneHook = createStarterDesign(
    "headphone-hook",
    6,
    { x: 0, z: 0 },
    idFactory,
  );
  const plantMarker = createStarterDesign(
    "plant-marker",
    7,
    { x: 0, z: 0 },
    idFactory,
  );

  assert.equal(deskOrganizer.length, 7);
  assert.equal(batteryHolder.length, 8);
  assert.equal(headphoneHook.filter((item) => item.operation === "hole").length, 2);
  assert.equal(plantMarker.find((item) => item.kind === "text")?.text, "PLANTA");
});

test("expanded quick parts remain editable and printable", () => {
  const spacer = createFreePreset("spacer", 0, { x: 0, z: 0 }, idFactory);
  const mountingTab = createFreePreset(
    "mounting-tab",
    1,
    { x: 10, z: -5 },
    idFactory,
  );
  const foot = createFreePreset("foot", 2, { x: -4, z: 8 }, idFactory);

  assert.equal(spacer[0].kind, "tube");
  assert.ok(spacer[0].depth < spacer[0].width);
  assert.deepEqual(
    mountingTab.map((object) => object.operation),
    ["solid", "hole"],
  );
  assert.equal(foot[0].kind, "cylinder");
  assert.ok(
    [...spacer, ...mountingTab, ...foot].every(
      (object) => object.hidden === false && object.locked === false,
    ),
  );
});

test("parametric templates can become fully editable free objects", () => {
  const editableBox = createEditableTemplateDesign(
    "box",
    { width: 80, depth: 50, height: 30, wall: 2, bottom: 2 },
    {
      holes: [
        { id: "usb", kind: "rect", face: "front", x: 0, z: 0, width: 12, height: 7 },
      ],
      objects: [],
      lidStyle: "snap",
      lidThickness: 2,
      standoffCount: 4,
      standoffDiameter: 7,
      standoffHeight: 8,
      standoffHole: 3,
    },
    idFactory,
  );
  const editableBracket = createEditableTemplateDesign(
    "bracket",
    { width: 60, depth: 35, height: 45, thickness: 4 },
    {
      holes: [
        { id: "mount", kind: "round", face: "base", x: 10, z: 0, width: 5, height: 5 },
      ],
      objects: [],
      lidStyle: "none",
      lidThickness: 2,
      standoffCount: 0,
      standoffDiameter: 7,
      standoffHeight: 8,
      standoffHole: 3,
    },
    idFactory,
  );

  assert.equal(editableBox.filter((object) => object.operation === "solid").length, 10);
  assert.equal(editableBox.filter((object) => object.operation === "hole").length, 1);
  assert.ok(editableBox.some((object) => object.name === "Tapa editable"));
  assert.equal(editableBracket.filter((object) => object.operation === "solid").length, 2);
  assert.equal(editableBracket.filter((object) => object.operation === "hole").length, 1);
  assert.ok(
    [...editableBox, ...editableBracket].every(
      (object) => object.hidden === false && object.locked === false,
    ),
  );

  [editableBox, editableBracket].forEach((objects, templateIndex) => {
    const geometry = createModelGeometries(
      "free",
      { width: 220, depth: 220 },
      { objects },
    )[0];
    assert.ok(geometry, `editable template ${templateIndex + 1} should export`);
    const positions = geometry.getAttribute("position");
    assert.ok(positions.count > 0);
    for (let index = 0; index < positions.array.length; index += 1) {
      assert.ok(Number.isFinite(positions.array[index]));
    }
    geometry.dispose();
  });
});

test("every starter design produces finite free-mode geometry", () => {
  STARTER_DESIGNS.forEach((design, designIndex) => {
    const objects = createStarterDesign(
      design.id,
      designIndex,
      { x: 0, z: 0 },
      idFactory,
    );
    const geometries = createModelGeometries(
      "free",
      { width: 180, depth: 180 },
      { objects },
    );
    assert.equal(geometries.length, 1, `${design.name} should create one result`);
    const positions = geometries[0].getAttribute("position");
    assert.ok(positions.count > 0, `${design.name} should contain triangles`);
    for (let index = 0; index < positions.array.length; index += 1) {
      assert.ok(
        Number.isFinite(positions.array[index]),
        `${design.name} should not contain invalid coordinates`,
      );
    }
    geometries.forEach((geometry) => geometry.dispose());
  });
});

test("starter designs do not contain floating solid groups", () => {
  const tolerance = 0.5;

  STARTER_DESIGNS.forEach((design, designIndex) => {
    const solids = createStarterDesign(
      design.id,
      designIndex,
      { x: 0, z: 0 },
      idFactory,
    ).filter((object) => object.operation === "solid");
    const bounds = solids.map((object) => {
      const geometry = createModelGeometries(
        "free",
        { width: 180, depth: 180 },
        { objects: [object] },
      )[0];
      geometry.computeBoundingBox();
      const box = geometry.boundingBox?.clone();
      geometry.dispose();
      assert.ok(box, `${design.name} should have measurable solid bounds`);
      return box;
    });
    const connected = new Set([0]);

    for (let pass = 0; pass < bounds.length; pass += 1) {
      bounds.forEach((candidate, candidateIndex) => {
        if (connected.has(candidateIndex)) return;
        const touchesConnectedSolid = [...connected].some((connectedIndex) => {
          const current = bounds[connectedIndex];
          return (
            candidate.min.x <= current.max.x + tolerance &&
            candidate.max.x >= current.min.x - tolerance &&
            candidate.min.y <= current.max.y + tolerance &&
            candidate.max.y >= current.min.y - tolerance &&
            candidate.min.z <= current.max.z + tolerance &&
            candidate.max.z >= current.min.z - tolerance
          );
        });
        if (touchesConnectedSolid) connected.add(candidateIndex);
      });
    }

    assert.equal(
      connected.size,
      solids.length,
      `${design.name} contains a disconnected solid`,
    );
  });
});
