import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  ADDITION,
  Brush,
  Evaluator,
  HalfEdgeMap,
  SUBTRACTION,
} from "three-bvh-csg";
import {
  bufferGeometryToManifold,
  manifoldToBufferGeometry,
  subtractManifolds,
  unionManifolds,
} from "../lib/experimental/manifold-geometry";
import { createModelGeometries } from "../lib/model-geometry";
import { createStarterDesign } from "../lib/shape-library";
import type { CustomObject } from "../lib/models";

function nonManifoldEdges(geometry: THREE.BufferGeometry) {
  const halfEdges = new HalfEdgeMap() as HalfEdgeMap & {
    matchDisjointEdges: boolean;
    unmatchedEdges: number;
  };
  halfEdges.matchDisjointEdges = true;
  halfEdges.updateFrom(geometry);
  return halfEdges.unmatchedEdges;
}

function bvhBoolean(
  geometries: THREE.BufferGeometry[],
  operation: typeof ADDITION | typeof SUBTRACTION,
) {
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  let result = new Brush(geometries[0]);
  result.updateMatrixWorld();

  geometries.slice(1).forEach((geometry) => {
    const brush = new Brush(geometry);
    brush.updateMatrixWorld();
    result = evaluator.evaluate(result, brush, operation) as Brush;
  });
  return result.geometry.clone();
}

async function manifoldBoolean(
  geometries: THREE.BufferGeometry[],
  operation: "union" | "subtract",
) {
  const inputs = await Promise.all(
    geometries.map((geometry) => bufferGeometryToManifold(geometry)),
  );
  const result = operation === "union"
    ? await unionManifolds(inputs)
    : await subtractManifolds(inputs[0], inputs.slice(1));
  const geometry = manifoldToBufferGeometry(result);
  inputs.forEach((input) => input.delete());
  result.delete();
  return geometry;
}

function box(x: number, rounded = false) {
  const geometry = rounded
    ? new RoundedBoxGeometry(20, 10, 20, 5, 2)
    : new THREE.BoxGeometry(20, 10, 20);
  geometry.translate(x, 5, 0);
  return geometry;
}

function cylinder() {
  const geometry = new THREE.CylinderGeometry(4, 4, 12, 36);
  geometry.translate(0, 5, 0);
  return geometry;
}

let nextId = 0;
const idFactory = (prefix: string) => `${prefix}-spike-${nextId += 1}`;

async function objectGeometry(object: CustomObject) {
  const geometry = (await createModelGeometries(
    "free",
    { width: 180, depth: 180 },
    { objects: [{ ...object, operation: "solid" }] },
    false,
  ))[0];
  geometry.rotateX(THREE.MathUtils.degToRad(object.rotationX ?? 0));
  geometry.rotateY(THREE.MathUtils.degToRad(object.rotation));
  geometry.rotateZ(THREE.MathUtils.degToRad(object.rotationZ ?? 0));
  geometry.translate(object.x, object.y, object.z);
  return geometry;
}

test("Manifold spike produces manifold results for primitive booleans", async () => {
  const cases = [
    { name: "box + box", operation: "union" as const, geometries: [box(0), box(10)] },
    {
      name: "rounded box + rounded box",
      operation: "union" as const,
      geometries: [box(0, true), box(10, true)],
    },
    {
      name: "box - cylinder",
      operation: "subtract" as const,
      geometries: [box(0), cylinder()],
    },
  ];

  for (const spikeCase of cases) {
    const bvh = bvhBoolean(
      spikeCase.geometries.map((geometry) => geometry.clone()),
      spikeCase.operation === "union" ? ADDITION : SUBTRACTION,
    );
    const manifold = await manifoldBoolean(spikeCase.geometries, spikeCase.operation);
    const comparison = {
      bvh: nonManifoldEdges(bvh),
      manifold: nonManifoldEdges(manifold),
    };
    console.info(`[manifold-spike] ${spikeCase.name}`, comparison);
    assert.equal(comparison.manifold, 0, spikeCase.name);
    spikeCase.geometries.forEach((geometry) => geometry.dispose());
    bvh.dispose();
    manifold.dispose();
  }
});

test("Manifold spike produces a manifold headphone hook", async () => {
  const objects = createStarterDesign(
    "headphone-hook",
    0,
    { x: 0, z: 0 },
    idFactory,
  );
  const solids = await Promise.all(
    objects
      .filter((object) => object.operation === "solid")
      .map(objectGeometry),
  );
  const holes = await Promise.all(
    objects
      .filter((object) => object.operation === "hole")
      .map(objectGeometry),
  );
  const bvhUnion = bvhBoolean(
    solids.map((geometry) => geometry.clone()),
    ADDITION,
  );
  const bvh = bvhBoolean(
    [bvhUnion, ...holes.map((geometry) => geometry.clone())],
    SUBTRACTION,
  );
  const manifoldSolids = await Promise.all(
    solids.map((geometry) => bufferGeometryToManifold(geometry)),
  );
  const manifoldHoles = await Promise.all(
    holes.map((geometry) => bufferGeometryToManifold(geometry)),
  );
  const union = await unionManifolds(manifoldSolids);
  const result = await subtractManifolds(union, manifoldHoles);
  const manifold = manifoldToBufferGeometry(result);
  const comparison = {
    bvh: nonManifoldEdges(bvh),
    manifold: nonManifoldEdges(manifold),
  };

  console.info("[manifold-spike] headphone-hook", comparison);
  assert.equal(comparison.manifold, 0);

  solids.forEach((geometry) => geometry.dispose());
  holes.forEach((geometry) => geometry.dispose());
  manifoldSolids.forEach((solid) => solid.delete());
  manifoldHoles.forEach((hole) => hole.delete());
  union.delete();
  result.delete();
  bvhUnion.dispose();
  bvh.dispose();
  manifold.dispose();
});
