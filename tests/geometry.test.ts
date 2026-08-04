import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createModelGeometries } from "../lib/model-geometry";
import { TEMPLATES } from "../lib/models";
import type { CustomObject } from "../lib/models";

function assertValidGeometry(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  assert.ok(position, "missing position attribute");
  assert.ok(position.count >= 3, "geometry has too few vertices");
  for (let index = 0; index < position.count; index += 1) {
    assert.ok(Number.isFinite(position.getX(index)), `invalid x at ${index}`);
    assert.ok(Number.isFinite(position.getY(index)), `invalid y at ${index}`);
    assert.ok(Number.isFinite(position.getZ(index)), `invalid z at ${index}`);
  }
  const triangleCount = geometry.index
    ? geometry.index.count / 3
    : position.count / 3;
  assert.ok(Number.isInteger(triangleCount));
  assert.ok(triangleCount > 0);
}

function object(
  id: string,
  operation: "solid" | "hole",
  overrides: Partial<CustomObject> = {},
): CustomObject {
  return {
    id,
    kind: "cube",
    name: id,
    x: 0,
    y: 0,
    z: 0,
    width: 20,
    depth: 20,
    height: 10,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    operation,
    ...overrides,
  };
}

function boundsOf(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox);
  return geometry.boundingBox;
}

function volumeOf(geometry: THREE.BufferGeometry) {
  const triangleGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = triangleGeometry.getAttribute("position");
  const first = new THREE.Vector3();
  const second = new THREE.Vector3();
  const third = new THREE.Vector3();
  let volume = 0;
  for (let index = 0; index < position.count; index += 3) {
    first.fromBufferAttribute(position, index);
    second.fromBufferAttribute(position, index + 1);
    third.fromBufferAttribute(position, index + 2);
    volume += first.dot(second.cross(third)) / 6;
  }
  if (triangleGeometry !== geometry) triangleGeometry.dispose();
  return Math.abs(volume);
}

function assertClosedSurface(geometry: THREE.BufferGeometry) {
  const triangleGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = triangleGeometry.getAttribute("position");
  const edges = new Map<string, number>();
  const vertexKey = (index: number) =>
    [position.getX(index), position.getY(index), position.getZ(index)]
      .map((value) => Math.round(value * 10000))
      .join(",");

  for (let index = 0; index < position.count; index += 3) {
    const vertices = [
      vertexKey(index),
      vertexKey(index + 1),
      vertexKey(index + 2),
    ];
    for (const [first, second] of [
      [vertices[0], vertices[1]],
      [vertices[1], vertices[2]],
      [vertices[2], vertices[0]],
    ]) {
      const edge = first < second
        ? `${first}|${second}`
        : `${second}|${first}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }

  const openEdges = [...edges.values()].filter((count) => count !== 2);
  if (triangleGeometry !== geometry) triangleGeometry.dispose();
  assert.equal(openEdges.length, 0, "geometry contains open or non-manifold edges");
}

test("all parametric templates create finite printable meshes", () => {
  for (const template of TEMPLATES.filter((item) => item.id !== "free")) {
    const geometries = createModelGeometries(template.id, template.defaults);
    assert.ok(geometries.length > 0, template.id);
    geometries.forEach(assertValidGeometry);
    geometries.forEach((geometry) => geometry.dispose());
  }
});

test("valid minimum and maximum build sizes remain numerically stable", () => {
  const cases = [
    ["box", { width: 20, depth: 20, height: 10, wall: 1.2, bottom: 1.2 }],
    ["box", { width: 235, depth: 235, height: 270, wall: 8, bottom: 8 }],
    ["bracket", { width: 10, depth: 12, height: 12, thickness: 1.2, holeDiameter: 4.5 }],
    ["bracket", { width: 235, depth: 235, height: 200, thickness: 12, holeDiameter: 4.5 }],
    ["plate", { width: 10, depth: 10, thickness: 0.8, holeDiameter: 4, margin: 10 }],
    ["plate", { width: 235, depth: 235, thickness: 12, holeDiameter: 4, margin: 10 }],
  ] as const;

  for (const [templateId, parameters] of cases) {
    const geometries = createModelGeometries(templateId, parameters, {
      holes: [],
      objects: [],
    });
    assert.ok(geometries.length > 0, templateId);
    geometries.forEach(assertValidGeometry);
    geometries.forEach((geometry) => geometry.dispose());
  }
});

test("box walls form one continuous ring with exact square corners", () => {
  const parameters = {
    width: 80,
    depth: 50,
    height: 30,
    wall: 2,
    bottom: 2,
  };
  const geometries = createModelGeometries("box", parameters, {
    holes: [],
    objects: [],
    cornerRadius: 0,
    lidStyle: "none",
    standoffCount: 0,
  });

  assert.equal(geometries.length, 2, "base and walls should be continuous meshes");
  const wallBounds = boundsOf(geometries[1]);
  assert.equal(wallBounds.min.x, -40);
  assert.equal(wallBounds.max.x, 40);
  assert.equal(wallBounds.min.z, -25);
  assert.equal(wallBounds.max.z, 25);
  assert.equal(wallBounds.min.y, 2);
  assert.equal(wallBounds.max.y, 30);
  const expectedWallVolume =
    (80 * 50 - 76 * 46) * (parameters.height - parameters.bottom);
  assert.ok(Math.abs(volumeOf(geometries[1]) - expectedWallVolume) < 0.1);
  assertClosedSurface(geometries[1]);
  geometries.forEach((geometry) => geometry.dispose());
});

test("front cutouts subtract from the continuous box wall", () => {
  const parameters = {
    width: 80,
    depth: 50,
    height: 30,
    wall: 2,
    bottom: 2,
  };
  const commonOptions = {
    objects: [],
    cornerRadius: 3,
    lidStyle: "none" as const,
    standoffCount: 0,
  };
  const withoutCutout = createModelGeometries("box", parameters, {
    ...commonOptions,
    holes: [],
  });
  const withCutout = createModelGeometries("box", parameters, {
    ...commonOptions,
    holes: [
      {
        id: "front-usb",
        kind: "rect",
        face: "front",
        x: 0,
        z: 0,
        width: 12,
        height: 7,
      },
    ],
  });

  assertClosedSurface(withoutCutout[1]);
  assertValidGeometry(withCutout[1]);
  assert.ok(volumeOf(withCutout[1]) < volumeOf(withoutCutout[1]) - 100);
  withoutCutout.forEach((geometry) => geometry.dispose());
  withCutout.forEach((geometry) => geometry.dispose());
});

test("box accessories create valid additional meshes", () => {
  const template = TEMPLATES.find((item) => item.id === "box");
  assert.ok(template);
  const geometries = createModelGeometries("box", template.defaults, {
    lidStyle: "screw",
    lidThickness: 2,
    standoffCount: 4,
    standoffDiameter: 7,
    standoffHeight: 8,
    standoffHole: 3,
    cornerRadius: 3,
  });

  assert.ok(geometries.length >= 7);
  geometries.forEach(assertValidGeometry);
  geometries.forEach((geometry) => geometry.dispose());
});

test("print layout places the lid beside the box and every part on the bed", () => {
  const template = TEMPLATES.find((item) => item.id === "box");
  assert.ok(template);
  const geometries = createModelGeometries(
    "box",
    template.defaults,
    {
      lidStyle: "snap",
      lidThickness: 2,
      standoffCount: 0,
      standoffDiameter: 7,
      standoffHeight: 8,
      standoffHole: 3,
      cornerRadius: 3,
    },
    true,
    true,
  );
  const bounds = geometries.map(boundsOf);

  assert.ok(bounds.every((box) => box.min.y >= -0.001));
  assert.ok(
    bounds.some((box) => box.min.x > template.defaults.width / 2),
    "the lid was not moved away from the enclosure",
  );
  geometries.forEach((geometry) => geometry.dispose());
});

test("free mode starts empty and keeps preview objects independently selectable", () => {
  const parameters = { width: 120, depth: 100 };
  assert.deepEqual(createModelGeometries("free", parameters), []);

  const source = object("solid-a", "solid", { x: 22, rotation: 30 });
  const geometries = createModelGeometries(
    "free",
    parameters,
    { objects: [source] },
    false,
  );
  assert.equal(geometries.length, 1);
  assert.deepEqual(geometries[0].userData.forjaObject, source);
  const bounds = boundsOf(geometries[0]);
  assert.ok(bounds.max.x < 15, "preview geometry unexpectedly includes world position");
  geometries.forEach((geometry) => geometry.dispose());
});

test("boolean solids union and holes subtract without corrupting the mesh", () => {
  const parameters = { width: 120, depth: 100 };
  const first = object("solid-a", "solid", { x: -7 });
  const second = object("solid-b", "solid", { x: 7 });
  const cutter = object("hole-a", "hole", {
    kind: "cylinder",
    width: 8,
    depth: 8,
    height: 12,
    y: -1,
  });
  const [unionGeometry] = createModelGeometries("free", parameters, {
    objects: [first, second],
  });
  const [geometry] = createModelGeometries("free", parameters, {
    objects: [first, second, cutter],
  });

  assertValidGeometry(geometry);
  assert.ok(volumeOf(geometry) < volumeOf(unionGeometry) - 100);
  const bounds = boundsOf(geometry);
  assert.ok(bounds.min.x <= -16.9);
  assert.ok(bounds.max.x >= 16.9);
  assert.ok(bounds.min.y >= -0.01);
  assert.ok(bounds.max.y <= 10.01);
  unionGeometry.dispose();
  geometry.dispose();
});

test("every free-editor primitive creates exportable geometry", () => {
  const objects = [
    object("text", "solid", {
      kind: "text",
      text: "FORJA",
      width: 7,
      depth: 2,
      height: 1.5,
      x: -20,
    }),
    object("cylinder", "solid", {
      kind: "cylinder",
      width: 12,
      depth: 12,
      x: 10,
    }),
    object("sphere", "solid", {
      kind: "sphere",
      width: 10,
      depth: 10,
      height: 10,
      x: 28,
    }),
    object("cone", "solid", {
      kind: "cone",
      width: 10,
      depth: 10,
      height: 14,
      x: 44,
    }),
    object("tube", "solid", {
      kind: "tube",
      width: 14,
      depth: 8,
      height: 8,
      x: 60,
    }),
    object("wedge", "solid", {
      kind: "wedge",
      width: 15,
      depth: 14,
      height: 10,
      x: 78,
    }),
  ];
  const geometries = createModelGeometries(
    "free",
    { width: 120, depth: 100 },
    { objects },
  );
  assert.equal(geometries.length, 1);
  geometries.forEach(assertValidGeometry);
  geometries.forEach((geometry) => geometry.dispose());
});

test("hidden objects are excluded from preview and final geometry", () => {
  const visible = object("visible", "solid");
  const hidden = object("hidden", "solid", { hidden: true, x: 40 });
  const preview = createModelGeometries(
    "free",
    { width: 120, depth: 100 },
    { objects: [visible, hidden] },
    false,
  );
  assert.equal(preview.length, 1);
  assert.equal(preview[0].userData.forjaObject.id, "visible");
  preview.forEach((geometry) => geometry.dispose());

  const [geometry] = createModelGeometries(
    "free",
    { width: 120, depth: 100 },
    { objects: [visible, hidden] },
  );
  const bounds = boundsOf(geometry);
  assert.ok(bounds.max.x < 11);
  geometry.dispose();
});
