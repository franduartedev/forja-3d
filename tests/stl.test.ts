import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { createModelGeometries } from "../lib/model-geometry";
import { TEMPLATES } from "../lib/models";

test("STL export contains a complete finite binary mesh", () => {
  const template = TEMPLATES.find((item) => item.id === "plate");
  assert.ok(template);
  const geometries = createModelGeometries(
    "plate",
    template.defaults,
    undefined,
    true,
    true,
  );
  const group = new THREE.Group();
  geometries.forEach((geometry) => group.add(new THREE.Mesh(geometry)));
  const data = new STLExporter().parse(group, { binary: true });
  const view = data instanceof DataView ? data : new DataView(data);
  const triangleCount = view.getUint32(80, true);

  assert.ok(triangleCount > 0);
  assert.equal(view.byteLength, 84 + triangleCount * 50);
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const base = 84 + triangle * 50;
    for (let value = 0; value < 12; value += 1) {
      assert.ok(Number.isFinite(view.getFloat32(base + value * 4, true)));
    }
  }
  geometries.forEach((geometry) => geometry.dispose());
});
