import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { auditBufferGeometry } from "../lib/experimental/manifold-geometry";
import { createStlFile } from "../lib/create-stl-file";
import { orientGeometriesForPrint } from "../lib/print-orientation";
import { sliceModel } from "../lib/slicer/client";

function boundsOf(geometries: THREE.BufferGeometry[]) {
  const bounds = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
  });
  return bounds;
}

function volumeOf(geometry: THREE.BufferGeometry) {
  const triangles = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = triangles.getAttribute("position");
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
  if (triangles !== geometry) triangles.dispose();
  return Math.abs(volume);
}

function stlBounds(data: ArrayBuffer) {
  const view = new DataView(data);
  const triangleCount = view.getUint32(80, true);
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const triangleOffset = 84 + triangle * 50 + 12;
    for (let corner = 0; corner < 3; corner += 1) {
      const offset = triangleOffset + corner * 12;
      vertex.set(
        view.getFloat32(offset, true),
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true),
      );
      bounds.expandByPoint(vertex);
    }
  }
  return bounds;
}

test("print orientation preserves geometry and maps Y-up to Z-up", () => {
  const source = new THREE.BoxGeometry(20, 10, 30);
  source.translate(4, 12, -7);
  const sourceBounds = boundsOf([source]);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const sourceVolume = volumeOf(source);
  const sourcePositions = Array.from(source.getAttribute("position").array);
  const { geometries, transform } = orientGeometriesForPrint([source]);
  const resultBounds = boundsOf(geometries);
  const resultSize = resultBounds.getSize(new THREE.Vector3());
  const position = geometries[0].getAttribute("position");

  assert.ok(Math.abs(resultBounds.min.z) < 1e-6);
  for (let index = 0; index < position.count; index += 1) {
    assert.ok(position.getZ(index) >= -1e-6);
  }
  assert.ok(transform.determinant() > 0);
  assert.ok(Math.abs(volumeOf(geometries[0]) - sourceVolume) < 1e-4);
  assert.ok(Math.abs(resultSize.x - sourceSize.x) < 1e-6);
  assert.ok(Math.abs(resultSize.y - sourceSize.z) < 1e-6);
  assert.ok(Math.abs(resultSize.z - sourceSize.y) < 1e-6);
  const geometricSurface = geometries[0].toNonIndexed();
  assert.equal(auditBufferGeometry(geometricSurface).nonManifoldEdgeCount, 0);
  assert.notStrictEqual(geometries[0], source);
  assert.deepEqual(Array.from(source.getAttribute("position").array), sourcePositions);

  geometries.forEach((geometry) => geometry.dispose());
  geometricSurface.dispose();
  source.dispose();
});

test("direct STL and the STL sent to the slicer share the same orientation", async () => {
  const source = new THREE.BoxGeometry(18, 6, 32);
  source.translate(0, 9, -11);
  const file = await createStlFile([source], "orientacion-forja");
  const directBytes = await file.arrayBuffer();
  const directBounds = stlBounds(directBytes);
  const originalFetch = globalThis.fetch;
  let uploadedFile: File | null = null;

  globalThis.fetch = async (_input, init) => {
    assert.ok(init?.body instanceof FormData);
    const uploaded = init.body.get("file");
    assert.ok(uploaded instanceof File);
    uploadedFile = uploaded;
    return new Response(new Blob(["G-code de prueba"]), {
      status: 200,
      headers: { "content-disposition": 'attachment; filename="pieza.gcode"' },
    });
  };

  try {
    await sliceModel({
      file,
      printerProfileId: "biqu-b1-0.4",
      layerHeightMm: 0.2,
      infillPercent: 20,
      supports: false,
      material: "pla",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const uploaded = uploadedFile as File | null;
  assert.ok(uploaded);
  const uploadedBytes = await uploaded.arrayBuffer();
  assert.deepEqual(new Uint8Array(uploadedBytes), new Uint8Array(directBytes));
  assert.ok(Math.abs(directBounds.min.z) < 1e-6);
  assert.ok(directBounds.max.z > 0);
  source.dispose();
});
