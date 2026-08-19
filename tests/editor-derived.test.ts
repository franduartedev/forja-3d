import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSelectedStarterDesign,
  getVisibleLibraryProjects,
  getVisibleStarterDesigns,
} from "../lib/editor/catalog";
import { getEditorStatus } from "../lib/editor/status";
import { getTemplateFieldGroups } from "../lib/editor/template-fields";
import { getValidationIssues } from "../lib/editor/validation-presentation";
import { getEditorValidation } from "../lib/editor/validation";
import { TEMPLATES, type CustomObject } from "../lib/models";

test("editor status recommends adding geometry before export", () => {
  const status = getEditorStatus({
    templateId: "free",
    validation: { errors: [], warnings: [] },
    hasPrintableGeometry: false,
    showReview: false,
    exporting: null,
  });

  assert.equal(status.isValid, true);
  assert.equal(status.canExport, false);
  assert.equal(status.statusTone, "idle");
  assert.equal(status.statusActionLabel, "Agregar forma");
  assert.equal(status.topbarPrimaryLabel, "Agregar forma");
});

test("editor status exposes export as final action when review is valid", () => {
  const status = getEditorStatus({
    templateId: "box",
    validation: { errors: [], warnings: [] },
    hasPrintableGeometry: true,
    showReview: true,
    exporting: "stl",
  });

  assert.equal(status.isValid, true);
  assert.equal(status.canExport, true);
  assert.equal(status.statusTone, "ready");
  assert.equal(status.statusActionLabel, "Exportar STL");
  assert.equal(status.topbarPrimaryLabel, "Generando…");
});

test("template field groups preserve primary field order and preview values", () => {
  const boxTemplate = TEMPLATES.find((template) => template.id === "box");
  assert.ok(boxTemplate);

  const groups = getTemplateFieldGroups(
    boxTemplate.fields,
    ["width", "depth", "height", "wall"],
    { width: 80, depth: 50, height: 30, wall: 2, bottom: 2 },
  );

  assert.deepEqual(
    groups.primaryFields.map((field) => field.key),
    ["width", "depth", "height", "wall"],
  );
  assert.deepEqual(
    groups.secondaryFields.map((field) => field.key),
    ["bottom"],
  );
  assert.deepEqual(groups.primaryFieldsPreview, [
    { key: "width", label: "Ancho exterior", value: 80 },
    { key: "depth", label: "Profundidad", value: 50 },
    { key: "height", label: "Altura", value: 30 },
    { key: "wall", label: "Espesor de pared", value: 2 },
  ]);
});

test("validation presentation maps known errors to actionable copy", () => {
  const issues = getValidationIssues({
    errors: ["El recorte 2 queda fuera de la cara seleccionada."],
    warnings: ["Una pared menor a 1,2 mm puede resultar frágil."],
  });

  assert.equal(issues[0].severity, "error");
  assert.equal(issues[0].title, "Recorte 2");
  assert.equal(issues[0].action, "Movelo hacia adentro de la cara o reducí su medida.");
  assert.equal(issues[1].severity, "warning");
  assert.equal(issues[1].title, "Pieza delicada");
});

test("editor validation rejects free designs with only cutouts", () => {
  const cutoutOnlyObject: CustomObject = {
    id: "object-1",
    kind: "cube",
    name: "Recorte 1",
    x: 0,
    y: 0,
    z: 0,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
    operation: "hole",
  };

  const validation = getEditorValidation({
    templateId: "free",
    parameters: { width: 120, depth: 100 },
    holes: [],
    visibleObjects: [cutoutOnlyObject],
    featureSettings: {
      cornerRadius: 4,
      lidStyle: "none",
      lidThickness: 2,
      standoffCount: 0,
      standoffDiameter: 7,
      standoffHeight: 8,
      standoffHole: 3,
    },
  });

  assert.ok(
    validation.errors.includes(
      "Agregá al menos un sólido antes de usar figuras de recorte.",
    ),
  );
});

test("catalog helpers filter and sort saved projects", () => {
  const projects = [
    { projectName: "Caja Beta", savedAt: "2026-01-03T00:00:00.000Z" },
    { projectName: "Soporte Alfa", savedAt: "2026-01-01T00:00:00.000Z" },
    { projectName: "Caja Alfa", savedAt: "2026-01-02T00:00:00.000Z" },
  ];

  assert.deepEqual(
    getVisibleLibraryProjects(projects, "caja", "name").map((project) => project.projectName),
    ["Caja Alfa", "Caja Beta"],
  );
  assert.deepEqual(
    getVisibleLibraryProjects(projects, "", "recent").map((project) => project.projectName),
    ["Caja Beta", "Caja Alfa", "Soporte Alfa"],
  );
});

test("catalog helpers filter and select starter designs", () => {
  const designs = [
    {
      id: "phone-stand" as const,
      name: "Soporte celular",
      description: "Base inclinada",
      category: "soportes" as const,
    },
    {
      id: "sensor-case" as const,
      name: "Caja sensor",
      description: "Electrónica compacta",
      category: "electronica" as const,
    },
  ];

  assert.deepEqual(
    getVisibleStarterDesigns(designs, "sensor", "all").map((design) => design.id),
    ["sensor-case"],
  );
  assert.deepEqual(
    getVisibleStarterDesigns(designs, "", "soportes").map((design) => design.id),
    ["phone-stand"],
  );
  assert.equal(
    getSelectedStarterDesign(designs, "sensor-case").name,
    "Caja sensor",
  );
  assert.equal(
    getSelectedStarterDesign(designs, "tray").name,
    "Soporte celular",
  );
});
