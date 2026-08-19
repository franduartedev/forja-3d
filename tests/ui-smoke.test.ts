import assert from "node:assert/strict";
import { test } from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import LandingPage from "../app/components/LandingPage";
import SlicerPanel from "../app/components/SlicerPanel";
import FreeObjectInspectorPanel from "../app/components/editor/FreeObjectInspectorPanel";
import ObjectLayersPanel from "../app/components/editor/ObjectLayersPanel";
import ObjectsToolsPanel from "../app/components/editor/ObjectsToolsPanel";
import PieceContextPanel from "../app/components/editor/PieceContextPanel";
import PieceStatusPanel from "../app/components/editor/PieceStatusPanel";
import TemplateMeasurementsPanel from "../app/components/editor/TemplateMeasurementsPanel";
import { getTemplateFieldGroups } from "../lib/editor/template-fields";
import { TEMPLATES, type CustomObject, type TemplateId } from "../lib/models";

const noop = () => {};
const asyncNoop = async () => {};
const primaryMeasureKeys: Record<TemplateId, string[]> = {
  box: ["width", "depth", "height", "wall"],
  bracket: ["width", "height", "thickness", "depth"],
  plate: ["width", "depth", "thickness"],
  free: ["width", "depth"],
};

function render(element: React.ReactElement) {
  return renderToStaticMarkup(element);
}

function assertIncludesAll(html: string, expected: string[]) {
  for (const text of expected) {
    assert.match(html, new RegExp(escapeRegExp(text)));
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templateById(templateId: TemplateId) {
  const template = TEMPLATES.find((item) => item.id === templateId);
  assert.ok(template);
  return template;
}

function renderTemplateSmoke(templateId: Exclude<TemplateId, "free">) {
  const template = templateById(templateId);
  const fieldGroups = getTemplateFieldGroups(
    template.fields,
    primaryMeasureKeys[templateId],
    template.defaults,
  );

  return render(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(PieceContextPanel, {
        isFreeTemplate: false,
        entrySummary: "Plantilla paramétrica",
        title: template.name,
        description: template.description,
        primaryFieldsPreview: fieldGroups.primaryFieldsPreview,
      }),
      React.createElement(TemplateMeasurementsPanel, {
        templateId,
        parameters: template.defaults,
        primaryFields: fieldGroups.primaryFields,
        secondaryFields: fieldGroups.secondaryFields,
        presets: [
          {
            id: `${templateId}-default`,
            name: "Medida base",
            detail: "Valores iniciales",
            parameters: template.defaults,
          },
        ],
        open: true,
        onOpenChange: noop,
        onParameterChange: noop,
        onApplyPreset: noop,
        onEditInFreeMode: noop,
      }),
    ),
  );
}

const selectedCube: CustomObject = {
  id: "cube-1",
  kind: "cube",
  name: "Cubo base",
  x: 0,
  y: 0,
  z: 0,
  width: 30,
  depth: 20,
  height: 8,
  rotation: 0,
  operation: "solid",
};

test("landing exposes the current entry points and recovery affordances", () => {
  const html = render(
    React.createElement(LandingPage, {
      recoveryDraftName: "Caja sensor",
      projectCount: 2,
      onStart: noop,
      onTutorial: noop,
      onLibrary: noop,
      onImport: noop,
      onRecover: noop,
    }),
  );

  assertIncludesAll(html, [
    "¿Qué querés crear?",
    "Crear desde una plantilla",
    "Editor libre",
    "Continuar un proyecto",
    "2 guardados",
    "Caja sensor",
    "Caja para electrónica",
    "Soporte en L",
    "Placa perforada",
    "Navegación móvil",
  ]);
});

test("parametric editor smoke covers box, bracket and plate panels", () => {
  const cases: Array<[Exclude<TemplateId, "free">, string[]]> = [
    [
      "box",
      [
        "Caja electrónica",
        "Ancho exterior",
        "Espesor de pared",
        "Editar todo en Libre",
      ],
    ],
    [
      "bracket",
      [
        "Soporte en L",
        "Altura vertical",
        "Espesor",
        "Editar todo en Libre",
      ],
    ],
    [
      "plate",
      [
        "Placa perforada",
        "Ancho exterior",
        "Espesor",
        "Editar todo en Libre",
      ],
    ],
  ];

  for (const [templateId, expected] of cases) {
    assertIncludesAll(renderTemplateSmoke(templateId), [
      "Diseño",
      "Medidas principales",
      "Tamaños rápidos",
      ...expected,
    ]);
  }
});

test("free editor smoke covers empty tools, layers and inspector states", () => {
  const layersPanel = React.createElement(ObjectLayersPanel, {
    templateId: "free",
    objects: [],
    visibleSolidCount: 0,
    visibleCutoutCount: 0,
    selectedObjectId: null,
    selectedObjectIds: [],
    onAddObject: noop,
    onSelectFreeObject: noop,
    onSelectObject: noop,
    onToggleObjectState: noop,
    onMoveObjectInStack: noop,
  });
  const toolsHtml = render(
    React.createElement(
      ObjectsToolsPanel,
      {
        templateId: "free",
        objectsCount: 0,
        open: true,
        freeEditorView: "create",
        showDesignGallery: false,
        freeAddOperation: "solid",
        canUseCutouts: false,
        onOpenChange: noop,
        onFreeEditorViewChange: noop,
        onOpenDesignGallery: noop,
        onFreeAddOperationChange: noop,
        onBeginShapeDrag: noop,
        onShapeDragEnd: noop,
        onAddFreeObject: noop,
        onAddFreePreset: noop,
        onAddObject: noop,
      } as unknown as React.ComponentProps<typeof ObjectsToolsPanel>,
      layersPanel,
    ),
  );

  assertIncludesAll(toolsHtml, [
    "Herramientas",
    "Biblioteca",
    "Capas",
    "Figuras básicas",
    "Sólido",
    "Recorte",
    "La opción Recorte se habilita cuando agregues el primer",
    "0 sólidos",
    "0 recortes visibles",
  ]);

  const emptyInspectorHtml = render(
    React.createElement(FreeObjectInspectorPanel, {
      selectedObject: null,
      selectedObjectIds: [],
      freeTransformMode: "select",
      selectedObjectKindLabel: null,
      selectedObjectDescription: null,
      canExport: false,
      volumeCm3: 0,
      onTransformModeChange: noop,
      onAlignSelectedObjects: noop,
      onDistributeSelectedObjects: noop,
      onDuplicateSelectedObject: noop,
      onDeleteSelectedObject: noop,
      onUpdateObject: noop,
      onUpdateObjectById: noop,
      onToggleObjectState: noop,
      onOpenLibrary: noop,
      onOpenDesignGallery: noop,
    }),
  );

  assertIncludesAll(emptyInspectorHtml, [
    "Inspector",
    "Sin selección",
    "No hay nada seleccionado",
    "Abrir Biblioteca",
    "Ver diseños",
    "Agregá una forma visible",
  ]);

  const selectedInspectorHtml = render(
    React.createElement(FreeObjectInspectorPanel, {
      selectedObject: selectedCube,
      selectedObjectIds: [selectedCube.id],
      freeTransformMode: "select",
      selectedObjectKindLabel: "Caja",
      selectedObjectDescription: "Volumen rectangular editable.",
      canExport: true,
      volumeCm3: 4.8,
      onTransformModeChange: noop,
      onAlignSelectedObjects: noop,
      onDistributeSelectedObjects: noop,
      onDuplicateSelectedObject: noop,
      onDeleteSelectedObject: noop,
      onUpdateObject: noop,
      onUpdateObjectById: noop,
      onToggleObjectState: noop,
      onOpenLibrary: noop,
      onOpenDesignGallery: noop,
    }),
  );

  assertIncludesAll(selectedInspectorHtml, [
    "Cubo base",
    "Objeto seleccionado",
    "Tamaño del objeto",
    "Ubicación en la pieza",
    "Duplicar",
    "Convertir en recorte",
    "Listo para exportar",
  ]);
});

test("review and export smoke covers empty, valid and problematic states", () => {
  const emptyHtml = render(
    React.createElement(PieceStatusPanel, {
      statusLabel: "Sin sólidos",
      statusTone: "idle",
      detail: "Agregá al menos una forma sólida para poder comprobar y exportar.",
      nextStep: "Próximo paso: agregá una forma para empezar la pieza.",
      errorCount: 0,
      warningCount: 0,
      actionLabel: "Agregar forma",
      onAction: noop,
    }),
  );
  assertIncludesAll(emptyHtml, [
    "Sin sólidos",
    "0 errores",
    "0 advertencias",
    "Agregar forma",
  ]);

  const validHtml = render(
    React.createElement(PieceStatusPanel, {
      statusLabel: "Modelo válido",
      statusTone: "ready",
      detail: "La pieza no tiene problemas detectados.",
      nextStep: "Último paso: exportá el STL.",
      errorCount: 0,
      warningCount: 0,
      actionLabel: "Exportar STL",
      onAction: noop,
    }),
  );
  assertIncludesAll(validHtml, [
    "Modelo válido",
    "Último paso: exportá el STL.",
    "Exportar STL",
  ]);

  const invalidHtml = render(
    React.createElement(PieceStatusPanel, {
      statusLabel: "Necesita corrección",
      statusTone: "error",
      detail: "1 problema bloquea la exportación.",
      nextStep: "Próximo paso: revisá y corregí los problemas marcados.",
      errorCount: 1,
      warningCount: 0,
      actionLabel: "Corregir problemas",
      onAction: noop,
    }),
  );
  assertIncludesAll(invalidHtml, [
    "Necesita corrección",
    "1 errores",
    "Corregir problemas",
  ]);
});

test("slicer controls remain disabled when export is blocked", () => {
  const html = render(
    React.createElement(SlicerPanel, {
      disabled: true,
      slicing: false,
      result: null,
      onSlice: asyncNoop,
    }),
  );

  assertIncludesAll(html, [
    "Generar G-code",
    "Perfil de impresión",
    "BIQU B1",
    "Generar y descargar G-code",
  ]);
  assert.match(html, /<button[^>]*disabled=""/);
});
