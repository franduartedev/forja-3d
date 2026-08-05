import assert from "node:assert/strict";
import test from "node:test";
import { getPrintProfile, PRINT_MATERIALS } from "../lib/print-profile";

test("recommends two nozzle widths for printable walls", () => {
  const profile = getPrintProfile({
    material: "pla",
    nozzleSize: 0.4,
    minimumWall: 0.6,
  });

  assert.equal(profile.recommendedWall, 0.8);
  assert.equal(profile.wallIsRecommended, false);
});

test("keeps material data finite and useful", () => {
  for (const material of Object.values(PRINT_MATERIALS)) {
    assert.ok(material.label.length > 0);
    assert.ok(material.note.length > 0);
    assert.ok(Number.isFinite(material.density));
    assert.ok(material.density > 0);
  }
});

test("falls back safely when a nozzle value is malformed", () => {
  const profile = getPrintProfile({
    material: "petg",
    nozzleSize: Number.NaN,
    minimumWall: 1,
  });

  assert.equal(profile.recommendedWall, 0.8);
  assert.equal(profile.wallIsRecommended, true);
});
