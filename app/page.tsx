"use client";

import SlicerPanel from "./components/SlicerPanel";

import type { SliceResult } from "../lib/slicer/client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type * as ThreeTypes from "three";
import type { OrbitControls as OrbitControlsType } from "three/examples/jsm/controls/OrbitControls.js";
import type { TransformControls as TransformControlsType } from "three/examples/jsm/controls/TransformControls.js";
import { safeFileName } from "../lib/file-name";
import {
  getPrintProfile,
  PRINT_MATERIALS,
  type PrintMaterial,
} from "../lib/print-profile";
import {
  alignObjectSelection,
  cloneObjects,
  distributeObjectSelection,
  normalizeObjectSelection,
  patchObjectSelection,
  reorderObject,
} from "../lib/editor-operations";
import {
  modelPrimarySpec,
  TEMPLATES,
  validateModel,
  validateObjects,
} from "../lib/models";
import type {
  Cutout,
  CustomObject,
  LidStyle,
  ModelOptions,
  ModelParameters,
  ObjectKind,
  ObjectOperation,
  TemplateId,
} from "../lib/models";
import {
  isTemplateId,
  recordValue,
  restoreCutouts,
  restoreKnownSettings,
  restoreMeasurements,
  restoreObjects,
} from "../lib/project-storage";
import {
  createEditableTemplateDesign,
  createStarterDesign,
  createFreePreset,
  createFreePrimitive,
  STARTER_DESIGNS,
} from "../lib/shape-library";
import LandingPage from "./components/LandingPage";
import DesignGeometryPreview from "./components/DesignGeometryPreview";
import { useModalFocus } from "./hooks/useModalFocus";
import type {
  DesignCategory,
  FreeDesignId,
  FreePresetId,
  WorkplanePoint,
} from "../lib/shape-library";

type CameraView = "iso" | "x" | "y" | "z";
type TransformMode = "translate" | "rotate" | "scale";
type FreeEditorView = "create" | "designs" | "objects";
type ObjectHistory = {
  past: CustomObject[][];
  future: CustomObject[][];
};
type FeatureSettings = Omit<ModelOptions, "holes" | "objects">;
type ExportFormat = "stl" | "3mf" | "step";
type StoredProject = {
  id: string;
  projectName: string;
  templateId: TemplateId;
  parametersByTemplate: Record<TemplateId, ModelParameters>;
  featuresByTemplate: Record<TemplateId, FeatureSettings>;
  holesByTemplate: Record<TemplateId, Cutout[]>;
  objectsByTemplate: Record<TemplateId, CustomObject[]>;
  materialPrice: number;
  infill: number;
  materialProfile?: PrintMaterial;
  nozzleSize?: number;
  savedAt: string;
};
type PortableProject = {
  format: "forja-project";
  version: 1;
  exportedAt: string;
  project: StoredProject;
};
type ParametricTemplateId = Exclude<TemplateId, "free">;
type TemplatePreset = {
  id: string;
  name: string;
  detail: string;
  parameters: ModelParameters;
  features?: Partial<FeatureSettings>;
};
type TutorialStep = {
  eyebrow: string;
  title: string;
  description: string;
  time: string;
  bullets: string[];
  tip: string;
};

type PreviewRuntime = {
  THREE: typeof import("three");
  scene: ThreeTypes.Scene;
  camera: ThreeTypes.PerspectiveCamera;
  renderer: ThreeTypes.WebGLRenderer;
  controls: OrbitControlsType;
  model: ThreeTypes.Group;
  material: ThreeTypes.MeshStandardMaterial;
  accentMaterial: ThreeTypes.MeshStandardMaterial;
  holeMaterial: ThreeTypes.MeshStandardMaterial;
  transformControls: TransformControlsType;
  objectRoots: Map<string, ThreeTypes.Object3D>;
  selectableMeshes: ThreeTypes.Mesh[];
  geometries: ThreeTypes.BufferGeometry[];
  edgeResources: Array<{
    geometry: ThreeTypes.EdgesGeometry;
    material: ThreeTypes.LineBasicMaterial;
  }>;
  center: ThreeTypes.Vector3;
  maxDimension: number;
  currentTemplate: TemplateId | null;
  render: () => void;
};

const INITIAL_PARAMETERS = Object.fromEntries(
  TEMPLATES.map((template) => [template.id, { ...template.defaults }]),
) as Record<TemplateId, ModelParameters>;

const INITIAL_FEATURES: Record<TemplateId, FeatureSettings> = {
  box: {
    cornerRadius: 3,
    lidStyle: "snap",
    lidThickness: 2,
    standoffCount: 4,
    standoffDiameter: 7,
    standoffHeight: 8,
    standoffHole: 3,
  },
  bracket: {
    cornerRadius: 2,
    lidStyle: "none",
    lidThickness: 2,
    standoffCount: 0,
    standoffDiameter: 7,
    standoffHeight: 8,
    standoffHole: 3,
  },
  plate: {
    cornerRadius: 3,
    lidStyle: "none",
    lidThickness: 2,
    standoffCount: 0,
    standoffDiameter: 7,
    standoffHeight: 8,
    standoffHole: 3,
  },
  free: {
    cornerRadius: 4,
    lidStyle: "none",
    lidThickness: 2,
    standoffCount: 0,
    standoffDiameter: 7,
    standoffHeight: 8,
    standoffHole: 3,
  },
};

const INITIAL_HOLES: Record<TemplateId, Cutout[]> = {
  box: [
    { id: "box-usb", kind: "rect", face: "front", x: 0, z: 0, width: 12, height: 7 },
  ],
  bracket: [
    { id: "bracket-base-1", kind: "round", face: "base", x: -14, z: 2, width: 4.5, height: 4.5 },
    { id: "bracket-base-2", kind: "round", face: "base", x: 14, z: 2, width: 4.5, height: 4.5 },
    { id: "bracket-front-1", kind: "round", face: "front", x: -14, z: 4, width: 4.5, height: 4.5 },
    { id: "bracket-front-2", kind: "round", face: "front", x: 14, z: 4, width: 4.5, height: 4.5 },
  ],
  plate: [
    { id: "plate-1", kind: "round", face: "base", x: -35, z: -20, width: 4, height: 4 },
    { id: "plate-2", kind: "round", face: "base", x: 35, z: -20, width: 4, height: 4 },
    { id: "plate-3", kind: "round", face: "base", x: 35, z: 20, width: 4, height: 4 },
    { id: "plate-4", kind: "round", face: "base", x: -35, z: 20, width: 4, height: 4 },
  ],
  free: [],
};

const INITIAL_OBJECTS: Record<TemplateId, CustomObject[]> = {
  box: [],
  bracket: [],
  plate: [],
  free: [],
};

const TEMPLATE_PRESETS: Record<ParametricTemplateId, TemplatePreset[]> = {
  box: [
    {
      id: "box-mini",
      name: "Compacta",
      detail: "60 × 40 × 22 mm",
      parameters: { width: 60, depth: 40, height: 22, wall: 1.8, bottom: 2 },
      features: { cornerRadius: 3, lidStyle: "snap", lidThickness: 2 },
    },
    {
      id: "box-electronics",
      name: "Electrónica",
      detail: "90 × 60 × 30 mm",
      parameters: { width: 90, depth: 60, height: 30, wall: 2, bottom: 2 },
      features: { cornerRadius: 4, lidStyle: "screw", lidThickness: 2.2 },
    },
    {
      id: "box-robust",
      name: "Robusta",
      detail: "130 × 90 × 45 mm",
      parameters: { width: 130, depth: 90, height: 45, wall: 3, bottom: 3 },
      features: { cornerRadius: 6, lidStyle: "screw", lidThickness: 3 },
    },
  ],
  bracket: [
    {
      id: "bracket-light",
      name: "Liviana",
      detail: "40 × 25 × 35 mm",
      parameters: { width: 40, depth: 25, height: 35, thickness: 3, holeDiameter: 4 },
      features: { cornerRadius: 2 },
    },
    {
      id: "bracket-general",
      name: "Universal",
      detail: "60 × 35 × 45 mm",
      parameters: { width: 60, depth: 35, height: 45, thickness: 4, holeDiameter: 4.5 },
      features: { cornerRadius: 3 },
    },
    {
      id: "bracket-strong",
      name: "Reforzada",
      detail: "90 × 55 × 70 mm",
      parameters: { width: 90, depth: 55, height: 70, thickness: 6, holeDiameter: 6 },
      features: { cornerRadius: 4 },
    },
  ],
  plate: [
    {
      id: "plate-small",
      name: "Compacta",
      detail: "60 × 40 × 3 mm",
      parameters: { width: 60, depth: 40, thickness: 3, holeDiameter: 4, margin: 8 },
      features: { cornerRadius: 3 },
    },
    {
      id: "plate-electronics",
      name: "Electrónica",
      detail: "100 × 70 × 3 mm",
      parameters: { width: 100, depth: 70, thickness: 3, holeDiameter: 4, margin: 10 },
      features: { cornerRadius: 4 },
    },
    {
      id: "plate-panel",
      name: "Panel",
      detail: "180 × 120 × 4 mm",
      parameters: { width: 180, depth: 120, thickness: 4, holeDiameter: 5, margin: 12 },
      features: { cornerRadius: 6 },
    },
  ],
};

const PROJECT_LIBRARY_KEY = "forja:project-library";
const PROJECT_DRAFT_KEY = "forja:recovery-draft";
const TUTORIAL_STATUS_KEY = "forja:tutorial-status";
const DESIGN_CATEGORIES: Array<{ id: "all" | DesignCategory; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "organizacion", label: "Organización" },
  { id: "soportes", label: "Soportes" },
  { id: "electronica", label: "Electrónica" },
  { id: "hogar", label: "Hogar" },
];

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    eyebrow: "01 · Punto de partida",
    title: "Elegí cómo querés empezar",
    description:
      "Usá Caja, Soporte o Placa cuando necesites medidas rápidas. Entrá a Libre cuando quieras construir combinando piezas.",
    time: "1 min",
    bullets: [
      "Las plantillas resuelven la forma principal por vos.",
      "Los diseños iniciales de Libre se pueden modificar pieza por pieza.",
      "Nada queda bloqueado: siempre podés crear tu propia versión.",
    ],
    tip: "Para tu primer intento, empezá con una plantilla y después usá “Editar todo en Libre”.",
  },
  {
    eyebrow: "02 · Medidas reales",
    title: "Trabajá siempre en milímetros",
    description:
      "FORJA genera las piezas a escala real. Ancho, profundidad y altura corresponden a los ejes X, Z e Y del espacio 3D.",
    time: "1 min",
    bullets: [
      "Medí el objeto real y dejá una pequeña tolerancia para encastres.",
      "Usá los tamaños rápidos como base, no como una limitación.",
      "El espesor define qué tan resistente será la pieza.",
    ],
    tip: "Un encastre suele necesitar entre 0,2 y 0,5 mm de holgura según la impresora y el material.",
  },
  {
    eyebrow: "03 · Construcción",
    title: "Sólidos agregan, recortes quitan",
    description:
      "En Libre, cada figura puede sumar material o funcionar como agujero. Al superponerlas se forma el resultado final.",
    time: "1 min",
    bullets: [
      "Primero agregá al menos un sólido.",
      "Convertí cilindros, cubos o texto en Recorte para perforar.",
      "Ocultá o bloqueá capas mientras ordenás un diseño complejo.",
    ],
    tip: "Para un agujero pasante, hacé que el recorte sea un poco más alto que la pieza.",
  },
  {
    eyebrow: "04 · Edición precisa",
    title: "Mové, rotá y ajustá sin adivinar",
    description:
      "Seleccioná una pieza en el visor o en Capas. Podés usar los controles 3D o escribir valores exactos en el Inspector.",
    time: "1 min",
    bullets: [
      "El imán ajusta los movimientos a pasos de 0,5, 1, 2 o 5 mm.",
      "Las vistas X, Y y Z sirven para alinear la cámara.",
      "Deshacer, duplicar, alinear y distribuir aceleran el trabajo.",
    ],
    tip: "Usá “Apoyar en piso” cuando una figura quede flotando después de moverla.",
  },
  {
    eyebrow: "05 · Fabricación",
    title: "Comprobá antes de exportar",
    description:
      "La comprobación detecta medidas inválidas y estima material, costo y tiempo. Después podés descargar STL, 3MF o STEP.",
    time: "1 min",
    bullets: [
      "Corregí todos los errores marcados antes de descargar.",
      "STL contiene la geometría; todavía necesita pasar por un laminador.",
      "Hacé una prueba pequeña antes de imprimir encastres o piezas grandes.",
    ],
    tip: "Exportar no inicia una impresión: abrí el archivo en Cura, OrcaSlicer o tu laminador habitual.",
  },
];

function cloneHoleMap(source: Record<TemplateId, Cutout[]>) {
  return Object.fromEntries(
    Object.entries(source).map(([key, holes]) => [
      key,
      holes.map((hole) => ({ ...hole })),
    ]),
  ) as Record<TemplateId, Cutout[]>;
}

function cloneObjectMap(source: Record<TemplateId, CustomObject[]>) {
  return Object.fromEntries(
    Object.entries(source).map(([key, objects]) => [
      key,
      objects.map((object) => ({ ...object })),
    ]),
  ) as Record<TemplateId, CustomObject[]>;
}

function createId(prefix: string) {
  const browserCrypto = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === "function") {
    return `${prefix}-${browserCrypto.randomUUID()}`;
  }
  const randomPart = new Uint32Array(2);
  if (typeof browserCrypto?.getRandomValues === "function") {
    browserCrypto.getRandomValues(randomPart);
  } else {
    randomPart[0] = Math.floor(Math.random() * 0xffffffff);
    randomPart[1] = Math.floor(Math.random() * 0xffffffff);
  }
  return `${prefix}-${Date.now().toString(36)}-${Array.from(randomPart, (value) =>
    value.toString(36),
  ).join("")}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function objectVolumeMm3(object: CustomObject) {
  if (object.kind === "cylinder") {
    return Math.PI * (object.width / 2) ** 2 * object.height;
  }
  if (object.kind === "cone") {
    return (Math.PI * (object.width / 2) ** 2 * object.height) / 3;
  }
  if (object.kind === "tube") {
    return (
      Math.PI *
      ((object.width / 2) ** 2 - (object.depth / 2) ** 2) *
      object.height
    );
  }
  if (object.kind === "wedge") {
    return (object.width * object.depth * object.height) / 2;
  }
  if (object.kind === "sphere") {
    return (4 / 3) * Math.PI * (object.width / 2) ** 3;
  }
  if (object.kind === "text") {
    return object.width * Math.max(1, object.text?.length ?? 5) * object.width * 0.45 * object.height;
  }
  return object.width * object.depth * object.height;
}

function estimatedVolumeCm3(
  templateId: TemplateId,
  parameters: ModelParameters,
  options: ModelOptions,
) {
  let volume = 0;
  if (templateId === "box") {
    const outer = parameters.width * parameters.depth * parameters.height;
    const cavity =
      (parameters.width - parameters.wall * 2) *
      (parameters.depth - parameters.wall * 2) *
      (parameters.height - parameters.bottom);
    volume = Math.max(0, outer - cavity);
  } else if (templateId === "bracket") {
    volume =
      parameters.width * parameters.depth * parameters.thickness +
      parameters.width * parameters.height * parameters.thickness -
      parameters.width * parameters.thickness ** 2;
  } else if (templateId === "free") {
    volume = 0;
  } else {
    volume = parameters.width * parameters.depth * parameters.thickness;
  }

  if (templateId !== "free") {
    options.holes.forEach((hole) => {
    const area =
      hole.kind === "round"
        ? Math.PI * (hole.width / 2) ** 2
        : hole.width * hole.height;
    const thickness =
      templateId === "box"
        ? hole.face === "base"
          ? parameters.bottom
          : parameters.wall
        : parameters.thickness;
    volume -= area * thickness;
    });
  }

  if (templateId === "box" && options.lidStyle !== "none") {
    volume += parameters.width * parameters.depth * options.lidThickness;
  }
  if (templateId === "box" && options.standoffCount > 0) {
    const ringArea =
      Math.PI *
      ((options.standoffDiameter / 2) ** 2 - (options.standoffHole / 2) ** 2);
    volume += ringArea * options.standoffHeight * options.standoffCount;
  }
  volume += options.objects.filter((object) => !object.hidden).reduce(
    (total, object) =>
      total +
      objectVolumeMm3(object) * (object.operation === "hole" ? -1 : 1),
    0,
  );
  return Math.max(0, volume / 1000);
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function positionPreviewCamera(runtime: PreviewRuntime, view: CameraView) {
  const { camera, controls, center, maxDimension } = runtime;
  const distance = maxDimension * 1.9;
  camera.up.set(0, 1, 0);
  if (view === "x") {
    camera.position.set(center.x + distance, center.y, center.z);
  } else if (view === "y") {
    camera.up.set(0, 0, -1);
    camera.position.set(center.x, center.y + distance, center.z + 0.001);
  } else if (view === "z") {
    camera.position.set(center.x, center.y, center.z + distance);
  } else {
    camera.position.set(
      center.x + maxDimension * 1.35,
      center.y + maxDimension * 1.15,
      center.z + maxDimension * 1.45,
    );
  }
  controls.target.copy(center);
  controls.update();
}

function clampValue(value: number, minimum: number, maximum: number) {
  if (minimum > maximum) return 0;
  return Math.min(maximum, Math.max(minimum, value));
}

function MovePad({
  selected,
  x,
  z,
  onMoveBy,
  onCenter,
}: {
  selected: boolean;
  x: number;
  z: number;
  onMoveBy: (deltaX: number, deltaZ: number) => void;
  onCenter: () => void;
}) {
  const [step, setStep] = useState(1);
  return (
    <div className={`move-console ${selected ? "" : "disabled"}`}>
      <div className="move-readout">
        <span>Mover seleccionado</span>
        <strong>{selected ? `X ${x.toFixed(1)} · Z ${z.toFixed(1)}` : "Elegí un elemento"}</strong>
        <label>
          Paso
          <select
            value={step}
            onChange={(event) => setStep(Number(event.target.value))}
            disabled={!selected}
            aria-label="Paso de movimiento en milímetros"
          >
            <option value="0.5">0,5 mm</option>
            <option value="1">1 mm</option>
            <option value="5">5 mm</option>
          </select>
        </label>
      </div>
      <div className="direction-pad" aria-label="Mover elemento con flechas">
        <button disabled={!selected} onClick={() => onMoveBy(0, step)} aria-label="Mover hacia arriba">↑</button>
        <button disabled={!selected} onClick={() => onMoveBy(-step, 0)} aria-label="Mover a la izquierda">←</button>
        <button disabled={!selected} onClick={onCenter} className="center-button" aria-label="Centrar elemento">●</button>
        <button disabled={!selected} onClick={() => onMoveBy(step, 0)} aria-label="Mover a la derecha">→</button>
        <button disabled={!selected} onClick={() => onMoveBy(0, -step)} aria-label="Mover hacia abajo">↓</button>
      </div>
    </div>
  );
}

function FacePlacementEditor({
  holes,
  selectedId,
  width,
  height,
  placementTool,
  roundSurface = false,
  onPlace,
  onSelect,
  onMove,
}: {
  holes: Cutout[];
  selectedId: string | null;
  width: number;
  height: number;
  placementTool: Cutout["kind"] | null;
  onPlace: (kind: Cutout["kind"], x: number, z: number) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  roundSurface?: boolean;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const selectedHole = holes.find((hole) => hole.id === selectedId) ?? null;

  const coordinatesFromPointer = (event: ReactPointerEvent) => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, z: 0 };
    return {
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * width,
      z: (0.5 - (event.clientY - bounds.top) / bounds.height) * height,
    };
  };

  return (
    <div className="visual-editor">
      <div className="visual-editor-head">
        <span>Vista de la cara</span>
        <small>{Math.round(width)} × {Math.round(height)} mm</small>
      </div>
      <div
        ref={surfaceRef}
        className={`design-surface cutout-surface ${placementTool ? "placing" : ""} ${
          roundSurface ? "round-surface" : ""
        }`}
        style={{ aspectRatio: `${Math.max(width, 1)} / ${Math.max(height, 1)}` }}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const point = coordinatesFromPointer(event);
          if (placementTool) {
            onPlace(placementTool, point.x, point.z);
          } else if (selectedId) {
            onMove(selectedId, point.x, point.z);
          }
        }}
        aria-label="Plano de colocación de agujeros y recortes"
      >
        <span className="surface-axis horizontal">X</span>
        <span className="surface-axis vertical">Z</span>
        {holes.map((hole, index) => {
          const renderedHeight = hole.kind === "round" ? hole.width : hole.height;
          return (
            <button
              key={hole.id}
              type="button"
              className={`surface-item cutout-item ${hole.kind} ${
                selectedId === hole.id ? "selected" : ""
              }`}
              style={{
                left: `${(hole.x / width + 0.5) * 100}%`,
                top: `${(0.5 - hole.z / height) * 100}%`,
                width: `${Math.max(3.5, (hole.width / width) * 100)}%`,
                height: `${Math.max(7, (renderedHeight / height) * 100)}%`,
              }}
              onClick={() => onSelect(hole.id)}
              aria-label={`Seleccionar recorte ${index + 1}`}
            >
              <span>{index + 1}</span>
            </button>
          );
        })}
      </div>
      <p className="editor-hint">
        {placementTool
          ? "Tocá cualquier punto de la cara para colocarlo."
          : holes.length
            ? "Elegí un recorte y tocá el lugar exacto donde querés moverlo."
            : "Elegí un tipo de recorte para empezar."}
      </p>
      <MovePad
        selected={Boolean(selectedHole)}
        x={selectedHole?.x ?? 0}
        z={selectedHole?.z ?? 0}
        onMoveBy={(deltaX, deltaZ) => {
          if (selectedHole) {
            onMove(selectedHole.id, selectedHole.x + deltaX, selectedHole.z + deltaZ);
          }
        }}
        onCenter={() => {
          if (selectedHole) onMove(selectedHole.id, 0, 0);
        }}
      />
    </div>
  );
}

function objectFootprint(object: CustomObject) {
  if (object.kind === "text") {
    return {
      width: object.width * Math.max(1, object.text?.length ?? 5) * 0.58,
      depth: Math.max(2, object.width * 0.7),
    };
  }
  if (
    object.kind === "cylinder" ||
    object.kind === "sphere" ||
    object.kind === "cone" ||
    object.kind === "tube"
  ) {
    return { width: object.width, depth: object.width };
  }
  return { width: object.width, depth: object.depth };
}

function ObjectPlacementEditor({
  objects,
  selectedId,
  width,
  depth,
  onSelect,
  onMove,
}: {
  objects: CustomObject[];
  selectedId: string | null;
  width: number;
  depth: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const selectedObject = objects.find((object) => object.id === selectedId) ?? null;

  const coordinatesFromPointer = (event: ReactPointerEvent) => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, z: 0 };
    return {
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * width,
      z: (0.5 - (event.clientY - bounds.top) / bounds.height) * depth,
    };
  };

  return (
    <div className="visual-editor object-editor">
      <div className="visual-editor-head">
        <span>Vista superior de la pieza</span>
        <small>{Math.round(width)} × {Math.round(depth)} mm</small>
      </div>
      <div
        ref={surfaceRef}
        className="design-surface object-surface"
        style={{ aspectRatio: `${Math.max(width, 1)} / ${Math.max(depth, 1)}` }}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget || !selectedId) return;
          const point = coordinatesFromPointer(event);
          onMove(selectedId, point.x, point.z);
        }}
        aria-label="Plano de colocación de figuras y textos"
      >
        <span className="surface-axis horizontal">X</span>
        <span className="surface-axis vertical">Z</span>
        {objects.map((object) => {
          const footprint = objectFootprint(object);
          return (
            <button
              key={object.id}
              type="button"
              className={`surface-item object-item ${object.kind} ${
                selectedId === object.id ? "selected" : ""
              }`}
              style={{
                left: `${(object.x / width + 0.5) * 100}%`,
                top: `${(0.5 - object.z / depth) * 100}%`,
                width: `${Math.max(7, (footprint.width / width) * 100)}%`,
                height: `${Math.max(10, (footprint.depth / depth) * 100)}%`,
                transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
              }}
              onClick={() => onSelect(object.id)}
              aria-label={`Seleccionar ${object.name}`}
            >
              {object.kind === "text" ? object.text || "Texto" : object.name.slice(0, 1)}
            </button>
          );
        })}
      </div>
      <p className="editor-hint">
        {objects.length
          ? "Elegí una figura y tocá el lugar donde querés moverla."
          : "Agregá una figura o un texto para ubicarlo visualmente."}
      </p>
      <MovePad
        selected={Boolean(selectedObject)}
        x={selectedObject?.x ?? 0}
        z={selectedObject?.z ?? 0}
        onMoveBy={(deltaX, deltaZ) => {
          if (selectedObject) {
            onMove(
              selectedObject.id,
              selectedObject.x + deltaX,
              selectedObject.z + deltaZ,
            );
          }
        }}
        onCenter={() => {
          if (selectedObject) onMove(selectedObject.id, 0, 0);
        }}
      />
    </div>
  );
}

function FallbackModel({
  templateId,
  parameters,
  onRetry,
}: {
  templateId: TemplateId;
  parameters: ModelParameters;
  onRetry: () => void;
}) {
  return (
    <div className="fallback-preview">
      {templateId === "box" && (
        <div className="fallback-box" aria-hidden="true">
          <i className="face inner" />
          <i className="face back" />
          <i className="face left" />
          <i className="face right" />
          <i className="face front" />
        </div>
      )}
      {templateId === "bracket" && (
        <div className="fallback-bracket" aria-hidden="true">
          <i className="vertical" />
          <i className="horizontal" />
          <b className="hole h1" />
          <b className="hole h2" />
          <b className="hole h3" />
          <b className="hole h4" />
        </div>
      )}
      {(templateId === "plate" || templateId === "free") && (
        <div className="fallback-plate" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
      )}
      <div className="fallback-message">
        <strong>El visor 3D no pudo iniciar</strong>
        <span>
          Vista simplificada · {parameters.width} × {parameters.depth} mm
        </span>
        <button type="button" onClick={onRetry}>Reintentar visor 3D</button>
      </div>
    </div>
  );
}

function ModelPreview({
  templateId,
  parameters,
  options,
  isValid,
  cameraView,
  selectedObjectId,
  selectedObjectIds = [],
  transformMode,
  snapEnabled = true,
  snapSize = 1,
  onSelectObject,
  onTransformObject,
}: {
  templateId: TemplateId;
  parameters: ModelParameters;
  options: ModelOptions;
  isValid: boolean;
  cameraView: CameraView;
  selectedObjectId?: string | null;
  selectedObjectIds?: string[];
  transformMode?: TransformMode;
  snapEnabled?: boolean;
  snapSize?: number;
  onSelectObject?: (id: string | null, additive: boolean) => void;
  onTransformObject?: (
    id: string,
    patch: Partial<CustomObject>,
  ) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<PreviewRuntime | null>(null);
  const cameraViewRef = useRef(cameraView);
  const templateRef = useRef(templateId);
  const selectedObjectIdRef = useRef(selectedObjectId);
  const selectedObjectIdsRef = useRef(selectedObjectIds);
  const transformModeRef = useRef(transformMode);
  const snapEnabledRef = useRef(snapEnabled);
  const snapSizeRef = useRef(snapSize);
  const selectObjectRef = useRef(onSelectObject);
  const transformObjectRef = useRef(onTransformObject);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [geometryError, setGeometryError] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(0);
  const [isPreparing, setIsPreparing] = useState(true);
  const [rendererAttempt, setRendererAttempt] = useState(0);

  useEffect(() => {
    cameraViewRef.current = cameraView;
  }, [cameraView]);

  useEffect(() => {
    templateRef.current = templateId;
    selectedObjectIdRef.current = selectedObjectId;
    selectedObjectIdsRef.current = selectedObjectIds;
    transformModeRef.current = transformMode;
    snapEnabledRef.current = snapEnabled;
    snapSizeRef.current = snapSize;
    selectObjectRef.current = onSelectObject;
    transformObjectRef.current = onTransformObject;
  }, [
    templateId,
    selectedObjectId,
    selectedObjectIds,
    transformMode,
    snapEnabled,
    snapSize,
    onSelectObject,
    onTransformObject,
  ]);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;

    const initializePreview = async () => {
      const [THREE, { OrbitControls }, { TransformControls }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("three/examples/jsm/controls/TransformControls.js"),
      ]);
      if (cancelled) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 5000);
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: window.devicePixelRatio <= 1.5,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: true,
            powerPreference: "default",
          });
        } catch {
          window.setTimeout(() => {
            setIsPreparing(false);
            setWebglUnavailable(true);
          }, 0);
          return;
        }
      }

      const handleContextLost = (event: Event) => {
        event.preventDefault();
        setIsPreparing(false);
        setWebglUnavailable(true);
      };
      renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      host.appendChild(renderer.domElement);

      const material = new THREE.MeshPhysicalMaterial({
        color: 0x3bc4f3,
        roughness: 0.32,
        metalness: 0.07,
        clearcoat: 0.36,
        clearcoatRoughness: 0.28,
        side: THREE.DoubleSide,
      });
      const accentMaterial = new THREE.MeshStandardMaterial({
        color: 0xffb454,
        roughness: 0.36,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });
      const holeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff657a,
        roughness: 0.42,
        metalness: 0.02,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const model = new THREE.Group();
      scene.add(model);

      const grid = new THREE.GridHelper(
        520,
        52,
        0x1b9dde,
        0x163346,
      );
      grid.material.transparent = true;
      grid.material.opacity = 0.38;
      scene.add(grid);

      scene.add(new THREE.HemisphereLight(0xe7f8ff, 0x07111a, 2.1));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
      keyLight.position.set(180, 260, 180);
      scene.add(keyLight);
      const blueLight = new THREE.DirectionalLight(0x1589ff, 2.2);
      blueLight.position.set(-180, 180, -180);
      scene.add(blueLight);

      camera.position.set(120, 100, 140);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 15, 0);
      controls.enableDamping = false;
      controls.minDistance = 15;
      controls.maxDistance = 1200;
      controls.update();

      const transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.setTranslationSnap(
        snapEnabledRef.current ? snapSizeRef.current : null,
      );
      transformControls.setRotationSnap(THREE.MathUtils.degToRad(5));
      scene.add(transformControls.getHelper());
      const render = () => renderer.render(scene, camera);
      controls.addEventListener("change", render);
      transformControls.addEventListener("change", render);
      let lastTransformRelease = 0;
      const handleDraggingChanged = (event: { value: unknown }) => {
        controls.enabled = !Boolean(event.value);
      };
      const handleTransformEnd = () => {
        lastTransformRelease = performance.now();
        const root = transformControls.object;
        const object = root?.userData.forjaObject as CustomObject | undefined;
        if (!root || !object) return;
        const round = (value: number) => Number(value.toFixed(2));
        const patch: Partial<CustomObject> = {
          x: round(root.position.x),
          y: round(root.position.y),
          z: round(root.position.z),
          rotationX: round(THREE.MathUtils.radToDeg(root.rotation.x)),
          rotation: round(THREE.MathUtils.radToDeg(root.rotation.y)),
          rotationZ: round(THREE.MathUtils.radToDeg(root.rotation.z)),
        };
        if (transformControls.mode === "scale") {
          if (object.kind === "cube" || object.kind === "wedge") {
            patch.width = Math.max(0.5, round(object.width * Math.abs(root.scale.x)));
            patch.height = Math.max(0.5, round(object.height * Math.abs(root.scale.y)));
            patch.depth = Math.max(0.5, round(object.depth * Math.abs(root.scale.z)));
          } else if (object.kind === "sphere") {
            patch.width = Math.max(
              0.5,
              round(object.width * Math.max(
                Math.abs(root.scale.x),
                Math.abs(root.scale.y),
                Math.abs(root.scale.z),
              )),
            );
          } else {
            const radialScale = Math.max(
              Math.abs(root.scale.x),
              Math.abs(root.scale.z),
            );
            patch.width = Math.max(
              0.5,
              round(object.width * radialScale),
            );
            if (object.kind === "tube") {
              patch.depth = Math.max(
                0.25,
                round(object.depth * radialScale),
              );
            }
            patch.height = Math.max(0.5, round(object.height * Math.abs(root.scale.y)));
          }
        }
        transformObjectRef.current?.(object.id, patch);
      };
      transformControls.addEventListener("dragging-changed", handleDraggingChanged);
      transformControls.addEventListener("mouseUp", handleTransformEnd);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const selectFromCanvas = (event: PointerEvent) => {
        const runtime = runtimeRef.current;
        if (
          !runtime ||
          templateRef.current !== "free" ||
          runtime.transformControls.dragging ||
          performance.now() - lastTransformRelease < 120
        ) {
          return;
        }
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const intersection = raycaster.intersectObjects(runtime.selectableMeshes, false)[0];
        const id = intersection?.object.userData.forjaObjectId as string | undefined;
        selectObjectRef.current?.(
          id ?? null,
          event.shiftKey || event.ctrlKey || event.metaKey,
        );
      };
      renderer.domElement.addEventListener("pointerup", selectFromCanvas);

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        render();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();

      render();

      runtimeRef.current = {
        THREE,
        scene,
        camera,
        renderer,
        controls,
        model,
        material,
        accentMaterial,
        holeMaterial,
        transformControls,
        objectRoots: new Map(),
        selectableMeshes: [],
        geometries: [],
        edgeResources: [],
        center: new THREE.Vector3(0, 15, 0),
        maxDimension: 80,
        currentTemplate: null,
        render,
      };
      setWebglUnavailable(false);
      setRuntimeReady((value) => value + 1);

      return () => {
        observer.disconnect();
        renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
        renderer.domElement.removeEventListener("pointerup", selectFromCanvas);
        controls.removeEventListener("change", render);
        transformControls.removeEventListener("change", render);
        transformControls.removeEventListener("dragging-changed", handleDraggingChanged);
        transformControls.removeEventListener("mouseUp", handleTransformEnd);
      };
    };

    let stopLoop: (() => void) | undefined;
    void initializePreview()
      .then((disposeLoop) => {
        stopLoop = disposeLoop;
      })
      .catch(() => {
        setIsPreparing(false);
        setWebglUnavailable(true);
      });

    return () => {
      cancelled = true;
      stopLoop?.();
      const runtime = runtimeRef.current;
      if (!runtime) return;
      runtime.controls.dispose();
      runtime.geometries.forEach((geometry) => geometry.dispose());
      runtime.edgeResources.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
      runtime.material.dispose();
      runtime.accentMaterial.dispose();
      runtime.holeMaterial.dispose();
      runtime.transformControls.detach();
      runtime.transformControls.dispose();
      runtime.transformControls.getHelper().removeFromParent();
      runtime.renderer.dispose();
      runtime.renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, [rendererAttempt]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !runtimeReady || !isValid) return;
    let cancelled = false;

    const updateGeometry = async () => {
      const { createModelGeometries } = await import("../lib/model-geometry");
      const geometries = await createModelGeometries(
        templateId,
        parameters,
        options,
        templateId !== "free",
      );
      if (cancelled) {
        geometries.forEach((geometry) => geometry.dispose());
        return;
      }

      const accentStart = Math.max(0, geometries.length - options.objects.length);
      const nextChildren: ThreeTypes.Object3D[] = [];
      const nextEdges: PreviewRuntime["edgeResources"] = [];
      runtime.transformControls.detach();
      runtime.objectRoots.clear();
      runtime.selectableMeshes = [];
      geometries.forEach((geometry, index) => {
        const object = geometry.userData.forjaObject as CustomObject | undefined;
        const isFreeObject = templateId === "free" && Boolean(object);
        const isAccent = index >= accentStart;
        const mesh = new runtime.THREE.Mesh(
          geometry,
          object?.operation === "hole"
            ? runtime.holeMaterial
            : isAccent ? runtime.accentMaterial : runtime.material,
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const edgeGeometry = new runtime.THREE.EdgesGeometry(geometry, 24);
        const isSelected =
          Boolean(object) &&
          selectedObjectIdsRef.current.includes(object?.id ?? "");
        const edgeBaseColor =
          object?.operation === "hole"
            ? 0xff9cab
            : isAccent ? 0xffe2b5 : 0xdaf6ff;
        const edgeMaterial = new runtime.THREE.LineBasicMaterial({
          color: isSelected ? 0xffffff : edgeBaseColor,
          transparent: true,
          opacity: isSelected ? 0.95 : 0.42,
        });
        const edges = new runtime.THREE.LineSegments(edgeGeometry, edgeMaterial);
        if (isFreeObject && object) {
          const root = new runtime.THREE.Group();
          root.position.set(object.x, object.y, object.z);
          root.rotation.set(
            runtime.THREE.MathUtils.degToRad(object.rotationX ?? 0),
            runtime.THREE.MathUtils.degToRad(object.rotation),
            runtime.THREE.MathUtils.degToRad(object.rotationZ ?? 0),
          );
          root.userData.forjaObject = { ...object };
          root.userData.forjaObjectId = object.id;
          root.userData.forjaEdgeMaterial = edgeMaterial;
          root.userData.forjaEdgeBaseColor = edgeBaseColor;
          mesh.userData.forjaObjectId = object.id;
          root.add(mesh, edges);
          runtime.objectRoots.set(object.id, root);
          runtime.selectableMeshes.push(mesh);
          nextChildren.push(root);
        } else {
          nextChildren.push(mesh, edges);
        }
        nextEdges.push({ geometry: edgeGeometry, material: edgeMaterial });
      });

      const previousTarget = runtime.controls.target.clone();
      const previousOffset = runtime.camera.position.clone().sub(previousTarget);
      runtime.model.clear();
      nextChildren.forEach((child) => runtime.model.add(child));
      runtime.geometries.forEach((geometry) => geometry.dispose());
      runtime.edgeResources.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
      runtime.geometries = geometries;
      runtime.edgeResources = nextEdges;

      const hasGeometry = geometries.length > 0;
      const bounds = new runtime.THREE.Box3().setFromObject(runtime.model);
      const size = hasGeometry
        ? bounds.getSize(new runtime.THREE.Vector3())
        : new runtime.THREE.Vector3(parameters.width, 20, parameters.depth);
      const center = hasGeometry
        ? bounds.getCenter(new runtime.THREE.Vector3())
        : new runtime.THREE.Vector3(0, 0, 0);
      runtime.center.copy(center);
      runtime.maxDimension = Math.max(size.x, size.y, size.z, 20);
      runtime.controls.minDistance = runtime.maxDimension * 0.55;
      runtime.controls.maxDistance = runtime.maxDimension * 8;

      if (runtime.currentTemplate !== templateId) {
        positionPreviewCamera(runtime, cameraViewRef.current);
        runtime.currentTemplate = templateId;
      } else {
        runtime.controls.target.copy(center);
        runtime.camera.position.copy(center.clone().add(previousOffset));
        runtime.controls.update();
      }
      const selectedRoot =
        templateId === "free" && selectedObjectIdRef.current
          ? runtime.objectRoots.get(selectedObjectIdRef.current)
          : undefined;
      const selectedRootObject = selectedRoot?.userData
        .forjaObject as CustomObject | undefined;
      if (selectedRoot && !selectedRootObject?.locked) {
        runtime.transformControls.attach(selectedRoot);
        runtime.transformControls.setMode(transformModeRef.current ?? "translate");
      }
      runtime.render();
      setIsPreparing(false);
      setGeometryError(false);
    };

    const updateTimer = window.setTimeout(() => {
      void updateGeometry().catch(() => {
        if (!cancelled) {
          setIsPreparing(false);
          setGeometryError(true);
        }
      });
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(updateTimer);
    };
  }, [
    runtimeReady,
    templateId,
    parameters,
    options,
    isValid,
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !runtimeReady) return;
    runtime.transformControls.setMode(transformMode ?? "translate");
    runtime.transformControls.setTranslationSnap(snapEnabled ? snapSize : null);
    const selectedSet = new Set(selectedObjectIds);
    runtime.objectRoots.forEach((root, id) => {
      const edgeMaterial = root.userData
        .forjaEdgeMaterial as ThreeTypes.LineBasicMaterial | undefined;
      if (!edgeMaterial) return;
      const isSelected = selectedSet.has(id);
      edgeMaterial.color.setHex(
        isSelected
          ? 0xffffff
          : (root.userData.forjaEdgeBaseColor as number | undefined) ?? 0xdaf6ff,
      );
      edgeMaterial.opacity = isSelected ? 0.95 : 0.42;
    });
    const selectedRoot =
      templateId === "free" && selectedObjectId
        ? runtime.objectRoots.get(selectedObjectId)
        : undefined;
    const selectedRootObject = selectedRoot?.userData
      .forjaObject as CustomObject | undefined;
    if (selectedRoot && !selectedRootObject?.locked) {
      runtime.transformControls.attach(selectedRoot);
    } else {
      runtime.transformControls.detach();
    }
    runtime.render();
  }, [
    runtimeReady,
    templateId,
    selectedObjectId,
    selectedObjectIds,
    transformMode,
    snapEnabled,
    snapSize,
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !runtimeReady || !runtime.geometries.length) return;
    positionPreviewCamera(runtime, cameraView);
    runtime.render();
  }, [cameraView, runtimeReady]);

  return (
    <div
      ref={hostRef}
      className="model-canvas"
      aria-label="Vista previa tridimensional de la pieza"
    >
      {webglUnavailable && (
        <FallbackModel
          templateId={templateId}
          parameters={parameters}
          onRetry={() => {
            setWebglUnavailable(false);
            setGeometryError(false);
            setIsPreparing(true);
            setRendererAttempt((attempt) => attempt + 1);
          }}
        />
      )}
      {isPreparing && !webglUnavailable && (
        <div className="preview-loading" role="status">
          <span />
          Preparando el motor 3D
        </div>
      )}
      {geometryError && !webglUnavailable && (
        <div className="preview-error" role="status">
          No pudimos reconstruir esta combinación. Revisá las medidas o deshacé
          el último cambio.
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [templateId, setTemplateId] = useState<TemplateId>("box");
  const [parametersByTemplate, setParametersByTemplate] =
    useState<Record<TemplateId, ModelParameters>>(INITIAL_PARAMETERS);
  const [featuresByTemplate, setFeaturesByTemplate] =
    useState<Record<TemplateId, FeatureSettings>>(INITIAL_FEATURES);
  const [holesByTemplate, setHolesByTemplate] = useState(() =>
    cloneHoleMap(INITIAL_HOLES),
  );
  const [objectsByTemplate, setObjectsByTemplate] = useState(() =>
    cloneObjectMap(INITIAL_OBJECTS),
  );
  const [projectName, setProjectName] = useState("mi-pieza-forja");
  const [materialPrice, setMaterialPrice] = useState(25000);
  const [infill, setInfill] = useState(20);
  const [materialProfile, setMaterialProfile] = useState<PrintMaterial>("pla");
  const [nozzleSize, setNozzleSize] = useState(0.4);
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>("box-usb");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [cutoutFace, setCutoutFace] = useState<Cutout["face"]>("base");
  const [cutoutTool, setCutoutTool] = useState<Cutout["kind"] | null>(null);
  const [freeTransformMode, setFreeTransformMode] =
    useState<TransformMode>("translate");
  const [freeEditorView, setFreeEditorView] =
    useState<FreeEditorView>("create");
  const [freeAddOperation, setFreeAddOperation] =
    useState<ObjectOperation>("solid");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapSize, setSnapSize] = useState(1);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const objectHistoryRef = useRef<ObjectHistory>({ past: [], future: [] });
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [cameraView, setCameraView] = useState<CameraView>("iso");
  const [savedMessage, setSavedMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showDesignGallery, setShowDesignGallery] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showStart, setShowStart] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<StoredProject[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [librarySort, setLibrarySort] = useState<"recent" | "name">("recent");
  const [designQuery, setDesignQuery] = useState("");
  const [designCategory, setDesignCategory] = useState<"all" | DesignCategory>("all");
  const [selectedDesignId, setSelectedDesignId] = useState<FreeDesignId>("phone-stand");
  const [openToolSections, setOpenToolSections] = useState({
    measurements: true,
    manufacturing: true,
    freeTools: true,
  });
  const [recoveryDraft, setRecoveryDraft] = useState<StoredProject | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"waiting" | "saving" | "saved">("waiting");
  const [feedbackText, setFeedbackText] = useState("");
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [slicing, setSlicing] = useState(false);
  const [sliceResult, setSliceResult] =
    useState<SliceResult | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const pendingDraftRef = useRef<StoredProject | null>(null);
  const modalOpen = showTutorial || showLibrary || showDesignGallery || showFeedback;

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(
          localStorage.getItem(PROJECT_LIBRARY_KEY) ?? "[]",
        ) as unknown;
        if (!Array.isArray(parsed)) return;
        setSavedProjects(
          parsed.filter(
            (project): project is StoredProject =>
              typeof project === "object" &&
              project !== null &&
              typeof (project as { id?: unknown }).id === "string" &&
              typeof (project as { projectName?: unknown }).projectName === "string" &&
              typeof (project as { savedAt?: unknown }).savedAt === "string",
          ),
        );
        const draft = JSON.parse(
          localStorage.getItem(PROJECT_DRAFT_KEY) ?? "null",
        ) as unknown;
        if (
          typeof draft === "object" &&
          draft !== null &&
          typeof (draft as { projectName?: unknown }).projectName === "string" &&
          typeof (draft as { savedAt?: unknown }).savedAt === "string"
        ) {
          setRecoveryDraft(draft as StoredProject);
        }
      } catch {
        // Invalid browser data is ignored and the empty library stays usable.
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    const tutorialTimer = window.setTimeout(() => {
      try {
        const status = localStorage.getItem(TUTORIAL_STATUS_KEY);
        setTutorialCompleted(status === "completed");
      } catch {
        // The tutorial remains available manually when storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(tutorialTimer);
  }, []);

  useModalFocus(modalOpen, () => {
    if (showFeedback) setShowFeedback(false);
    else if (showLibrary) setShowLibrary(false);
    else if (showDesignGallery) setShowDesignGallery(false);
    else if (showTutorial) {
      setShowTutorial(false);
      try {
        localStorage.setItem(TUTORIAL_STATUS_KEY, "seen");
      } catch {
        // Closing the dialog must not depend on browser storage.
      }
    }
  });

  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
  const parameters = parametersByTemplate[templateId];
  const featureSettings = featuresByTemplate[templateId];
  const holes = holesByTemplate[templateId];
  const objects = objectsByTemplate[templateId];
  const options = useMemo<ModelOptions>(
    () => ({ ...featureSettings, holes, objects }),
    [featureSettings, holes, objects],
  );
  const visibleObjects = useMemo(
    () => objects.filter((object) => !object.hidden),
    [objects],
  );

  const baseValidation = useMemo(
    () => validateModel(templateId, parameters),
    [templateId, parameters],
  );
  const featureErrors = useMemo(() => {
    const errors: string[] = [];
    holes.forEach((hole, index) => {
      if (templateId === "free") return;
      const faceWidth =
        templateId === "box" && hole.face === "front"
          ? parameters.width - parameters.wall * 2
          : parameters.width;
      const faceHeight =
        hole.face === "front" ? parameters.height : parameters.depth;
      const holeHeight = hole.kind === "round" ? hole.width : hole.height;
      const outsideRectangle =
        hole.width <= 0 ||
        holeHeight <= 0 ||
        Math.abs(hole.x) + hole.width / 2 >= faceWidth / 2 ||
        Math.abs(hole.z) + holeHeight / 2 >= faceHeight / 2;
      if (outsideRectangle) {
        errors.push(`El recorte ${index + 1} queda fuera de la cara seleccionada.`);
      }
    });
    if (
      templateId === "free" &&
      visibleObjects.some((object) => object.operation === "hole") &&
      !visibleObjects.some((object) => object.operation !== "hole")
    ) {
      errors.push("Agregá al menos un sólido antes de usar figuras de recorte.");
    }
    errors.push(...validateObjects(visibleObjects));
    if (featureSettings.standoffHole >= featureSettings.standoffDiameter) {
      errors.push("El agujero del soporte debe ser menor que su diámetro exterior.");
    }
    const positiveFeatureValues = [
      featureSettings.lidThickness,
      featureSettings.standoffDiameter,
      featureSettings.standoffHeight,
      featureSettings.standoffHole,
    ];
    if (
      !Number.isFinite(featureSettings.cornerRadius) ||
      featureSettings.cornerRadius < 0 ||
      !Number.isFinite(featureSettings.standoffCount) ||
      featureSettings.standoffCount < 0 ||
      positiveFeatureValues.some(
        (value) => !Number.isFinite(value) || value <= 0,
      ) ||
      !["none", "snap", "screw", "slide"].includes(
        featureSettings.lidStyle,
      )
    ) {
      errors.push("La configuración avanzada contiene valores inválidos.");
    }
    return errors;
  }, [holes, visibleObjects, parameters, templateId, featureSettings]);
  const validation = {
    errors: [...baseValidation.errors, ...featureErrors],
    warnings: baseValidation.warnings,
  };
  const isValid = validation.errors.length === 0;
  const hasPrintableGeometry =
    templateId !== "free" ||
    visibleObjects.some((object) => object.operation !== "hole");
  const canExport = isValid && hasPrintableGeometry;
  const volumeCm3 = useMemo(
    () => (isValid ? estimatedVolumeCm3(templateId, parameters, options) : 0),
    [isValid, templateId, parameters, options],
  );
  const primarySpec = modelPrimarySpec(templateId, parameters);
  const exportName = safeFileName(projectName, `forja-${templateId}`);
  const activeMaterial = PRINT_MATERIALS[materialProfile];
  const estimatedWeight = volumeCm3 * activeMaterial.density;
  const effectiveMaterial = estimatedWeight * (0.28 + infill / 100);
  const estimatedCost = (effectiveMaterial / 1000) * materialPrice;
  const estimatedMinutes = Math.max(12, volumeCm3 * (1.6 + infill / 45));
  const minimumWall =
    parameters.wall ?? parameters.thickness ?? parameters.bottom ?? 0;
  const printProfile = getPrintProfile({
    material: materialProfile,
    nozzleSize,
    minimumWall,
  });
  const visibleLibraryProjects = useMemo(() => {
    const normalizedQuery = libraryQuery.trim().toLocaleLowerCase("es-AR");
    const filtered = normalizedQuery
      ? savedProjects.filter((project) =>
          project.projectName.toLocaleLowerCase("es-AR").includes(normalizedQuery),
        )
      : savedProjects;
    return [...filtered].sort((a, b) =>
      librarySort === "name"
        ? a.projectName.localeCompare(b.projectName, "es-AR", { sensitivity: "base" })
        : Date.parse(b.savedAt) - Date.parse(a.savedAt),
    );
  }, [libraryQuery, librarySort, savedProjects]);
  const visibleStarterDesigns = useMemo(() => {
    const query = designQuery.trim().toLocaleLowerCase("es-AR");
    return STARTER_DESIGNS.filter((design) =>
      (designCategory === "all" || design.category === designCategory) &&
      (!query || `${design.name} ${design.description}`.toLocaleLowerCase("es-AR").includes(query)),
    );
  }, [designCategory, designQuery]);
  const selectedStarterDesign =
    STARTER_DESIGNS.find((design) => design.id === selectedDesignId) ??
    STARTER_DESIGNS[0];
  const selectedHole = holes.find((hole) => hole.id === selectedHoleId) ?? null;
  const selectedObject =
    objects.find((object) => object.id === selectedObjectId) ?? null;
  const faceWidth =
    templateId === "box" && cutoutFace === "front"
      ? Math.max(1, parameters.width - parameters.wall * 2)
      : parameters.width;
  const faceHeight =
    cutoutFace === "front" ? parameters.height : parameters.depth;
  const visibleHoles = holes.filter((hole) => hole.face === cutoutFace);
  const selectedFaceHole =
    selectedHole?.face === cutoutFace ? selectedHole : null;
  const replaceObjects = (next: CustomObject[], recordHistory = true) => {
    if (templateId === "free" && recordHistory) {
      objectHistoryRef.current.past.push(cloneObjects(objects));
      objectHistoryRef.current.past =
        objectHistoryRef.current.past.slice(-40);
      objectHistoryRef.current.future = [];
      setHistoryAvailability({ canUndo: true, canRedo: false });
    }
    setObjectsByTemplate((current) => ({
      ...current,
      [templateId]: next,
    }));
    setSavedMessage("");
  };

  const undoObjects = () => {
    if (templateId !== "free") return;
    const previous = objectHistoryRef.current.past.pop();
    if (!previous) return;
    objectHistoryRef.current.future.unshift(cloneObjects(objects));
    replaceObjects(cloneObjects(previous), false);
    const selection = normalizeObjectSelection(previous, selectedObjectIds);
    setSelectedObjectIds(selection.selectedIds);
    setSelectedObjectId(selection.selectedId);
    setHistoryAvailability({
      canUndo: objectHistoryRef.current.past.length > 0,
      canRedo: objectHistoryRef.current.future.length > 0,
    });
  };

  const redoObjects = () => {
    if (templateId !== "free") return;
    const next = objectHistoryRef.current.future.shift();
    if (!next) return;
    objectHistoryRef.current.past.push(cloneObjects(objects));
    replaceObjects(cloneObjects(next), false);
    const selection = normalizeObjectSelection(next, selectedObjectIds);
    setSelectedObjectIds(selection.selectedIds);
    setSelectedObjectId(selection.selectedId);
    setHistoryAvailability({
      canUndo: objectHistoryRef.current.past.length > 0,
      canRedo: objectHistoryRef.current.future.length > 0,
    });
  };

  const updateParameter = (key: string, value: string) => {
    setSavedMessage("");
    setParametersByTemplate((current) => ({
      ...current,
      [templateId]: { ...current[templateId], [key]: Number(value) },
    }));
  };

  const applyTemplatePreset = (preset: TemplatePreset) => {
    if (templateId === "free") return;
    const nextParameters = { ...preset.parameters };
    setParametersByTemplate((current) => ({
      ...current,
      [templateId]: nextParameters,
    }));
    if (preset.features) {
      setFeaturesByTemplate((current) => ({
        ...current,
        [templateId]: {
          ...current[templateId],
          ...preset.features,
        },
      }));
    }
    setHolesByTemplate((current) => ({
      ...current,
      [templateId]: current[templateId].map((hole) => {
        const faceWidth =
          templateId === "box" && hole.face === "front"
            ? Math.max(1, nextParameters.width - nextParameters.wall * 2)
            : nextParameters.width;
        const faceHeight =
          hole.face === "front" ? nextParameters.height : nextParameters.depth;
        const renderedHeight = hole.kind === "round" ? hole.width : hole.height;
        return {
          ...hole,
          x: Number(
            clampValue(
              hole.x,
              -faceWidth / 2 + hole.width / 2 + 1,
              faceWidth / 2 - hole.width / 2 - 1,
            ).toFixed(1),
          ),
          z: Number(
            clampValue(
              hole.z,
              -faceHeight / 2 + renderedHeight / 2 + 1,
              faceHeight / 2 - renderedHeight / 2 - 1,
            ).toFixed(1),
          ),
        };
      }),
    }));
    setSavedMessage(`${preset.name} aplicada. Podés ajustar cualquier medida.`);
  };

  const editTemplateInFreeMode = () => {
    if (templateId === "free") return;
    const sourceTemplate = templateId as ParametricTemplateId;
    const editableObjects = createEditableTemplateDesign(
      sourceTemplate,
      parameters,
      {
        ...featureSettings,
        holes,
        objects,
      },
      createId,
    );
    const firstObject = editableObjects[0] ?? null;
    setObjectsByTemplate((current) => ({
      ...current,
      free: editableObjects,
    }));
    setParametersByTemplate((current) => ({
      ...current,
      free: {
        width: Math.min(235, Math.max(current.free.width, parameters.width + 20)),
        depth: Math.min(
          235,
          Math.max(
            current.free.depth,
            sourceTemplate === "box" && featureSettings.lidStyle !== "none"
              ? parameters.depth * 2 + 24
              : parameters.depth + 20,
          ),
        ),
      },
    }));
    setTemplateId("free");
    setSelectedHoleId(null);
    setSelectedObjectId(firstObject?.id ?? null);
    setSelectedObjectIds(firstObject ? [firstObject.id] : []);
    setFreeEditorView("objects");
    setFreeAddOperation("solid");
    setCameraView("iso");
    objectHistoryRef.current = { past: [], future: [] };
    setHistoryAvailability({ canUndo: false, canRedo: false });
    setSavedMessage("Plantilla convertida: ahora cada parte se puede editar.");
  };

  const updateFeature = (
    key: keyof FeatureSettings,
    value: FeatureSettings[keyof FeatureSettings],
  ) => {
    setSavedMessage("");
    setFeaturesByTemplate((current) => ({
      ...current,
      [templateId]: { ...current[templateId], [key]: value },
    }));
  };

  const chooseTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setSelectedHoleId(holesByTemplate[id][0]?.id ?? null);
    setSelectedObjectId(objectsByTemplate[id][0]?.id ?? null);
    setSelectedObjectIds(
      objectsByTemplate[id][0] ? [objectsByTemplate[id][0].id] : [],
    );
    setFreeEditorView(objectsByTemplate[id].length > 0 ? "objects" : "create");
    setCutoutFace("base");
    setCutoutTool(null);
    setCameraView("iso");
    setSavedMessage("");
  };

  const faceDimensions = (face: Cutout["face"]) => ({
    width:
      templateId === "box" && face === "front"
        ? Math.max(1, parameters.width - parameters.wall * 2)
        : parameters.width,
    height:
      face === "front" ? parameters.height : parameters.depth,
  });

  const constrainHolePoint = (
    hole: Pick<Cutout, "face" | "kind" | "width" | "height">,
    x: number,
    z: number,
  ) => {
    const dimensions = faceDimensions(hole.face);
    const renderedHeight = hole.kind === "round" ? hole.width : hole.height;
    const nextX = clampValue(
      x,
      -dimensions.width / 2 + hole.width / 2 + 1,
      dimensions.width / 2 - hole.width / 2 - 1,
    );
    const nextZ = clampValue(
      z,
      -dimensions.height / 2 + renderedHeight / 2 + 1,
      dimensions.height / 2 - renderedHeight / 2 - 1,
    );
    return {
      x: Number(nextX.toFixed(1)),
      z: Number(nextZ.toFixed(1)),
    };
  };

  const addHoleAt = (
    kind: Cutout["kind"],
    face: Cutout["face"],
    x: number,
    z: number,
  ) => {
    const id = createId("hole");
    const size = kind === "round"
      ? { width: 5, height: 5 }
      : { width: 10, height: 6 };
    const point = constrainHolePoint({ kind, face, ...size }, x, z);
    const hole: Cutout = {
      id,
      kind,
      face,
      ...point,
      ...size,
    };
    setHolesByTemplate((current) => ({
      ...current,
      [templateId]: [...current[templateId], hole],
    }));
    setSelectedHoleId(id);
    setCutoutTool(null);
    setSavedMessage("");
  };

  const moveHole = (id: string, x: number, z: number) => {
    setHolesByTemplate((current) => ({
      ...current,
      [templateId]: current[templateId].map((hole) => {
        if (hole.id !== id) return hole;
        return { ...hole, ...constrainHolePoint(hole, x, z) };
      }),
    }));
    setSavedMessage("");
  };

  const chooseCutoutFace = (face: Cutout["face"]) => {
    setCutoutFace(face);
    setCutoutTool(null);
    setSelectedHoleId(holes.find((hole) => hole.face === face)?.id ?? null);
  };

  const updateHole = (key: keyof Cutout, value: string | number) => {
    if (!selectedHoleId) return;
    setHolesByTemplate((current) => ({
      ...current,
      [templateId]: current[templateId].map((hole) =>
        hole.id === selectedHoleId ? { ...hole, [key]: value } : hole,
      ),
    }));
    setSavedMessage("");
  };

  const deleteSelectedHole = () => {
    if (!selectedHoleId) return;
    const remaining = holes.filter((hole) => hole.id !== selectedHoleId);
    setHolesByTemplate((current) => ({
      ...current,
      [templateId]: remaining,
    }));
    setSelectedHoleId(
      remaining.find((hole) => hole.face === cutoutFace)?.id ?? null,
    );
  };

  const duplicateSelectedHole = () => {
    if (!selectedFaceHole) return;
    const id = createId("hole");
    const copy = { ...selectedFaceHole, id };
    const point = constrainHolePoint(copy, copy.x + 3, copy.z - 3);
    copy.x = point.x;
    copy.z = point.z;
    setHolesByTemplate((current) => ({
      ...current,
      [templateId]: [...current[templateId], copy],
    }));
    setSelectedHoleId(id);
  };

  const addObject = (
    kind: ObjectKind,
    operation: ObjectOperation = "solid",
    point: WorkplanePoint = { x: 0, z: 0 },
  ) => {
    if (templateId === "free") {
      const object = createFreePrimitive({
        kind,
        operation,
        index: objects.length,
        point,
        idFactory: createId,
      });
      replaceObjects([...objects, object]);
      setSelectedObjectId(object.id);
      setSelectedObjectIds([object.id]);
      setSavedMessage("");
      return;
    }

    const id = createId("object");
    const baseHeight =
      templateId === "box"
        ? parameters.bottom
        : parameters.thickness ?? 0;
    const names: Record<ObjectKind, string> = {
      cube: "Cubo",
      cylinder: "Cilindro",
      sphere: "Esfera",
      cone: "Cono",
      tube: "Tubo",
      wedge: "Cuña",
      text: "Texto",
    };
    const object: CustomObject = {
      id,
      kind,
      name: `${names[kind]} ${objects.length + 1}`,
      hidden: false,
      locked: false,
      x: point.x,
      y: baseHeight,
      z: point.z,
      width: kind === "text" ? 8 : 15,
      depth: kind === "text" ? 2 : 15,
      height: kind === "text" ? 1.4 : 10,
      rotation: 0,
      rotationX: 0,
      rotationZ: 0,
      operation,
      text: kind === "text" ? "FORJA" : undefined,
    };
    replaceObjects([...objects, object]);
    setSelectedObjectId(id);
    setSelectedObjectIds([id]);
    setSavedMessage("");
  };

  const addFreeObject = (
    kind: ObjectKind,
    point?: WorkplanePoint,
    operation = freeAddOperation,
  ) => {
    if (
      operation === "hole" &&
      !visibleObjects.some((object) => object.operation !== "hole")
    ) {
      return;
    }
    addObject(kind, operation, point);
  };

  const addFreePreset = (preset: FreePresetId) => {
    const additions = createFreePreset(
      preset,
      objects.length,
      { x: 0, z: 0 },
      createId,
    );
    replaceObjects([...objects, ...additions]);
    setSelectedObjectIds(additions.map((object) => object.id));
    setSelectedObjectId(additions.at(-1)?.id ?? null);
    setFreeEditorView("objects");
  };

  const addDesignFromGallery = (design: FreeDesignId) => {
    const freeObjects = objectsByTemplate.free;
    const additions = createStarterDesign(
      design,
      freeObjects.length,
      { x: 0, z: 0 },
      createId,
    );
    if (templateId === "free") {
      replaceObjects([...objects, ...additions]);
    } else {
      setObjectsByTemplate((current) => ({
        ...current,
        free: [...current.free, ...additions],
      }));
      setTemplateId("free");
      objectHistoryRef.current = { past: [], future: [] };
      setHistoryAvailability({ canUndo: false, canRedo: false });
    }
    setSelectedObjectIds(additions.map((object) => object.id));
    setSelectedObjectId(additions.at(-1)?.id ?? null);
    setFreeEditorView("objects");
    setShowDesignGallery(false);
    const designName = STARTER_DESIGNS.find((item) => item.id === design)?.name ?? "Diseño";
    setSavedMessage(`${designName} agregado al editor libre`);
  };

  const beginShapeDrag = (
    event: ReactDragEvent<HTMLButtonElement>,
    kind: ObjectKind,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "application/x-forja-shape",
      `${kind}|${freeAddOperation}`,
    );
    setIsDraggingShape(true);
  };

  const dropShapeOnCanvas = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    const [kind, operation] = event.dataTransfer
      .getData("application/x-forja-shape")
      .split("|");
    setIsDraggingShape(false);
    if (
      ![
        "cube",
        "cylinder",
        "sphere",
        "cone",
        "tube",
        "wedge",
        "text",
      ].includes(kind) ||
      !["solid", "hole"].includes(operation)
    ) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = {
      x: Number(
        (
          ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) *
          parameters.width
        ).toFixed(1),
      ),
      z: Number(
        (
          (0.5 - (event.clientY - bounds.top) / Math.max(bounds.height, 1)) *
          parameters.depth
        ).toFixed(1),
      ),
    };
    addFreeObject(
      kind as ObjectKind,
      point,
      operation as ObjectOperation,
    );
  };

  const selectFreeObject = (id: string | null, additive = false) => {
    if (!id) return;
    if (additive) {
      const nextSelection = selectedObjectIds.includes(id)
        ? selectedObjectIds.filter((selectedId) => selectedId !== id)
        : [...selectedObjectIds, id];
      setSelectedObjectIds(nextSelection);
      setSelectedObjectId(
        nextSelection.includes(id) ? id : nextSelection.at(-1) ?? null,
      );
      return;
    }
    setSelectedObjectIds([id]);
    setSelectedObjectId(id);
  };

  const updateObject = (
    key: keyof CustomObject,
    value: string | number | boolean,
  ) => {
    if (!selectedObjectId) return;
    replaceObjects(
      objects.map((object) => {
        if (object.id !== selectedObjectId) return object;
        if (object.locked && key !== "locked" && key !== "hidden") return object;
        return { ...object, [key]: value };
      }),
    );
  };

  const updateObjectById = (
    id: string,
    patch: Partial<CustomObject>,
  ) => {
    replaceObjects(
      patchObjectSelection(
        objects,
        id,
        patch,
        selectedObjectIds,
        templateId === "free" && freeTransformMode === "translate",
      ),
    );
  };

  const moveObject = (id: string, x: number, z: number) => {
    replaceObjects(
      objects.map((object) => {
        if (object.id !== id) return object;
        if (object.locked) return object;
        const footprint = objectFootprint(object);
        return {
          ...object,
          x: Number(
            clampValue(
              x,
              -parameters.width / 2 + footprint.width / 2,
              parameters.width / 2 - footprint.width / 2,
            ).toFixed(1),
          ),
          z: Number(
            clampValue(
              z,
              -parameters.depth / 2 + footprint.depth / 2,
              parameters.depth / 2 - footprint.depth / 2,
            ).toFixed(1),
          ),
        };
      }),
    );
  };

  const deleteSelectedObject = () => {
    if (!selectedObjectId) return;
    const idsToDelete =
      templateId === "free" && selectedObjectIds.length > 0
        ? new Set(selectedObjectIds)
        : new Set([selectedObjectId]);
    const remaining = objects.filter(
      (object) => !idsToDelete.has(object.id) || object.locked,
    );
    replaceObjects(remaining);
    setSelectedObjectId(remaining[0]?.id ?? null);
    setSelectedObjectIds(remaining[0] ? [remaining[0].id] : []);
    if (remaining.length === 0 && templateId === "free") {
      setFreeEditorView("create");
      setFreeAddOperation("solid");
    }
  };

  const duplicateSelectedObject = () => {
    if (!selectedObject) return;
    const sourceIds =
      templateId === "free" && selectedObjectIds.length > 0
        ? selectedObjectIds
        : [selectedObject.id];
    const duplicateId = createId("object");
    const copies = objects
      .filter((object) => sourceIds.includes(object.id))
      .map((object, index) => ({
        ...object,
        id: `${duplicateId}-${index}`,
        name: `${object.name} copia`,
        hidden: false,
        locked: false,
        x: object.x + 3,
        z: object.z - 3,
      }));
    replaceObjects([...objects, ...copies]);
    setSelectedObjectIds(copies.map((copy) => copy.id));
    setSelectedObjectId(copies.at(-1)?.id ?? null);
  };

  const alignSelectedObjects = (axis: "x" | "z" | "floor") => {
    if (selectedObjectIds.length < 2) return;
    replaceObjects(alignObjectSelection(objects, selectedObjectIds, axis));
  };

  const distributeSelectedObjects = (axis: "x" | "z") => {
    if (selectedObjectIds.length < 3) return;
    replaceObjects(
      distributeObjectSelection(objects, selectedObjectIds, axis),
    );
  };

  const toggleObjectState = (
    id: string,
    key: "hidden" | "locked",
  ) => {
    replaceObjects(
      objects.map((object) =>
        object.id === id ? { ...object, [key]: !object[key] } : object,
      ),
    );
  };

  const moveObjectInStack = (id: string, direction: "up" | "down") => {
    replaceObjects(reorderObject(objects, id, direction));
  };

  const keyboardActionsRef = useRef({
    templateId,
    undoObjects,
    redoObjects,
    duplicateSelectedObject,
    deleteSelectedObject,
  });
  useEffect(() => {
    keyboardActionsRef.current = {
      templateId,
      undoObjects,
      redoObjects,
      duplicateSelectedObject,
      deleteSelectedObject,
    };
  });

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const actions = keyboardActionsRef.current;
      if (actions.templateId !== "free") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select") ||
        target?.isContentEditable
      ) {
        return;
      }
      const commandKey = event.ctrlKey || event.metaKey;
      if (commandKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.redoObjects();
        else actions.undoObjects();
      } else if (commandKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        actions.redoObjects();
      } else if (commandKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        actions.duplicateSelectedObject();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        actions.deleteSelectedObject();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const createProjectSnapshot = (
    id = activeProjectId ?? createId("project"),
  ): StoredProject => ({
    id,
    projectName,
    templateId,
    parametersByTemplate,
    featuresByTemplate,
    holesByTemplate,
    objectsByTemplate,
    materialPrice,
    infill,
    materialProfile,
    nozzleSize,
    savedAt: new Date().toISOString(),
  });

  const applyProject = (project: StoredProject, message: string) => {
    const restoredParameters = Object.fromEntries(
      TEMPLATES.map((item) => [
        item.id,
        restoreMeasurements(
          recordValue(project.parametersByTemplate, item.id),
          item.defaults,
        ),
      ]),
    ) as Record<TemplateId, ModelParameters>;
    const restoredFeatures = Object.fromEntries(
      TEMPLATES.map((item) => [
        item.id,
        restoreKnownSettings(
          recordValue(project.featuresByTemplate, item.id),
          INITIAL_FEATURES[item.id],
        ),
      ]),
    ) as Record<TemplateId, FeatureSettings>;
    const restoredHoles = Object.fromEntries(
      TEMPLATES.map((item) => [
        item.id,
        restoreCutouts(
          recordValue(project.holesByTemplate, item.id),
          INITIAL_HOLES[item.id],
        ),
      ]),
    ) as Record<TemplateId, Cutout[]>;
    const restoredObjects = Object.fromEntries(
      TEMPLATES.map((item) => [
        item.id,
        restoreObjects(
          recordValue(project.objectsByTemplate, item.id),
          INITIAL_OBJECTS[item.id],
        ),
      ]),
    ) as Record<TemplateId, CustomObject[]>;
    const restoredTemplate = isTemplateId(project.templateId)
      ? project.templateId
      : "box";
    const restoredObjectId = restoredObjects[restoredTemplate][0]?.id ?? null;

    setParametersByTemplate(restoredParameters);
    setFeaturesByTemplate(restoredFeatures);
    setHolesByTemplate(restoredHoles);
    setObjectsByTemplate(restoredObjects);
    setTemplateId(restoredTemplate);
    setActiveProjectId(typeof project.id === "string" ? project.id : null);
    setProjectName(
      typeof project.projectName === "string"
        ? project.projectName
        : "mi-pieza-forja",
    );
    setMaterialPrice(
      typeof project.materialPrice === "number" &&
        Number.isFinite(project.materialPrice) &&
        project.materialPrice > 0
        ? project.materialPrice
        : 25000,
    );
    setInfill(
      typeof project.infill === "number" && Number.isFinite(project.infill)
        ? Math.min(100, Math.max(0, project.infill))
        : 20,
    );
    setMaterialProfile(
      project.materialProfile && project.materialProfile in PRINT_MATERIALS
        ? project.materialProfile
        : "pla",
    );
    setNozzleSize(
      typeof project.nozzleSize === "number" &&
        Number.isFinite(project.nozzleSize) &&
        project.nozzleSize >= 0.2 &&
        project.nozzleSize <= 1.2
        ? project.nozzleSize
        : 0.4,
    );
    setSelectedHoleId(restoredHoles[restoredTemplate][0]?.id ?? null);
    setSelectedObjectId(restoredObjectId);
    setSelectedObjectIds(restoredObjectId ? [restoredObjectId] : []);
    objectHistoryRef.current = { past: [], future: [] };
    setHistoryAvailability({ canUndo: false, canRedo: false });
    setFreeEditorView(restoredObjects[restoredTemplate].length ? "objects" : "create");
    setSavedMessage(message);
  };

  const saveProject = () => {
    try {
      const project = createProjectSnapshot();
      const nextProjects = [
        project,
        ...savedProjects.filter((item) => item.id !== project.id),
      ].slice(0, 30);
      localStorage.setItem(
        "forja:last-project",
        JSON.stringify(project),
      );
      localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(nextProjects));
      setSavedProjects(nextProjects);
      setActiveProjectId(project.id);
      setSavedMessage("Diseño guardado en Mis proyectos");
    } catch {
      setSavedMessage("No pudimos guardar el proyecto en este dispositivo");
    }
  };

  const openSavedProject = (project: StoredProject) => {
    try {
      localStorage.setItem("forja:last-project", JSON.stringify(project));
      applyProject(project, "Proyecto abierto");
      setShowLibrary(false);
      setShowStart(false);
    } catch {
      setSavedMessage("No pudimos abrir ese diseño");
    }
  };

  const duplicateSavedProject = (project: StoredProject) => {
    const duplicate: StoredProject = {
      ...project,
      id: createId("project"),
      projectName: `${project.projectName} copia`,
      savedAt: new Date().toISOString(),
    };
    try {
      const nextProjects = [duplicate, ...savedProjects].slice(0, 30);
      localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(nextProjects));
      setSavedProjects(nextProjects);
      setSavedMessage("Copia creada en Mis proyectos");
    } catch {
      setSavedMessage("No pudimos duplicar ese diseño");
    }
  };

  const renameSavedProject = (project: StoredProject) => {
    const nextName = window.prompt("Nuevo nombre del proyecto", project.projectName)?.trim();
    if (!nextName || nextName === project.projectName) return;
    try {
      const nextProjects = savedProjects.map((item) =>
        item.id === project.id
          ? { ...item, projectName: nextName.slice(0, 60), savedAt: new Date().toISOString() }
          : item,
      );
      localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(nextProjects));
      setSavedProjects(nextProjects);
      if (activeProjectId === project.id) setProjectName(nextName.slice(0, 60));
      setSavedMessage("Proyecto renombrado");
    } catch {
      setSavedMessage("No pudimos renombrar ese proyecto");
    }
  };

  const deleteSavedProject = (project: StoredProject) => {
    if (!window.confirm(`¿Eliminar “${project.projectName}” de este dispositivo?`)) return;
    try {
      const nextProjects = savedProjects.filter((item) => item.id !== project.id);
      localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(nextProjects));
      setSavedProjects(nextProjects);
      if (activeProjectId === project.id) setActiveProjectId(null);
      setSavedMessage("Proyecto eliminado");
    } catch {
      setSavedMessage("No pudimos eliminar ese proyecto");
    }
  };

  const exportForjaProject = (project = createProjectSnapshot()) => {
    const portable: PortableProject = {
      format: "forja-project",
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
    };
    downloadBlob(
      new Blob([JSON.stringify(portable, null, 2)], { type: "application/json" }),
      `${safeFileName(project.projectName, "proyecto-forja")}.forja`,
    );
    setSavedMessage("Proyecto .forja descargado");
  };

  const importForjaProject = async (file: File) => {
    try {
      if (file.size > 5_000_000) throw new Error("project too large");
      const parsed = JSON.parse(await file.text()) as Partial<PortableProject>;
      if (
        parsed.format !== "forja-project" ||
        parsed.version !== 1 ||
        !parsed.project ||
        typeof parsed.project.projectName !== "string"
      ) {
        throw new Error("invalid project");
      }
      const imported: StoredProject = {
        ...parsed.project,
        id: createId("project"),
        savedAt: new Date().toISOString(),
      };
      applyProject(imported, "Proyecto .forja importado");
      const nextProjects = [imported, ...savedProjects].slice(0, 30);
      localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(nextProjects));
      localStorage.setItem("forja:last-project", JSON.stringify(imported));
      setSavedProjects(nextProjects);
      setShowLibrary(false);
      setShowStart(false);
    } catch {
      setSavedMessage("Ese archivo no es un proyecto .forja válido");
    } finally {
      if (projectFileInputRef.current) projectFileInputRef.current.value = "";
    }
  };

  const recoverDraft = () => {
    if (!recoveryDraft) return;
    applyProject(recoveryDraft, "Borrador recuperado");
    setShowStart(false);
  };

  const copyFeedbackReport = async () => {
    const report = [
      "FORJA V1 · Reporte",
      `Proyecto: ${projectName}`,
      `Modo: ${template.shortName}`,
      `Navegador: ${navigator.userAgent}`,
      "",
      feedbackText.trim(),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      setSavedMessage("Reporte copiado · ya podés pegarlo donde quieras enviarlo");
      setShowFeedback(false);
      setFeedbackText("");
    } catch {
      setSavedMessage("No pudimos copiar el reporte automáticamente");
    }
  };

  useEffect(() => {
    if (!storageReady || showStart) return;
    const draft: StoredProject = {
      id: activeProjectId ?? "draft-current",
      projectName,
      templateId,
      parametersByTemplate,
      featuresByTemplate,
      holesByTemplate,
      objectsByTemplate,
      materialPrice,
      infill,
      materialProfile,
      nozzleSize,
      savedAt: new Date().toISOString(),
    };
    pendingDraftRef.current = draft;
    const savingTimer = window.setTimeout(() => setAutoSaveState("saving"), 0);
    const saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify(draft));
        if (activeProjectId) {
          localStorage.setItem("forja:last-project", JSON.stringify(draft));
          setSavedProjects((current) => {
            const nextProjects = current.map((project) =>
              project.id === activeProjectId ? draft : project,
            );
            localStorage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify(nextProjects));
            return nextProjects;
          });
        }
        setRecoveryDraft(draft);
        setAutoSaveState("saved");
      } catch {
        setAutoSaveState("waiting");
      }
    }, 700);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(saveTimer);
    };
  }, [
    activeProjectId,
    featuresByTemplate,
    holesByTemplate,
    infill,
    materialProfile,
    materialPrice,
    nozzleSize,
    objectsByTemplate,
    parametersByTemplate,
    projectName,
    showStart,
    storageReady,
    templateId,
  ]);

  useEffect(() => {
    const flushDraft = () => {
      const draft = pendingDraftRef.current;
      if (!draft) return;
      try {
        localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Closing the tab must never be blocked by unavailable storage.
      }
    };
    window.addEventListener("pagehide", flushDraft);
    return () => window.removeEventListener("pagehide", flushDraft);
  }, []);

  const resetCurrentTemplate = () => {
    if (templateId === "free") {
      replaceObjects([]);
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      setFreeEditorView("create");
      setFreeAddOperation("solid");
      setSavedMessage("");
      return;
    }
    setParametersByTemplate((current) => ({
      ...current,
      [templateId]: { ...template.defaults },
    }));
    setFeaturesByTemplate((current) => ({
      ...current,
      [templateId]: { ...INITIAL_FEATURES[templateId] },
    }));
    setHolesByTemplate((current) => ({
      ...current,
      [templateId]: INITIAL_HOLES[templateId].map((hole) => ({ ...hole })),
    }));
    replaceObjects([]);
    setSelectedHoleId(INITIAL_HOLES[templateId][0]?.id ?? null);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setFreeEditorView("create");
    setFreeAddOperation("solid");
    setCutoutFace("base");
    setCutoutTool(null);
    setSavedMessage("");
  };

  const startNewProject = (id: TemplateId) => {
    setParametersByTemplate(
      Object.fromEntries(
        TEMPLATES.map((item) => [item.id, { ...item.defaults }]),
      ) as Record<TemplateId, ModelParameters>,
    );
    setFeaturesByTemplate(
      Object.fromEntries(
        TEMPLATES.map((item) => [item.id, { ...INITIAL_FEATURES[item.id] }]),
      ) as Record<TemplateId, FeatureSettings>,
    );
    setHolesByTemplate(cloneHoleMap(INITIAL_HOLES));
    setObjectsByTemplate(cloneObjectMap(INITIAL_OBJECTS));
    setTemplateId(id);
    setProjectName("mi-pieza-forja");
    setActiveProjectId(null);
    setSelectedHoleId(INITIAL_HOLES[id][0]?.id ?? null);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setFreeEditorView("create");
    setFreeAddOperation("solid");
    setCutoutFace("base");
    setCutoutTool(null);
    setCameraView("iso");
    setShowReview(false);
    setSavedMessage("Nuevo proyecto listo");
    objectHistoryRef.current = { past: [], future: [] };
    setHistoryAvailability({ canUndo: false, canRedo: false });
    pendingDraftRef.current = null;
    setShowStart(false);
  };

  const openTutorial = () => {
    setTutorialStep(0);
    setShowTutorial(true);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    try {
      localStorage.setItem(
        TUTORIAL_STATUS_KEY,
        tutorialCompleted ? "completed" : "seen",
      );
    } catch {
      // The dialog can close even when browser storage is disabled.
    }
  };

  const completeTutorial = () => {
    setTutorialCompleted(true);
    setShowTutorial(false);
    setTutorialStep(0);
    startNewProject("box");
    setSavedMessage("Tutorial completado · empezá ajustando las medidas");
    try {
      localStorage.setItem(TUTORIAL_STATUS_KEY, "completed");
    } catch {
      // Completion still works for the current session.
    }
  };

  const exportModel = async (format: ExportFormat) => {
    if (!canExport || exporting) return;
    setExporting(format);
    setSavedMessage("");
    let geometries: ThreeTypes.BufferGeometry[] = [];

    try {
      const { createModelGeometries } = await import(
        "../lib/model-geometry"
      );

      geometries = await createModelGeometries(
        templateId,
        parameters,
        options,
        true,
        true,
      );

      if (format === "stl") {
        const { createStlFile } = await import(
          "../lib/create-stl-file"
        );

        const file = await createStlFile(
          geometries,
          exportName,
        );

        downloadBlob(file, file.name);
      } else {
        const { create3mfBlob, createStepBlob } = await import(
          "../lib/model-exporters"
        );

        const blob =
          format === "3mf"
            ? await create3mfBlob(geometries, exportName)
            : createStepBlob(geometries, exportName);

        downloadBlob(blob, `${exportName}.${format}`);
      }

      setSavedMessage(
        `${format.toUpperCase()} generado correctamente`,
      );
    } catch (error) {
      setSavedMessage(
        error instanceof Error
          ? error.message
          : `No pudimos generar el archivo ${format.toUpperCase()}`,
      );
    } finally {
      geometries.forEach((geometry) => geometry.dispose());
      setExporting(null);
    }
  };

  const sliceCurrentModel = async (settings: {
    layerHeightMm: 0.12 | 0.2 | 0.28;
    infillPercent: number;
    supports: boolean;
    material: "pla" | "pla-plus" | "petg";
  }) => {
    if (!canExport || slicing) return;

    setSlicing(true);
    setSliceResult(null);
    setSavedMessage("");

    let geometries: ThreeTypes.BufferGeometry[] = [];

    try {
      const [
        { createModelGeometries },
        { createStlFile },
        { sliceModel, downloadGcode },
      ] = await Promise.all([
        import("../lib/model-geometry"),
        import("../lib/create-stl-file"),
        import("../lib/slicer/client"),
      ]);

      geometries = await createModelGeometries(
        templateId,
        parameters,
        options,
        true,
        true,
      );

      const file = await createStlFile(
        geometries,
        exportName,
      );

      const result = await sliceModel({
        file,
        printerProfileId: "biqu-b1-0.4",
        layerHeightMm: settings.layerHeightMm,
        infillPercent: settings.infillPercent,
        supports: settings.supports,
        material: settings.material,
      });

      setSliceResult(result);
      downloadGcode(result);

      setSavedMessage(
        result.requestId
          ? `G-code generado correctamente · ${result.requestId}`
          : "G-code generado correctamente",
      );
    } catch (error) {
      setSavedMessage(
        error instanceof Error
          ? error.message
          : "No pudimos generar el G-code",
      );
    } finally {
      geometries.forEach((geometry) => {
        geometry.dispose();
      });

      setSlicing(false);
    }
  };

  const currentTutorialStep = TUTORIAL_STEPS[tutorialStep];
  const tutorialProgress = ((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="app-shell">
      {!showStart && (
      <header
        className="topbar"
        aria-hidden={modalOpen || undefined}
        inert={modalOpen ? true : undefined}
      >
        <a
          className="brand"
          href="#"
          aria-label="FORJA, inicio"
          onClick={(event) => {
            event.preventDefault();
            setShowStart(true);
          }}
        >
          <span className="brand-logo" aria-hidden="true" />
          <small className="brand-tagline">Diseñá · validá · fabricá</small>
        </a>
        <nav className="top-actions" aria-label="Acciones del proyecto">
          <span className="version-pill"><i /> V1</span>
          <span className={`autosave-status ${autoSaveState}`} aria-live="polite">
            {autoSaveState === "saving" ? "Guardando…" : autoSaveState === "saved" ? "Guardado automático" : "Autoguardado"}
          </span>
          <button
            className="button ghost save-trigger"
            onClick={saveProject}
          >
            Guardar
          </button>

          <details className="project-actions-menu">
            <summary
              aria-label="Más acciones del proyecto"
              title="Más acciones"
            >
              <span className="project-actions-label">
                Más
              </span>

              <span
                className="project-actions-chevron"
                aria-hidden="true"
              >
                ⌄
              </span>
            </summary>

            <div className="project-actions-popover">
              <button
                type="button"
                onClick={(event) => {
                  openTutorial();
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                <i aria-hidden="true">
                  {tutorialCompleted ? "✓" : "?"}
                </i>

                <span>
                  <strong>Aprender</strong>
                  <small>Volver a ver el tutorial</small>
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  setShowLibrary(true);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                <i aria-hidden="true">▣</i>

                <span>
                  <strong>Mis proyectos</strong>
                  <small>
                    {savedProjects.length > 0
                      ? `${savedProjects.length} guardados`
                      : "Abrir biblioteca personal"}
                  </small>
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  setShowDesignGallery(true);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                <i aria-hidden="true">◆</i>

                <span>
                  <strong>Diseños</strong>
                  <small>Explorar modelos de la biblioteca</small>
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  setShowFeedback(true);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                <i aria-hidden="true">!</i>

                <span>
                  <strong>Reportar</strong>
                  <small>Contarnos un problema o sugerencia</small>
                </span>
              </button>
            </div>
          </details>
          {canExport && (
            <button
              className={`button review-trigger ${showReview ? "active" : ""}`}
              onClick={() => setShowReview((current) => !current)}
              aria-expanded={showReview}
              aria-controls="manufacturing-review"
            >
              <span className={isValid ? "ready" : "error"}>
                {isValid ? "✓" : "!"}
              </span>
              Comprobar
            </button>
          )}
          <button
            className="button primary compact"
            onClick={() => void exportModel("stl")}
            disabled={!canExport || Boolean(exporting)}
          >
            {exporting === "stl" ? "Generando…" : "Descargar STL"}
          </button>
        </nav>
      </header>
      )}

      <input
        ref={projectFileInputRef}
        className="visually-hidden"
        type="file"
        accept=".forja,application/json"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importForjaProject(file);
        }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {showDesignGallery && (
        <div
          className="design-gallery-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setShowDesignGallery(false);
          }}
        >
          <section
            className="design-gallery"
            role="dialog"
            aria-modal="true"
            aria-labelledby="design-gallery-title"
            tabIndex={-1}
          >
            <header className="design-gallery-header">
              <div>
                <span className="eyebrow">Biblioteca de diseños</span>
                <h2 id="design-gallery-title">Elegí un punto de partida</h2>
                <p>Todos los diseños se agregan como figuras editables en el modo Libre.</p>
              </div>
              <button
                className="library-close"
                onClick={() => setShowDesignGallery(false)}
                aria-label="Cerrar galería de diseños"
              >
                ×
              </button>
            </header>

            <div className="design-source-tabs" role="tablist" aria-label="Origen de los diseños">
              <button role="tab" aria-selected="true" className="active">
                Diseños FORJA <small>{STARTER_DESIGNS.length}</small>
              </button>
              <button role="tab" aria-selected="false" disabled>
                Mi biblioteca <small>Próximamente</small>
              </button>
            </div>

            <div className="design-gallery-body">
              <aside className="design-catalog-panel" aria-label="Catálogo de diseños">
                <label className="design-search">
                  <span className="visually-hidden">Buscar diseños</span>
                  <i aria-hidden="true">⌕</i>
                  <input
                    type="search"
                    value={designQuery}
                    onChange={(event) => setDesignQuery(event.currentTarget.value)}
                    placeholder="Buscar diseños…"
                  />
                </label>
                <div className="design-category-list" aria-label="Categorías">
                  {DESIGN_CATEGORIES.map((category) => (
                    <button
                      className={designCategory === category.id ? "active" : ""}
                      onClick={() => setDesignCategory(category.id)}
                      aria-pressed={designCategory === category.id}
                      key={category.id}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                <p className="design-result-count" aria-live="polite">
                  {visibleStarterDesigns.length} {visibleStarterDesigns.length === 1 ? "diseño" : "diseños"}
                </p>
                {visibleStarterDesigns.length > 0 ? (
                  <div className="design-catalog-list">
                    {visibleStarterDesigns.map((design) => (
                      <button
                        className={selectedStarterDesign.id === design.id ? "active" : ""}
                        onClick={() => setSelectedDesignId(design.id)}
                        aria-pressed={selectedStarterDesign.id === design.id}
                        key={design.id}
                      >
                        <i aria-hidden="true">{design.icon}</i>
                        <span>
                          <strong>{design.name}</strong>
                          <small>{design.detail}</small>
                        </span>
                        <b aria-hidden="true">›</b>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="design-catalog-empty">
                    <span aria-hidden="true">⌕</span>
                    <strong>No encontramos diseños</strong>
                    <button onClick={() => {
                      setDesignQuery("");
                      setDesignCategory("all");
                    }}>Limpiar filtros</button>
                  </div>
                )}
              </aside>

              <article className="design-preview-panel">
                <div className="design-preview-art">
                  <div className="design-preview-stage-label">
                    <span><i aria-hidden="true" /> Vista 3D interactiva</span>
                    <small>Modelo editable</small>
                  </div>
                  <DesignGeometryPreview
                    designId={selectedStarterDesign.id}
                    name={selectedStarterDesign.name}
                  />
                  <div className="design-preview-scale" aria-hidden="true">
                    <span /> {selectedStarterDesign.size}
                  </div>
                </div>
                <div className="design-preview-copy">
                  <div className="design-preview-meta">
                    <span>{DESIGN_CATEGORIES.find((category) => category.id === selectedStarterDesign.category)?.label}</span>
                    <small>{selectedStarterDesign.size}</small>
                  </div>
                  <h3>{selectedStarterDesign.name}</h3>
                  <p>{selectedStarterDesign.description}</p>
                  <ul>
                    <li><span>✓</span> {selectedStarterDesign.detail}</li>
                    <li><span>✓</span> Medidas, posiciones y operaciones editables</li>
                    <li><span>✓</span> Compatible con STL, 3MF y STEP</li>
                  </ul>
                  <aside>
                    <strong>No es un modelo cerrado</strong>
                    <p>Es una base que podés desarmar, duplicar y adaptar pieza por pieza.</p>
                  </aside>
                </div>
                <footer>
                  <button className="button ghost" onClick={() => setShowDesignGallery(false)}>
                    Cancelar
                  </button>
                  <button
                    className="button primary"
                    onClick={() => addDesignFromGallery(selectedStarterDesign.id)}
                  >
                    Agregar al editor libre
                  </button>
                </footer>
              </article>
            </div>
          </section>
        </div>
      )}

      {showStart && (
        <div aria-hidden={modalOpen || undefined} inert={modalOpen ? true : undefined}>
          <LandingPage
            recoveryDraftName={recoveryDraft?.projectName}
            projectCount={savedProjects.length}
            onStart={startNewProject}
            onTutorial={openTutorial}
            onLibrary={() => setShowLibrary(true)}
            onImport={() => projectFileInputRef.current?.click()}
            onRecover={recoverDraft}
          />
        </div>
      )}

      {showFeedback && (
        <div className="feedback-backdrop" onPointerDown={(event) => {
          if (event.target === event.currentTarget) setShowFeedback(false);
        }}>
          <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title" tabIndex={-1}>
            <header>
              <div>
                <span className="eyebrow">Mejorar FORJA</span>
                <h2 id="feedback-title">Contanos qué pasó</h2>
                <p>El reporte incluye el modo actual y los datos del navegador, nunca tu geometría.</p>
              </div>
              <button className="library-close" onClick={() => setShowFeedback(false)} aria-label="Cerrar reporte">×</button>
            </header>
            <label>
              <span>Problema o sugerencia</span>
              <textarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.currentTarget.value)}
                placeholder="Ejemplo: al mover un recorte sobre la cara frontal…"
                rows={6}
              />
            </label>
            <footer>
              <button className="button ghost" onClick={() => setShowFeedback(false)}>Cancelar</button>
              <button className="button primary" onClick={() => void copyFeedbackReport()} disabled={!feedbackText.trim()}>
                Copiar reporte
              </button>
            </footer>
          </section>
        </div>
      )}

      {showTutorial && (
        <div
          className="tutorial-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeTutorial();
          }}
        >
          <section
            className="tutorial-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            tabIndex={-1}
          >
            <header className="tutorial-header">
              <div>
                <span className="eyebrow">Centro de aprendizaje</span>
                <h2 id="tutorial-title">Tu primer diseño en FORJA</h2>
                <p>Una guía corta para pasar de una idea a un archivo 3D exportable.</p>
              </div>
              <button
                className="library-close"
                onClick={closeTutorial}
                aria-label="Cerrar tutorial"
              >
                ×
              </button>
            </header>

            <div className="tutorial-progress" aria-label={`Paso ${tutorialStep + 1} de ${TUTORIAL_STEPS.length}`}>
              <span style={{ width: `${tutorialProgress}%` }} />
            </div>

            <div className="tutorial-body">
              <nav className="tutorial-step-list" aria-label="Pasos del tutorial">
                {TUTORIAL_STEPS.map((step, index) => (
                  <button
                    className={`${index === tutorialStep ? "active" : ""} ${
                      index < tutorialStep ? "visited" : ""
                    }`}
                    onClick={() => setTutorialStep(index)}
                    aria-current={index === tutorialStep ? "step" : undefined}
                    key={step.eyebrow}
                  >
                    <i>{index < tutorialStep ? "✓" : index + 1}</i>
                    <span>
                      <strong>{step.title}</strong>
                      <small>{step.time}</small>
                    </span>
                  </button>
                ))}
              </nav>

              <article className="tutorial-lesson">
                <div className={`tutorial-demo step-${tutorialStep + 1}`} aria-hidden="true">
                  <span className="demo-grid" />
                  <i className="demo-solid" />
                  <i className="demo-cutout" />
                  <b>{tutorialStep + 1}</b>
                  <em>{tutorialStep === 3 ? "X · Y · Z" : "FORJA"}</em>
                </div>
                <div className="tutorial-copy">
                  <div className="tutorial-lesson-meta">
                    <span>{currentTutorialStep.eyebrow}</span>
                    <small>{currentTutorialStep.time}</small>
                  </div>
                  <h3>{currentTutorialStep.title}</h3>
                  <p>{currentTutorialStep.description}</p>
                  <ul>
                    {currentTutorialStep.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <aside className="tutorial-tip">
                    <span>Consejo FORJA</span>
                    <p>{currentTutorialStep.tip}</p>
                  </aside>
                </div>
              </article>
            </div>

            <footer className="tutorial-footer">
              <button className="tutorial-skip" onClick={closeTutorial}>
                Ver después
              </button>
              <span>{tutorialStep + 1} de {TUTORIAL_STEPS.length}</span>
              <div>
                <button
                  className="tutorial-back"
                  onClick={() => setTutorialStep((current) => Math.max(0, current - 1))}
                  disabled={tutorialStep === 0}
                >
                  Anterior
                </button>
                {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                  <button
                    className="tutorial-next"
                    onClick={() => setTutorialStep((current) => current + 1)}
                  >
                    Siguiente
                  </button>
                ) : (
                  <button className="tutorial-next complete" onClick={completeTutorial}>
                    Crear mi primera pieza
                  </button>
                )}
              </div>
            </footer>
          </section>
        </div>
      )}

      {showLibrary && (
        <div
          className="library-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setShowLibrary(false);
          }}
        >
          <section
            className="project-library"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-library-title"
            tabIndex={-1}
          >
            <header>
              <div>
                <span className="eyebrow">Biblioteca local</span>
                <h2 id="project-library-title">Mis proyectos</h2>
                <p>Diseños guardados únicamente en este dispositivo.</p>
              </div>
              <button
                className="library-close"
                onClick={() => setShowLibrary(false)}
                aria-label="Cerrar Mis proyectos"
              >
                ×
              </button>
            </header>

            <div className="library-toolbar">
              <label className="library-search">
                <span className="visually-hidden">Buscar proyectos por nombre</span>
                <i aria-hidden="true">⌕</i>
                <input
                  type="search"
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.currentTarget.value)}
                  placeholder="Buscar por nombre…"
                />
              </label>
              <label className="library-sort">
                <span>Ordenar</span>
                <select
                  value={librarySort}
                  onChange={(event) =>
                    setLibrarySort(event.currentTarget.value as "recent" | "name")
                  }
                >
                  <option value="recent">Más recientes</option>
                  <option value="name">Nombre A–Z</option>
                </select>
              </label>
              <div className="library-file-actions">
                <button onClick={() => projectFileInputRef.current?.click()}>
                  <span aria-hidden="true">↓</span> Importar
                </button>
                <button onClick={() => exportForjaProject()}>
                  <span aria-hidden="true">↑</span> Exportar actual
                </button>
              </div>
            </div>

            {savedProjects.length > 0 ? (
              <>
                <p className="library-results" aria-live="polite">
                  {visibleLibraryProjects.length === savedProjects.length
                    ? `${savedProjects.length} ${savedProjects.length === 1 ? "proyecto" : "proyectos"}`
                    : `${visibleLibraryProjects.length} de ${savedProjects.length} proyectos`}
                </p>
                {visibleLibraryProjects.length > 0 ? (
              <div className="library-list" aria-label="Proyectos guardados">
                {visibleLibraryProjects.map((project) => {
                  const projectTemplate =
                    TEMPLATES.find((item) => item.id === project.templateId) ??
                    TEMPLATES[0];
                  return (
                    <article
                      className={project.id === activeProjectId ? "active" : ""}
                      key={project.id}
                    >
                      <span className="library-project-icon">
                        {projectTemplate.icon}
                      </span>
                      <div>
                        <strong>{project.projectName}</strong>
                        <small>
                          {projectTemplate.shortName} · {new Date(
                            project.savedAt,
                          ).toLocaleString("es-AR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </small>
                      </div>
                      <div className="library-actions">
                        <button
                          className="open-project"
                          onClick={() => openSavedProject(project)}
                          aria-label={`Abrir ${project.projectName}`}
                        >
                          Abrir
                        </button>
                        <button onClick={() => renameSavedProject(project)} aria-label={`Renombrar ${project.projectName}`}>
                          Renombrar
                        </button>
                        <button onClick={() => duplicateSavedProject(project)} aria-label={`Duplicar ${project.projectName}`}>
                          Duplicar
                        </button>
                        <button onClick={() => exportForjaProject(project)} aria-label={`Exportar ${project.projectName}`}>
                          Exportar
                        </button>
                        <button className="delete-project" onClick={() => deleteSavedProject(project)} aria-label={`Eliminar ${project.projectName}`}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
                ) : (
                  <div className="library-empty library-no-results">
                    <span aria-hidden="true">⌕</span>
                    <strong>No encontramos ese proyecto</strong>
                    <p>Probá con otro nombre o limpiá la búsqueda.</p>
                    <button onClick={() => setLibraryQuery("")}>Limpiar búsqueda</button>
                  </div>
                )}
              </>
            ) : (
              <div className="library-empty">
                <span>◇</span>
                <strong>Tu biblioteca está vacía</strong>
                <p>Cerrá esta ventana y tocá Guardar para crear el primer proyecto.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {!showStart && (
      <section className={`workspace ${
        templateId === "free" ? "free-workspace" : showReview ? "review-open" : "review-hidden"
      }`} aria-hidden={modalOpen || undefined} inert={modalOpen ? true : undefined}>
        <aside className={`left-panel ${templateId === "free" ? "free-left-panel" : ""}`}>
          {templateId === "free" && !showReview ? (
            <div className="free-project-bar">
              <div className="free-project-title">
                <span>EDITOR LIBRE</span>
                <input
                  type="text"
                  value={projectName}
                  maxLength={60}
                  onInput={(event) => {
                    setProjectName(event.currentTarget.value);
                    setSavedMessage("");
                  }}
                  aria-label="Nombre del proyecto"
                  placeholder="Mi diseño"
                  spellCheck={false}
                />
              </div>
              <details className="free-template-switcher">
                <summary>Cambiar plantilla</summary>
                <div>
                  {TEMPLATES.filter((item) => item.id !== "free").map((item) => (
                    <button onClick={() => chooseTemplate(item.id)} key={item.id}>
                      <i>{item.icon}</i>
                      <span>{item.shortName}</span>
                    </button>
                  ))}
                </div>
              </details>
              <div className="free-history-tools" aria-label="Historial de cambios">
                <button
                  onClick={undoObjects}
                  disabled={!historyAvailability.canUndo}
                  title="Deshacer (Ctrl+Z)"
                >
                  ↶ <span>Deshacer</span>
                </button>
                <button
                  onClick={redoObjects}
                  disabled={!historyAvailability.canRedo}
                  title="Rehacer (Ctrl+Y)"
                >
                  ↷ <span>Rehacer</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="project-overview">
              <div className="panel-heading">
                <span className="eyebrow">01 · Proyecto</span>
                <h1>{template.name}</h1>
                <p>{template.description}</p>
              </div>

              <label className="project-name-field">
            <span>
              <strong>Nombre del archivo</strong>
              <small>Se usa en todos los formatos</small>
            </span>
            <span className="file-name-control">
              <input
                type="text"
                value={projectName}
                maxLength={60}
                onInput={(event) => {
                  setProjectName(event.currentTarget.value);
                  setSavedMessage("");
                }}
                aria-label="Nombre personalizado del archivo"
                placeholder="mi-pieza-forja"
                spellCheck={false}
              />
              <em>.3D</em>
            </span>
            <small className="file-name-preview">{exportName}</small>
              </label>

              <div className="template-strip" aria-label="Plantillas disponibles">
                {TEMPLATES.map((item) => (
                  <button
                    className={`template-card ${item.id === templateId ? "active" : ""}`}
                    onClick={() => chooseTemplate(item.id)}
                    aria-pressed={item.id === templateId}
                    key={item.id}
                  >
                    <span className="template-icon">{item.icon}</span>
                    <span>
                      <strong>{item.shortName}</strong>
                      <small>{item.id === templateId ? "Editando" : "Usar plantilla"}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <details
            className="tool-section"
            open={openToolSections.measurements}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              setOpenToolSections((current) =>
                current.measurements === open
                  ? current
                  : { ...current, measurements: open },
              );
            }}
          >
            <summary>
              <span><b>02</b> {templateId === "free" ? "Tamaño del lienzo" : "Medidas base"}</span>
              <small>
                {templateId === "free"
                  ? `${parameters.width} × ${parameters.depth}`
                  : "mm"}
              </small>
            </summary>
            {templateId !== "free" && (
              <div className="template-preset-block">
                <div className="template-preset-heading">
                  <span>
                    <strong>Tamaños rápidos</strong>
                    <small>Elegí una base y personalizala</small>
                  </span>
                  <em>Editable</em>
                </div>
                <div className="template-preset-grid">
                  {TEMPLATE_PRESETS[templateId].map((preset) => {
                    const isActive = Object.entries(preset.parameters).every(
                      ([key, value]) => parameters[key] === value,
                    );
                    return (
                      <button
                        className={isActive ? "active" : ""}
                        onClick={() => applyTemplatePreset(preset)}
                        aria-pressed={isActive}
                        key={preset.id}
                      >
                        <strong>{preset.name}</strong>
                        <small>{preset.detail}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="fields">
              {template.fields.map((field) => (
                <label className="field" key={`${templateId}-${field.key}`}>
                  <span>
                    <strong>{field.label}</strong>
                    <small>{field.hint}</small>
                  </span>
                  <span className="number-control">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={parameters[field.key]}
                      onInput={(event) =>
                        updateParameter(field.key, event.currentTarget.value)
                      }
                      aria-label={`${field.label} en milímetros`}
                    />
                    <em>mm</em>
                  </span>
                </label>
              ))}
            </div>
            {templateId !== "free" && (
              <button
                className="edit-in-free-action"
                onClick={editTemplateInFreeMode}
              >
                <span>✦</span>
                <span>
                  <strong>Editar todo en Libre</strong>
                  <small>Convierte paredes, agujeros y piezas en objetos editables</small>
                </span>
                <b>Continuar →</b>
              </button>
            )}
          </details>

          {templateId !== "free" && (
          <details
            className="tool-section"
            open={openToolSections.manufacturing}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              setOpenToolSections((current) =>
                current.manufacturing === open
                  ? current
                  : { ...current, manufacturing: open },
              );
            }}
          >
            <summary>
              <span><b>03</b> Forma y fabricación</span>
              <small>{featureSettings.cornerRadius} mm</small>
            </summary>
            {(
              <label className="field">
                <span>
                  <strong>Radio de esquinas</strong>
                  <small>Suaviza el contorno</small>
                </span>
                <span className="number-control">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={featureSettings.cornerRadius}
                    onInput={(event) =>
                      updateFeature("cornerRadius", Number(event.currentTarget.value))
                    }
                    aria-label="Radio de esquinas"
                  />
                  <em>mm</em>
                </span>
              </label>
            )}

            {templateId === "box" && (
              <>
                <label className="select-field">
                  <span>
                    <strong>Tipo de tapa</strong>
                    <small>Se muestra elevada para inspeccionarla</small>
                  </span>
                  <select
                    value={featureSettings.lidStyle}
                    onChange={(event) =>
                      updateFeature("lidStyle", event.target.value as LidStyle)
                    }
                    aria-label="Tipo de tapa"
                  >
                    <option value="none">Sin tapa</option>
                    <option value="snap">A presión</option>
                    <option value="screw">Con tornillos</option>
                    <option value="slide">Corredera</option>
                  </select>
                </label>
                {featureSettings.lidStyle !== "none" && (
                  <label className="field">
                    <span>
                      <strong>Espesor de tapa</strong>
                      <small>Pieza incluida en la exportación</small>
                    </span>
                    <span className="number-control">
                      <input
                        type="number"
                        min="1"
                        max="8"
                        step="0.2"
                        value={featureSettings.lidThickness}
                        onInput={(event) =>
                          updateFeature(
                            "lidThickness",
                            Number(event.currentTarget.value),
                          )
                        }
                        aria-label="Espesor de tapa"
                      />
                      <em>mm</em>
                    </span>
                  </label>
                )}
                <label className="select-field">
                  <span>
                    <strong>Soportes internos</strong>
                    <small>Torres para placas electrónicas</small>
                  </span>
                  <select
                    value={featureSettings.standoffCount}
                    onChange={(event) =>
                      updateFeature("standoffCount", Number(event.target.value))
                    }
                    aria-label="Cantidad de soportes internos"
                  >
                    <option value="0">Sin soportes</option>
                    <option value="2">2 soportes</option>
                    <option value="4">4 soportes</option>
                  </select>
                </label>
                {featureSettings.standoffCount > 0 && (
                  <div className="mini-grid">
                    <label>
                      <span>Ø exterior</span>
                      <input
                        type="number"
                        value={featureSettings.standoffDiameter}
                        min="4"
                        max="16"
                        step="0.5"
                        onInput={(event) =>
                          updateFeature(
                            "standoffDiameter",
                            Number(event.currentTarget.value),
                          )
                        }
                        aria-label="Diámetro exterior del soporte"
                      />
                    </label>
                    <label>
                      <span>Ø tornillo</span>
                      <input
                        type="number"
                        value={featureSettings.standoffHole}
                        min="1.5"
                        max="8"
                        step="0.1"
                        onInput={(event) =>
                          updateFeature(
                            "standoffHole",
                            Number(event.currentTarget.value),
                          )
                        }
                        aria-label="Diámetro del tornillo del soporte"
                      />
                    </label>
                    <label>
                      <span>Altura</span>
                      <input
                        type="number"
                        value={featureSettings.standoffHeight}
                        min="2"
                        max="40"
                        step="0.5"
                        onInput={(event) =>
                          updateFeature(
                            "standoffHeight",
                            Number(event.currentTarget.value),
                          )
                        }
                        aria-label="Altura del soporte"
                      />
                    </label>
                  </div>
                )}
              </>
            )}
          </details>
          )}

          {templateId !== "free" && (
          <details className="tool-section">
            <summary>
              <span><b>04</b> Agujeros y recortes</span>
              <small>{holes.length}</small>
            </summary>
            {(templateId === "box" || templateId === "bracket") && (
              <div className="face-tabs" aria-label="Cara donde editar recortes">
                <button
                  className={cutoutFace === "base" ? "active" : ""}
                  onClick={() => chooseCutoutFace("base")}
                >
                  Base
                </button>
                <button
                  className={cutoutFace === "front" ? "active" : ""}
                  onClick={() => chooseCutoutFace("front")}
                >
                  {templateId === "bracket" ? "Ala vertical" : "Frente"}
                </button>
              </div>
            )}
            <div className="tool-palette" aria-label="Tipo de recorte a colocar">
              <button
                className={cutoutTool === "round" ? "active" : ""}
                onClick={() =>
                  setCutoutTool((current) => current === "round" ? null : "round")
                }
                aria-pressed={cutoutTool === "round"}
              >
                <i>○</i>
                <span><strong>Agujero</strong><small>Circular</small></span>
              </button>
              <button
                className={cutoutTool === "rect" ? "active" : ""}
                onClick={() =>
                  setCutoutTool((current) => current === "rect" ? null : "rect")
                }
                aria-pressed={cutoutTool === "rect"}
              >
                <i>□</i>
                <span><strong>Recorte</strong><small>Rectangular</small></span>
              </button>
            </div>
            <FacePlacementEditor
              holes={visibleHoles}
              selectedId={selectedHoleId}
              width={faceWidth}
              height={faceHeight}
              placementTool={cutoutTool}
              roundSurface={false}
              onPlace={(kind, x, z) => addHoleAt(kind, cutoutFace, x, z)}
              onSelect={setSelectedHoleId}
              onMove={moveHole}
            />
            {selectedFaceHole && (
              <div className="property-editor">
                <div className="property-heading">
                  <span>Ajuste preciso</span>
                  <small>
                    {selectedFaceHole.kind === "round" ? "Agujero circular" : "Recorte rectangular"}
                  </small>
                </div>
                <div className="mini-grid two">
                  <label>
                    <span>Posición X</span>
                    <input
                      type="number"
                      value={selectedFaceHole.x}
                      step="0.5"
                      onInput={(event) =>
                        updateHole("x", Number(event.currentTarget.value))
                      }
                      aria-label="Posición X del recorte"
                    />
                  </label>
                  <label>
                    <span>Posición Z</span>
                    <input
                      type="number"
                      value={selectedFaceHole.z}
                      step="0.5"
                      onInput={(event) =>
                        updateHole("z", Number(event.currentTarget.value))
                      }
                      aria-label="Posición Z del recorte"
                    />
                  </label>
                  <label>
                    <span>{selectedFaceHole.kind === "round" ? "Diámetro" : "Ancho"}</span>
                    <input
                      type="number"
                      value={selectedFaceHole.width}
                      min="1"
                      step="0.5"
                      onInput={(event) =>
                        updateHole("width", Number(event.currentTarget.value))
                      }
                      aria-label="Ancho o diámetro del recorte"
                    />
                  </label>
                  {selectedFaceHole.kind === "rect" && (
                    <label>
                      <span>Alto</span>
                      <input
                        type="number"
                        value={selectedFaceHole.height}
                        min="1"
                        step="0.5"
                        onInput={(event) =>
                          updateHole("height", Number(event.currentTarget.value))
                        }
                        aria-label="Alto del recorte"
                      />
                    </label>
                  )}
                </div>
                <div className="editor-actions">
                  <button onClick={duplicateSelectedHole}>Duplicar</button>
                  <button className="danger-action" onClick={deleteSelectedHole}>
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </details>
          )}

          <details
            className="tool-section"
            open={openToolSections.freeTools}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              setOpenToolSections((current) =>
                current.freeTools === open
                  ? current
                  : { ...current, freeTools: open },
              );
            }}
          >
            <summary>
              <span><b>{templateId === "free" ? "03" : "05"}</b> {
                templateId === "free" ? "Herramientas" : "Figuras y texto"
              }</span>
              <small>{objects.length}</small>
            </summary>
            {templateId === "free" ? (
              <div className="free-workbench">
                <div className="free-editor-nav" aria-label="Secciones del editor libre">
                  {([
                    ["create", "+", "Biblioteca"],
                    ["designs", "◆", "Diseños"],
                    ["objects", "≡", "Capas"],
                  ] as const).map(([view, icon, label]) => (
                    <button
                      key={view}
                      className={
                        view === "designs"
                          ? showDesignGallery ? "active" : ""
                          : freeEditorView === view ? "active" : ""
                      }
                      onClick={() =>
                        view === "designs"
                          ? setShowDesignGallery(true)
                          : setFreeEditorView(view)
                      }
                      disabled={view === "objects" && objects.length === 0}
                      aria-pressed={
                        view === "designs" ? showDesignGallery : freeEditorView === view
                      }
                    >
                      <i>{icon}</i>
                      <span>{label}</span>
                      {view === "objects" && objects.length > 0 && (
                        <small>{objects.length}</small>
                      )}
                    </button>
                  ))}
                </div>

                {freeEditorView === "create" && (
                  <div className="free-create-panel">
                    <div className="free-panel-intro">
                      <strong>Figuras básicas</strong>
                      <small>Arrastrá al lienzo o tocá para agregar al centro.</small>
                    </div>
                    <div className="free-operation-toggle" aria-label="Tipo de figura">
                      <button
                        className={freeAddOperation === "solid" ? "active solid" : ""}
                        onClick={() => setFreeAddOperation("solid")}
                        aria-pressed={freeAddOperation === "solid"}
                      >
                        <i className="solid-dot" />
                        <span><strong>Sólido</strong><small>Agrega material</small></span>
                      </button>
                      <button
                        className={freeAddOperation === "hole" ? "active hole" : ""}
                        onClick={() => setFreeAddOperation("hole")}
                        disabled={
                          !visibleObjects.some(
                            (object) => object.operation !== "hole",
                          )
                        }
                        aria-pressed={freeAddOperation === "hole"}
                      >
                        <i className="hole-dot" />
                        <span><strong>Recorte</strong><small>Quita material</small></span>
                      </button>
                    </div>
                    <div
                      className={`free-shape-catalog ${
                        freeAddOperation === "hole" ? "is-hole" : ""
                      }`}
                      aria-label={
                        freeAddOperation === "hole"
                          ? "Agregar recorte"
                          : "Agregar sólido"
                      }
                    >
                      <button
                        draggable
                        onDragStart={(event) => beginShapeDrag(event, "cube")}
                        onDragEnd={() => setIsDraggingShape(false)}
                        onClick={() => addFreeObject("cube")}
                      >
                        <i>{freeAddOperation === "hole" ? "□" : "■"}</i>
                        <span><strong>Cubo</strong><small>Cajas y bases</small></span>
                      </button>
                      <button
                        draggable
                        onDragStart={(event) => beginShapeDrag(event, "cylinder")}
                        onDragEnd={() => setIsDraggingShape(false)}
                        onClick={() => addFreeObject("cylinder")}
                      >
                        <i>{freeAddOperation === "hole" ? "○" : "●"}</i>
                        <span><strong>Cilindro</strong><small>Tubos y perforaciones</small></span>
                      </button>
                      <button
                        draggable
                        onDragStart={(event) => beginShapeDrag(event, "sphere")}
                        onDragEnd={() => setIsDraggingShape(false)}
                        onClick={() => addFreeObject("sphere")}
                      >
                        <i>{freeAddOperation === "hole" ? "◎" : "◉"}</i>
                        <span><strong>Esfera</strong><small>Volúmenes redondos</small></span>
                      </button>
                      <button
                        draggable
                        onDragStart={(event) => beginShapeDrag(event, "cone")}
                        onDragEnd={() => setIsDraggingShape(false)}
                        onClick={() => addFreeObject("cone")}
                      >
                        <i>▲</i>
                        <span><strong>Cono</strong><small>Puntas y embudos</small></span>
                      </button>
                      <button
                        draggable
                        onDragStart={(event) => beginShapeDrag(event, "tube")}
                        onDragEnd={() => setIsDraggingShape(false)}
                        onClick={() => addFreeObject("tube")}
                      >
                        <i>◍</i>
                        <span><strong>Tubo</strong><small>Aros y separadores</small></span>
                      </button>
                      <button
                        draggable
                        onDragStart={(event) => beginShapeDrag(event, "wedge")}
                        onDragEnd={() => setIsDraggingShape(false)}
                        onClick={() => addFreeObject("wedge")}
                      >
                        <i>◢</i>
                        <span><strong>Cuña</strong><small>Rampas y apoyos</small></span>
                      </button>
                      <button
                        draggable
                        onDragStart={(event) => beginShapeDrag(event, "text")}
                        onDragEnd={() => setIsDraggingShape(false)}
                        onClick={() => addFreeObject("text")}
                      >
                        <i>T</i>
                        <span><strong>Texto</strong><small>Relieve o grabado</small></span>
                      </button>
                    </div>
                    {!visibleObjects.some(
                      (object) => object.operation !== "hole",
                    ) && (
                        <p className="free-context-note">
                          La opción Recorte se habilita cuando agregues el primer
                          sólido.
                        </p>
                    )}
                    <div className="free-preset-section">
                      <div>
                        <strong>Piezas rápidas</strong>
                        <small>Listas para editar</small>
                      </div>
                      <div className="free-preset-grid">
                        <button onClick={() => addFreePreset("plate")}>
                          <i>▬</i><span>Placa</span>
                        </button>
                        <button onClick={() => addFreePreset("post")}>
                          <i>▮</i><span>Poste</span>
                        </button>
                        <button onClick={() => addFreePreset("washer")}>
                          <i>◎</i><span>Arandela</span>
                        </button>
                        <button onClick={() => addFreePreset("spacer")}>
                          <i>◌</i><span>Separador</span>
                        </button>
                        <button onClick={() => addFreePreset("mounting-tab")}>
                          <i>◫</i><span>Oreja</span>
                        </button>
                        <button onClick={() => addFreePreset("foot")}>
                          <i>●</i><span>Pata</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {freeEditorView === "designs" && (
                  <div className="free-designs-panel">
                    <div className="free-panel-intro">
                      <strong>Galería de diseños</strong>
                      <small>Explorá piezas completas con una vista previa antes de agregarlas.</small>
                    </div>
                    <button className="open-design-gallery" onClick={() => setShowDesignGallery(true)}>
                      Abrir biblioteca de diseños
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="shape-palette" aria-label="Agregar figuras y texto">
                <button onClick={() => addObject("cube")}><i>■</i><span>Cubo</span></button>
                <button onClick={() => addObject("cylinder")}><i>●</i><span>Cilindro</span></button>
                <button onClick={() => addObject("sphere")}><i>◉</i><span>Esfera</span></button>
                <button onClick={() => addObject("text")}><i>T</i><span>Texto</span></button>
              </div>
            )}
            {templateId !== "free" && (
            <ObjectPlacementEditor
              objects={objects}
              selectedId={selectedObjectId}
              width={parameters.width}
              depth={parameters.depth}
              onSelect={setSelectedObjectId}
              onMove={moveObject}
            />
            )}
            {objects.length > 0 ? (
              <>
                {templateId === "free" && freeEditorView === "objects" ? (
                  <div className="free-object-list" aria-label="Objetos del modelo">
                    <div className="free-list-heading">
                      <span>
                        {visibleObjects.filter(
                          (object) => object.operation !== "hole",
                        ).length} sólidos
                        <i>·</i>
                        {visibleObjects.filter(
                          (object) => object.operation === "hole",
                        ).length} recortes visibles
                      </span>
                      <button onClick={() => setFreeEditorView("create")}>+ Agregar</button>
                    </div>
                    {objects.map((object, index) => (
                      <div
                        className={`free-layer-row ${
                          selectedObjectIds.includes(object.id) ? "active" : ""
                        } ${object.hidden ? "is-hidden" : ""}`}
                        key={object.id}
                      >
                        <button
                          className="free-layer-main"
                          onClick={(event) =>
                            selectFreeObject(
                              object.id,
                              event.shiftKey || event.ctrlKey || event.metaKey,
                            )
                          }
                        >
                          <i
                            className={
                              object.operation === "hole"
                                ? "hole-dot"
                                : "solid-dot"
                            }
                          />
                          <span>
                            <strong>{object.name}</strong>
                            <small>
                              {object.operation === "hole" ? "Recorte" : "Sólido"}
                              {object.hidden ? " · oculto" : ""}
                            </small>
                          </span>
                        </button>
                        <div className="free-layer-actions">
                          <button
                            onClick={() => toggleObjectState(object.id, "hidden")}
                            title={object.hidden ? "Mostrar objeto" : "Ocultar objeto"}
                            aria-label={object.hidden ? "Mostrar objeto" : "Ocultar objeto"}
                          >
                            {object.hidden ? "◌" : "◉"}
                          </button>
                          <button
                            onClick={() => toggleObjectState(object.id, "locked")}
                            title={object.locked ? "Desbloquear objeto" : "Bloquear objeto"}
                            aria-label={object.locked ? "Desbloquear objeto" : "Bloquear objeto"}
                          >
                            {object.locked ? "▣" : "▢"}
                          </button>
                          <button
                            onClick={() => moveObjectInStack(object.id, "up")}
                            disabled={index === 0}
                            title="Subir capa"
                            aria-label="Subir capa"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveObjectInStack(object.id, "down")}
                            disabled={index === objects.length - 1}
                            title="Bajar capa"
                            aria-label="Bajar capa"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : templateId !== "free" ? (
                  <div className="object-tabs wide" aria-label="Objetos agregados">
                    {objects.map((object) => (
                      <button
                        className={object.id === selectedObjectId ? "active" : ""}
                        onClick={() => setSelectedObjectId(object.id)}
                        key={object.id}
                      >
                        {object.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {selectedObject && template.id !== "free" && (
                  <div className={`property-editor ${
                    templateId === "free" ? "free-property-editor" : ""
                  }`}>
                    <div className="property-heading">
                      <span>
                        {templateId === "free" ? "Propiedades" : "Ajuste preciso"}
                      </span>
                      <small>
                        {templateId === "free"
                          ? "Valores exactos en milímetros"
                          : selectedObject.name}
                      </small>
                    </div>
                    {templateId === "free" && (
                      <label className="select-field compact-select operation-field">
                        <span>
                          <strong>Operación</strong>
                          <small>Construye o recorta el resultado</small>
                        </span>
                        <select
                          value={selectedObject.operation ?? "solid"}
                          onChange={(event) =>
                            updateObject(
                              "operation",
                              event.target.value as ObjectOperation,
                            )
                          }
                          aria-label="Operación booleana del objeto"
                        >
                          <option value="solid">Sólido</option>
                          <option value="hole">Agujero</option>
                        </select>
                      </label>
                    )}
                    {selectedObject.kind === "text" && (
                      <label className="text-property">
                        <span>Contenido</span>
                        <input
                          type="text"
                          value={selectedObject.text ?? ""}
                          maxLength={20}
                          onInput={(event) =>
                            updateObject("text", event.currentTarget.value)
                          }
                          aria-label="Contenido del texto 3D"
                        />
                      </label>
                    )}
                    {templateId === "free" && (
                      <div className="property-group-label">
                        <span>
                          {freeTransformMode === "translate"
                            ? "Posición"
                            : freeTransformMode === "rotate"
                            ? "Rotación"
                            : "Tamaño"}
                        </span>
                        <small>
                          {freeTransformMode === "scale"
                            ? "Medidas finales"
                            : "Ejes X · Y · Z"}
                        </small>
                      </div>
                    )}
                    <div className="mini-grid two">
                      {(templateId !== "free" || freeTransformMode === "translate") && (
                        <>
                      <label>
                        <span>Posición X</span>
                        <input
                          type="number"
                          value={selectedObject.x}
                          step="0.5"
                          onInput={(event) =>
                            updateObject("x", Number(event.currentTarget.value))
                          }
                          aria-label="Posición X del objeto"
                        />
                      </label>
                      <label>
                        <span>Posición Z</span>
                        <input
                          type="number"
                          value={selectedObject.z}
                          step="0.5"
                          onInput={(event) =>
                            updateObject("z", Number(event.currentTarget.value))
                          }
                          aria-label="Posición Z del objeto"
                        />
                      </label>
                      <label>
                        <span>Altura sobre base</span>
                        <input
                          type="number"
                          value={selectedObject.y}
                          step="0.5"
                          onInput={(event) =>
                            updateObject("y", Number(event.currentTarget.value))
                          }
                          aria-label="Altura del objeto sobre la base"
                        />
                      </label>
                        </>
                      )}
                      {(templateId !== "free" || freeTransformMode === "scale") && (
                        <>
                      <label>
                        <span>
                          {selectedObject.kind === "text"
                            ? "Tamaño"
                            : selectedObject.kind === "tube"
                              ? "Ø exterior"
                              : selectedObject.kind === "cylinder" ||
                                  selectedObject.kind === "cone" ||
                                  selectedObject.kind === "sphere"
                                ? "Diámetro"
                                : "Ancho"}
                        </span>
                        <input
                          type="number"
                          value={selectedObject.width}
                          min="1"
                          step="0.5"
                          onInput={(event) =>
                            updateObject("width", Number(event.currentTarget.value))
                          }
                          aria-label="Ancho o diámetro del objeto"
                        />
                      </label>
                      {(selectedObject.kind === "cube" ||
                        selectedObject.kind === "wedge" ||
                        selectedObject.kind === "tube") && (
                        <label>
                          <span>
                            {selectedObject.kind === "tube"
                              ? "Ø interior"
                              : "Profundidad"}
                          </span>
                          <input
                            type="number"
                            value={selectedObject.depth}
                            min={selectedObject.kind === "tube" ? 0.5 : 1}
                            max={
                              selectedObject.kind === "tube"
                                ? Math.max(0.5, selectedObject.width - 0.5)
                                : undefined
                            }
                            step="0.5"
                            onInput={(event) =>
                              updateObject("depth", Number(event.currentTarget.value))
                            }
                            aria-label="Profundidad del objeto"
                          />
                        </label>
                      )}
                      {selectedObject.kind !== "sphere" && (
                        <label>
                          <span>
                            {selectedObject.kind === "text" ? "Relieve" : "Altura"}
                          </span>
                          <input
                            type="number"
                            value={selectedObject.height}
                            min="0.6"
                            step="0.2"
                            onInput={(event) =>
                              updateObject("height", Number(event.currentTarget.value))
                            }
                          aria-label="Altura del objeto"
                        />
                      </label>
                      )}
                        </>
                      )}
                      {(templateId !== "free" || freeTransformMode === "rotate") && (
                        <>
                      {selectedObject.kind !== "sphere" && (
                        <label>
                          <span>Rotación Y</span>
                          <input
                            type="number"
                            value={selectedObject.rotation}
                            step="5"
                            onInput={(event) =>
                              updateObject(
                                "rotation",
                                Number(event.currentTarget.value),
                              )
                            }
                            aria-label="Rotación del objeto"
                          />
                        </label>
                      )}
                      {templateId === "free" && selectedObject.kind !== "sphere" && (
                        <>
                          <label>
                            <span>Rotación X</span>
                            <input
                              type="number"
                              value={selectedObject.rotationX ?? 0}
                              step="5"
                              onInput={(event) =>
                                updateObject(
                                  "rotationX",
                                  Number(event.currentTarget.value),
                                )
                              }
                              aria-label="Rotación X del objeto"
                            />
                          </label>
                          <label>
                            <span>Rotación Z</span>
                            <input
                              type="number"
                              value={selectedObject.rotationZ ?? 0}
                              step="5"
                              onInput={(event) =>
                                updateObject(
                                  "rotationZ",
                                  Number(event.currentTarget.value),
                                )
                              }
                              aria-label="Rotación Z del objeto"
                            />
                          </label>
                        </>
                      )}
                        </>
                      )}
                    </div>
                    {templateId === "free" && freeTransformMode === "translate" && (
                      <div className="free-quick-actions">
                        <button onClick={() => updateObject("y", 0)}>Apoyar en piso</button>
                        <button
                          onClick={() =>
                            updateObjectById(selectedObject.id, { x: 0, z: 0 })
                          }
                        >
                          Centrar X/Z
                        </button>
                      </div>
                    )}
                    <div className="editor-actions">
                      <button onClick={duplicateSelectedObject}>Duplicar</button>
                      <button className="danger-action" onClick={deleteSelectedObject}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="empty-state">
                {templateId === "free"
                  ? "El lienzo está vacío. Agregá tu primer sólido para empezar."
                  : "Agregá una figura o texto para combinarla con la plantilla."}
              </p>
            )}
          </details>

          {(templateId !== "free" || objects.length > 0) && (
            <button
              className={`text-action ${templateId === "free" ? "free-clear-action" : ""}`}
              onClick={resetCurrentTemplate}
            >
              {templateId === "free" ? "Vaciar lienzo" : "Restablecer esta plantilla"}
            </button>
          )}
          {savedMessage && <p className="saved-message" role="status" aria-live="polite">{savedMessage}</p>}
        </aside>

        <section
          className={`viewport-panel ${
            templateId === "free" && isDraggingShape ? "is-drop-target" : ""
          }`}
          onDragOver={(event) => {
            if (templateId !== "free") return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            setIsDraggingShape(true);
          }}
          onDrop={templateId === "free" ? dropShapeOnCanvas : undefined}
        >
          <div className="viewport-toolbar">
            <div>
              <span className="live-dot" />
              Motor 3D optimizado
            </div>
            <button
              className="help-button"
              onClick={() => setShowHelp((current) => !current)}
            >
              {showHelp ? "Ocultar ayuda" : "¿Cómo moverla?"}
            </button>
          </div>

          {templateId === "free" && (
            <div className="free-canvas-toolbar">
              <span>
                {selectedObjectIds.length > 1
                  ? `${selectedObjectIds.length} objetos seleccionados`
                  : selectedObject
                  ? `${selectedObject.operation === "hole" ? "Agujero" : "Sólido"} · ${selectedObject.name}`
                  : "Hacé clic sobre una figura para seleccionarla"}
              </span>
              <div>
                <button
                  className={freeTransformMode === "translate" ? "active" : ""}
                  onClick={() => setFreeTransformMode("translate")}
                >
                  Mover
                </button>
                <button
                  className={freeTransformMode === "rotate" ? "active" : ""}
                  onClick={() => setFreeTransformMode("rotate")}
                >
                  Rotar
                </button>
                <button
                  className={freeTransformMode === "scale" ? "active" : ""}
                  onClick={() => setFreeTransformMode("scale")}
                >
                  Escalar
                </button>
                <span className="toolbar-separator" />
                <button
                  className={snapEnabled ? "active snap-button" : "snap-button"}
                  onClick={() => setSnapEnabled((current) => !current)}
                  aria-pressed={snapEnabled}
                  title="Ajuste magnético"
                >
                  Imán
                </button>
                <select
                  value={snapSize}
                  onChange={(event) => setSnapSize(Number(event.target.value))}
                  disabled={!snapEnabled}
                  aria-label="Paso del ajuste magnético"
                >
                  <option value="0.5">0,5 mm</option>
                  <option value="1">1 mm</option>
                  <option value="2">2 mm</option>
                  <option value="5">5 mm</option>
                </select>
              </div>
            </div>
          )}

          {templateId === "free" && isDraggingShape && (
            <div className="canvas-drop-message" aria-hidden="true">
              <strong>Soltá para agregar</strong>
              <span>La figura se crea en esta zona del lienzo</span>
            </div>
          )}

          <ModelPreview
            templateId={templateId}
            parameters={parameters}
            options={options}
            isValid={isValid}
            cameraView={cameraView}
            selectedObjectId={templateId === "free" ? selectedObjectId : null}
            selectedObjectIds={
              templateId === "free" ? selectedObjectIds : []
            }
            transformMode={freeTransformMode}
            snapEnabled={snapEnabled}
            snapSize={snapSize}
            onSelectObject={selectFreeObject}
            onTransformObject={updateObjectById}
          />
          {!isValid && (
            <div className="invalid-preview">
              <span>!</span>
              <strong>Revisá el diseño</strong>
              <p>Corregí los errores para volver a generar la vista 3D.</p>
            </div>
          )}

          {showHelp && (
            <div className="interaction-help">
              <span><strong>Arrastrar</strong> para girar</span>
              <span><strong>Rueda</strong> para acercar</span>
              <span><strong>Click derecho</strong> para mover</span>
              <span><strong>X · Y · Z</strong> para alinear la cámara</span>
            </div>
          )}

          <div className="axis-legend" aria-label="Vistas por eje">
            {(["iso", "x", "y", "z"] as CameraView[]).map((view) => (
              <button
                className={`axis ${view} ${cameraView === view ? "active" : ""}`}
                onClick={() => setCameraView(view)}
                aria-pressed={cameraView === view}
                aria-label={
                  view === "iso"
                    ? "Vista isométrica"
                    : `Vista desde el eje ${view.toUpperCase()}`
                }
                key={view}
              >
                {view === "iso" ? "◇" : view.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="viewport-footer">
            <span>
              {templateId === "free"
                ? "Clic: seleccionar · Arrastrar fondo: girar"
                : "Arrastrá para inspeccionar la pieza"}
            </span>
            <span>
              {templateId === "free"
                ? `${visibleObjects.filter(
                    (object) => object.operation !== "hole",
                  ).length} sólidos · ${
                    visibleObjects.filter(
                      (object) => object.operation === "hole",
                    ).length
                  } agujeros`
                : `${holes.length} recortes · ${objects.length} objetos · escala real`}
            </span>
          </div>
        </section>

        {(templateId === "free" || showReview) && (
        <aside
          id="manufacturing-review"
          className={`right-panel ${
            templateId === "free" && !showReview
              ? "free-inspector-panel"
              : ""
          }`}
        >
          {templateId === "free" && !showReview ? (
            <>
              <div className="panel-heading compact-heading inspector-heading">
                <span className="eyebrow">Inspector</span>
                <h2>
                  {selectedObjectIds.length > 1
                    ? `${selectedObjectIds.length} objetos`
                    : selectedObject?.name ?? "Sin selección"}
                </h2>
                <p>
                  {selectedObjectIds.length > 1
                    ? "Alineá y organizá el grupo seleccionado."
                    : selectedObject
                      ? "Editá medidas y posición con precisión."
                      : "Elegí una figura en el lienzo o en Capas."}
                </p>
              </div>

              {selectedObjectIds.length > 1 ? (
                <div className="inspector-multi">
                  <div className="inspector-selection-summary">
                    <span>Selección múltiple</span>
                    <strong>{selectedObjectIds.length}</strong>
                  </div>
                  <div className="align-actions inspector-align-actions">
                    <button onClick={() => alignSelectedObjects("x")}>Alinear X</button>
                    <button onClick={() => alignSelectedObjects("z")}>Alinear Z</button>
                    <button onClick={() => alignSelectedObjects("floor")}>Al piso</button>
                    <button
                      onClick={() => distributeSelectedObjects("x")}
                      disabled={selectedObjectIds.length < 3}
                    >
                      Distribuir X
                    </button>
                    <button
                      onClick={() => distributeSelectedObjects("z")}
                      disabled={selectedObjectIds.length < 3}
                    >
                      Distribuir Z
                    </button>
                  </div>
                  <p>
                    Los objetos bloqueados conservan su posición y no se eliminan.
                  </p>
                  <div className="editor-actions">
                    <button onClick={duplicateSelectedObject}>Duplicar grupo</button>
                    <button className="danger-action" onClick={deleteSelectedObject}>
                      Eliminar grupo
                    </button>
                  </div>
                </div>
              ) : selectedObject ? (
                <div className="free-inspector-content">
                  <div className="inspector-object-state">
                    <i
                      className={
                        selectedObject.operation === "hole"
                          ? "hole-dot"
                          : "solid-dot"
                      }
                    />
                    <span>
                      {selectedObject.operation === "hole" ? "Recorte" : "Sólido"}
                      {selectedObject.hidden ? " · oculto" : ""}
                    </span>
                    <div>
                      <button
                        onClick={() =>
                          toggleObjectState(selectedObject.id, "hidden")
                        }
                      >
                        {selectedObject.hidden ? "Mostrar" : "Ocultar"}
                      </button>
                      <button
                        className={selectedObject.locked ? "active" : ""}
                        onClick={() =>
                          toggleObjectState(selectedObject.id, "locked")
                        }
                      >
                        {selectedObject.locked ? "Desbloquear" : "Bloquear"}
                      </button>
                    </div>
                  </div>

                  <label className="inspector-name-field">
                    <span>Nombre del objeto</span>
                    <input
                      type="text"
                      value={selectedObject.name}
                      maxLength={40}
                      disabled={selectedObject.locked}
                      onInput={(event) =>
                        updateObject("name", event.currentTarget.value)
                      }
                    />
                  </label>

                  <label className="select-field compact-select operation-field">
                    <span>
                      <strong>Operación</strong>
                      <small>Construye o recorta el resultado</small>
                    </span>
                    <select
                      value={selectedObject.operation ?? "solid"}
                      disabled={selectedObject.locked}
                      onChange={(event) =>
                        updateObject(
                          "operation",
                          event.target.value as ObjectOperation,
                        )
                      }
                    >
                      <option value="solid">Sólido</option>
                      <option value="hole">Agujero</option>
                    </select>
                  </label>

                  {selectedObject.kind === "text" && (
                    <label className="text-property inspector-text-field">
                      <span>Contenido</span>
                      <input
                        type="text"
                        value={selectedObject.text ?? ""}
                        maxLength={20}
                        disabled={selectedObject.locked}
                        onInput={(event) =>
                          updateObject("text", event.currentTarget.value)
                        }
                      />
                    </label>
                  )}

                  <div className="inspector-transform-tabs">
                    {([
                      ["translate", "Mover"],
                      ["rotate", "Rotar"],
                      ["scale", "Tamaño"],
                    ] as const).map(([mode, label]) => (
                      <button
                        className={freeTransformMode === mode ? "active" : ""}
                        onClick={() => setFreeTransformMode(mode)}
                        disabled={selectedObject.locked}
                        key={mode}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {selectedObject.locked && (
                    <p className="inspector-lock-note">
                      Este objeto está bloqueado. Desbloquealo para editarlo.
                    </p>
                  )}

                  <div className="mini-grid two inspector-grid">
                    {freeTransformMode === "translate" && (
                      <>
                        <label>
                          <span>Posición X</span>
                          <input
                            type="number"
                            value={selectedObject.x}
                            step="0.5"
                            disabled={selectedObject.locked}
                            onInput={(event) =>
                              updateObject("x", Number(event.currentTarget.value))
                            }
                          />
                        </label>
                        <label>
                          <span>Posición Z</span>
                          <input
                            type="number"
                            value={selectedObject.z}
                            step="0.5"
                            disabled={selectedObject.locked}
                            onInput={(event) =>
                              updateObject("z", Number(event.currentTarget.value))
                            }
                          />
                        </label>
                        <label>
                          <span>Altura Y</span>
                          <input
                            type="number"
                            value={selectedObject.y}
                            step="0.5"
                            disabled={selectedObject.locked}
                            onInput={(event) =>
                              updateObject("y", Number(event.currentTarget.value))
                            }
                          />
                        </label>
                      </>
                    )}
                    {freeTransformMode === "scale" && (
                      <>
                        <label>
                          <span>
                            {selectedObject.kind === "text"
                              ? "Tamaño"
                              : selectedObject.kind === "tube"
                                ? "Ø exterior"
                                : selectedObject.kind === "cylinder" ||
                                    selectedObject.kind === "cone" ||
                                    selectedObject.kind === "sphere"
                                  ? "Diámetro"
                                  : "Ancho"}
                          </span>
                          <input
                            type="number"
                            value={selectedObject.width}
                            min="1"
                            step="0.5"
                            disabled={selectedObject.locked}
                            onInput={(event) =>
                              updateObject(
                                "width",
                                Number(event.currentTarget.value),
                              )
                            }
                          />
                        </label>
                        {(selectedObject.kind === "cube" ||
                          selectedObject.kind === "wedge" ||
                          selectedObject.kind === "tube") && (
                          <label>
                            <span>
                              {selectedObject.kind === "tube"
                                ? "Ø interior"
                                : "Profundidad"}
                            </span>
                            <input
                              type="number"
                              value={selectedObject.depth}
                              min={selectedObject.kind === "tube" ? 0.5 : 1}
                              max={
                                selectedObject.kind === "tube"
                                  ? Math.max(0.5, selectedObject.width - 0.5)
                                  : undefined
                              }
                              step="0.5"
                              disabled={selectedObject.locked}
                              onInput={(event) =>
                                updateObject(
                                  "depth",
                                  Number(event.currentTarget.value),
                                )
                              }
                            />
                          </label>
                        )}
                        {selectedObject.kind !== "sphere" && (
                          <label>
                            <span>
                              {selectedObject.kind === "text"
                                ? "Relieve"
                                : "Altura"}
                            </span>
                            <input
                              type="number"
                              value={selectedObject.height}
                              min="0.6"
                              step="0.2"
                              disabled={selectedObject.locked}
                              onInput={(event) =>
                                updateObject(
                                  "height",
                                  Number(event.currentTarget.value),
                                )
                              }
                            />
                          </label>
                        )}
                      </>
                    )}
                    {freeTransformMode === "rotate" &&
                      selectedObject.kind !== "sphere" && (
                        <>
                          <label>
                            <span>Rotación X</span>
                            <input
                              type="number"
                              value={selectedObject.rotationX ?? 0}
                              step="5"
                              disabled={selectedObject.locked}
                              onInput={(event) =>
                                updateObject(
                                  "rotationX",
                                  Number(event.currentTarget.value),
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Rotación Y</span>
                            <input
                              type="number"
                              value={selectedObject.rotation}
                              step="5"
                              disabled={selectedObject.locked}
                              onInput={(event) =>
                                updateObject(
                                  "rotation",
                                  Number(event.currentTarget.value),
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Rotación Z</span>
                            <input
                              type="number"
                              value={selectedObject.rotationZ ?? 0}
                              step="5"
                              disabled={selectedObject.locked}
                              onInput={(event) =>
                                updateObject(
                                  "rotationZ",
                                  Number(event.currentTarget.value),
                                )
                              }
                            />
                          </label>
                        </>
                      )}
                  </div>

                  {freeTransformMode === "translate" && (
                    <div className="free-quick-actions">
                      <button
                        disabled={selectedObject.locked}
                        onClick={() => updateObject("y", 0)}
                      >
                        Apoyar en piso
                      </button>
                      <button
                        disabled={selectedObject.locked}
                        onClick={() =>
                          updateObjectById(selectedObject.id, { x: 0, z: 0 })
                        }
                      >
                        Centrar X/Z
                      </button>
                    </div>
                  )}

                  <div className="editor-actions">
                    <button onClick={duplicateSelectedObject}>Duplicar</button>
                    <button
                      className="danger-action"
                      onClick={deleteSelectedObject}
                      disabled={selectedObject.locked}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="inspector-empty-state">
                  <span>✦</span>
                  <strong>Seleccioná una figura</strong>
                  <p>
                    Después podés moverla directamente o escribir medidas exactas.
                  </p>
                </div>
              )}

              <div className={`inspector-print-status ${
                canExport ? "ready" : ""
              }`}>
                <span>{canExport ? "✓" : "+"}</span>
                <div>
                  <strong>
                    {canExport ? "Modelo exportable" : "Agregá un sólido visible"}
                  </strong>
                  <small>{volumeCm3.toFixed(1)} cm³ aproximados</small>
                </div>
              </div>
            </>
          ) : (
            <>
          <button
            className="review-close"
            onClick={() => setShowReview(false)}
            aria-label="Ocultar comprobación"
          >
            <span>Ocultar comprobación</span>
            <b aria-hidden="true">×</b>
          </button>
          <section className="manufacturing-summary" aria-label="Resumen de fabricación">
          <div className="panel-heading compact-heading">
            <span className="eyebrow">Comprobación final</span>
            <h2>Lista para fabricar</h2>
          </div>

          <div className={`status-card ${
            !isValid ? "error" : hasPrintableGeometry ? "success" : "idle"
          }`}>
            <span className="status-icon">
              {!isValid ? "!" : hasPrintableGeometry ? "✓" : "+"}
            </span>
            <div>
              <strong>
                {!isValid
                  ? "Necesita corrección"
                  : hasPrintableGeometry ? "Geometría válida" : "Lienzo vacío"}
              </strong>
              <p>
                {!isValid
                  ? "Hay medidas u operaciones incompatibles."
                  : hasPrintableGeometry
                    ? "La pieza y sus elementos se pueden exportar."
                    : "Agregá un sólido para comenzar a diseñar."}
              </p>
            </div>
          </div>

          {validation.errors.map((error) => (
            <div className="notice error" key={error}><span>!</span><p>{error}</p></div>
          ))}
          {validation.warnings.map((warning) => (
            <div className="notice warning" key={warning}><span>!</span><p>{warning}</p></div>
          ))}

          <div className="spec-list">
            <div><span>{primarySpec.label}</span><strong>{primarySpec.value}</strong></div>
            <div><span>Volumen aproximado</span><strong>{volumeCm3.toFixed(1)} cm³</strong></div>
            <div><span>{activeMaterial.label} estimado</span><strong>≈ {effectiveMaterial.toFixed(1)} g</strong></div>
            <div><span>Tiempo orientativo</span><strong>≈ {formatDuration(estimatedMinutes)}</strong></div>
            <div><span>Nombre</span><strong className="filename-spec">{exportName}</strong></div>
          </div>
          </section>

          <section className="print-profile-card" aria-labelledby="print-profile-title">
            <div className="print-profile-heading">
              <span>
                <small>ASISTENTE DE IMPRESIÓN</small>
                <strong id="print-profile-title">Perfil orientativo</strong>
              </span>
              <i className={printProfile.wallIsRecommended ? "ready" : "warning"} aria-hidden="true">
                {printProfile.wallIsRecommended ? "✓" : "!"}
              </i>
            </div>
            <div className="print-profile-fields">
              <label>
                <span>Material</span>
                <select
                  value={materialProfile}
                  onChange={(event) =>
                    setMaterialProfile(event.currentTarget.value as PrintMaterial)
                  }
                >
                  {Object.entries(PRINT_MATERIALS).map(([id, material]) => (
                    <option value={id} key={id}>{material.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Boquilla</span>
                <select
                  value={nozzleSize}
                  onChange={(event) => setNozzleSize(Number(event.currentTarget.value))}
                >
                  <option value="0.2">0,2 mm</option>
                  <option value="0.4">0,4 mm</option>
                  <option value="0.6">0,6 mm</option>
                  <option value="0.8">0,8 mm</option>
                  <option value="1">1,0 mm</option>
                </select>
              </label>
            </div>
            <div className={`print-profile-result ${printProfile.wallIsRecommended ? "ready" : "warning"}`} role="status">
              <strong>Pared recomendada: ≥ {printProfile.recommendedWall} mm</strong>
              <p>{printProfile.wallMessage}</p>
            </div>
            <p className="print-material-note">{printProfile.material.note}</p>
          </section>

          <div className="cost-card">
            <span className="tip-label">ESTIMADOR ARGENTINO</span>
            <div className="cost-total">
              <span>Costo de material</span>
              <strong>${Math.round(estimatedCost).toLocaleString("es-AR")} ARS</strong>
            </div>
            <label>
              <span>Precio del kilo</span>
              <div className="money-input">
                <em>$</em>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={materialPrice}
                  onInput={(event) =>
                    setMaterialPrice(Number(event.currentTarget.value))
                  }
                  aria-label="Precio por kilo de filamento en pesos"
                />
                <small>ARS/kg</small>
              </div>
            </label>
            <label>
              <span>Relleno estimado</span>
              <div className="range-line">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={infill}
                  onInput={(event) => setInfill(Number(event.currentTarget.value))}
                  aria-label="Porcentaje de relleno"
                />
                <strong>{infill}%</strong>
              </div>
            </label>
            <p>Estimación para {activeMaterial.label}; Cura u Orca darán el cálculo final.</p>
          </div>

          <SlicerPanel
            disabled={!canExport}
            slicing={slicing}
            result={sliceResult}
            onSlice={sliceCurrentModel}
          />

          <div className="export-zone">
            <span className="eyebrow">Exportar modelo</span>
            <div className="export-grid">
              <button
                className="button primary export-button"
                onClick={() => void exportModel("stl")}
                disabled={!canExport || Boolean(exporting)}
              >
                <span>STL</span>
                <small>Impresión universal</small>
              </button>
              <button
                className="format-button"
                onClick={() => void exportModel("3mf")}
                disabled={!canExport || Boolean(exporting)}
              >
                <span>3MF</span>
                <small>Proyecto moderno</small>
              </button>
              <button
                className="format-button"
                onClick={() => void exportModel("step")}
                disabled={!canExport || Boolean(exporting)}
              >
                <span>STEP</span>
                <small>Malla facetada</small>
              </button>
            </div>
            <p>
              {exporting
                ? `Generando ${exporting.toUpperCase()}…`
                : "Los archivos se generan localmente en tu navegador."}
            </p>
          </div>

            </>
          )}
        </aside>
        )}
      </section>
      )}
    </div>
  );
}
