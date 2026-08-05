import assert from "node:assert/strict";
import test from "node:test";
import { safeFileName } from "../lib/file-name";

test("creates portable export file names", () => {
  assert.equal(safeFileName("Mi pieza Ñandú.step", "forja"), "Mi-pieza-Nandu");
  assert.equal(safeFileName("  pieza---final.STL  ", "forja"), "pieza-final");
  assert.equal(safeFileName("../../<>", "forja"), "forja");
  assert.ok(safeFileName("x".repeat(100), "forja").length <= 60);
});
