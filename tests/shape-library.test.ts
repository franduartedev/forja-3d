import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { auditBufferGeometry } from "../lib/experimental/manifold-geometry";
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

function overlapDepth(first: THREE.Box3, second: THREE.Box3) {
  return {
    x: Math.min(first.max.x, second.max.x) - Math.max(first.min.x, second.min.x),
    y: Math.min(first.max.y, second.max.y) - Math.max(first.min.y, second.min.y),
    z: Math.min(first.max.z, second.max.z) - Math.max(first.min.z, second.min.z),
  };
}

function hasVolumetricOverlap(first: THREE.Box3, second: THREE.Box3) {
  const overlap = overlapDepth(first, second);
  return overlap.x > 0.01 && overlap.y > 0.01 && overlap.z > 0.01;
}

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

test("parametric templates can become fully editable free objects", async () => {
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

  for (const [templateIndex, objects] of [editableBox, editableBracket].entries()) {
    const geometry = (await createModelGeometries(
      "free",
      { width: 220, depth: 220 },
      { objects },
    ))[0];
    assert.ok(geometry, `editable template ${templateIndex + 1} should export`);
    const positions = geometry.getAttribute("position");
    assert.ok(positions.count > 0);
    for (let index = 0; index < positions.array.length; index += 1) {
      assert.ok(Number.isFinite(positions.array[index]));
    }
    geometry.dispose();
  }
});

test("every starter design produces finite free-mode geometry", async () => {
  for (const [designIndex, design] of STARTER_DESIGNS.entries()) {
    const objects = createStarterDesign(
      design.id,
      designIndex,
      { x: 0, z: 0 },
      idFactory,
    );
    const geometries = await createModelGeometries(
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
    assert.deepEqual(
      auditBufferGeometry(geometries[0]),
      {
        finite: true,
        componentCount: 1,
        nonManifoldEdgeCount: 0,
        degenerateTriangleCount: 0,
      },
      `${design.name} should produce one manifold component`,
    );
    geometries.forEach((geometry) => geometry.dispose());
  }
});

test("surface contact is distinct from volumetric overlap", () => {
  const base = new THREE.Box3(
    new THREE.Vector3(-10, 0, -10),
    new THREE.Vector3(10, 3, 10),
  );
  const touching = new THREE.Box3(
    new THREE.Vector3(-5, 3, -5),
    new THREE.Vector3(5, 12, 5),
  );
  const overlapping = touching.clone().translate(new THREE.Vector3(0, -0.5, 0));

  assert.equal(overlapDepth(base, touching).y, 0);
  assert.equal(hasVolumetricOverlap(base, touching), false);
  assert.equal(overlapDepth(base, overlapping).y, 0.5);
  assert.equal(hasVolumetricOverlap(base, overlapping), true);
});

test("starter designs connect every structural solid through real overlap", async () => {

  for (const [designIndex, design] of STARTER_DESIGNS.entries()) {
    const solids = createStarterDesign(
      design.id,
      designIndex,
      { x: 0, z: 0 },
      idFactory,
    ).filter((object) => object.operation === "solid");
    const bounds: THREE.Box3[] = [];
    for (const object of solids) {
      const geometry = (await createModelGeometries(
        "free",
        { width: 180, depth: 180 },
        { objects: [object] },
        false,
      ))[0];
      geometry.rotateX(THREE.MathUtils.degToRad(object.rotationX ?? 0));
      geometry.rotateY(THREE.MathUtils.degToRad(object.rotation));
      geometry.rotateZ(THREE.MathUtils.degToRad(object.rotationZ ?? 0));
      geometry.translate(object.x, object.y, object.z);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox?.clone();
      geometry.dispose();
      assert.ok(box, `${design.name} should have measurable solid bounds`);
      bounds.push(box);
    }
    const connected = new Set([0]);

    for (let pass = 0; pass < bounds.length; pass += 1) {
      bounds.forEach((candidate, candidateIndex) => {
        if (connected.has(candidateIndex)) return;
        const overlapsConnectedSolid = [...connected].some((connectedIndex) =>
          hasVolumetricOverlap(candidate, bounds[connectedIndex]),
        );
        if (overlapsConnectedSolid) connected.add(candidateIndex);
      });
    }

    assert.equal(
      connected.size,
      solids.length,
      `${design.name} contains a disconnected solid`,
    );
  }
});
