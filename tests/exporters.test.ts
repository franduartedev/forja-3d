import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import * as THREE from "three";
import { create3mfBlob, createStepBlob } from "../lib/model-exporters";

test("3MF export builds a complete, escaped package", async () => {
  const geometry = new THREE.BoxGeometry(10, 20, 30);
  const blob = await create3mfBlob([geometry], "Pieza & <prueba>");
  assert.equal(blob.type, "model/3mf");
  assert.ok(blob.size > 0);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.ok(zip.file("[Content_Types].xml"));
  assert.ok(zip.file("_rels/.rels"));
  const model = await zip.file("3D/3dmodel.model")?.async("string");
  assert.ok(model);
  assert.match(model, /unit="millimeter"/);
  assert.match(model, /Pieza &amp; &lt;prueba&gt;/);
  assert.match(model, /<vertices>/);
  assert.match(model, /<triangles>/);
  assert.doesNotMatch(model, /NaN|Infinity/);
  geometry.dispose();
});

test("STEP export is structurally complete and escapes project names", async () => {
  const geometry = new THREE.BoxGeometry(10, 20, 30);
  const blob = createStepBlob([geometry], "Fran's pieza");
  assert.equal(blob.type, "application/step");
  const step = await blob.text();

  assert.match(step, /^ISO-10303-21;/);
  assert.match(step, /FILE_NAME\('Fran''s pieza\.step'/);
  assert.match(step, /FACETED_BREP\('FORJA 1'/);
  assert.match(step, /FACETED_BREP_SHAPE_REPRESENTATION/);
  assert.match(step, /END-ISO-10303-21;$/);
  assert.doesNotMatch(step, /NaN|Infinity/);
  geometry.dispose();
});
