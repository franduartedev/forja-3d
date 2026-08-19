"use client";

import type { DragEvent as ReactDragEvent, ReactNode } from "react";
import type { ObjectKind, ObjectOperation, TemplateId } from "../../../lib/models";
import type { FreePresetId } from "../../../lib/shape-library";

type FreeEditorView = "create" | "designs" | "objects";

type ObjectsToolsPanelProps = {
  templateId: TemplateId;
  objectsCount: number;
  open: boolean;
  freeEditorView: FreeEditorView;
  showDesignGallery: boolean;
  freeAddOperation: ObjectOperation;
  canUseCutouts: boolean;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  onFreeEditorViewChange: (view: FreeEditorView) => void;
  onOpenDesignGallery: () => void;
  onFreeAddOperationChange: (operation: ObjectOperation) => void;
  onBeginShapeDrag: (
    event: ReactDragEvent<HTMLButtonElement>,
    kind: ObjectKind,
  ) => void;
  onShapeDragEnd: () => void;
  onAddFreeObject: (kind: ObjectKind) => void;
  onAddFreePreset: (preset: FreePresetId) => void;
  onAddObject: (kind: ObjectKind) => void;
};

const FREE_EDITOR_TABS: Array<[FreeEditorView, string, string]> = [
  ["create", "+", "Biblioteca"],
  ["designs", "◆", "Diseños"],
  ["objects", "≡", "Capas"],
];

const SHAPES: Array<{
  kind: ObjectKind;
  solidIcon: string;
  holeIcon: string;
  label: string;
  detail: string;
}> = [
  { kind: "cube", solidIcon: "■", holeIcon: "□", label: "Cubo", detail: "Cajas y bases" },
  { kind: "cylinder", solidIcon: "●", holeIcon: "○", label: "Cilindro", detail: "Tubos y perforaciones" },
  { kind: "sphere", solidIcon: "◉", holeIcon: "◎", label: "Esfera", detail: "Volúmenes redondos" },
  { kind: "cone", solidIcon: "▲", holeIcon: "▲", label: "Cono", detail: "Puntas y embudos" },
  { kind: "tube", solidIcon: "◍", holeIcon: "◍", label: "Tubo", detail: "Aros y separadores" },
  { kind: "wedge", solidIcon: "◢", holeIcon: "◢", label: "Cuña", detail: "Rampas y apoyos" },
  { kind: "text", solidIcon: "T", holeIcon: "T", label: "Texto", detail: "Relieve o grabado" },
];

export default function ObjectsToolsPanel({
  templateId,
  objectsCount,
  open,
  freeEditorView,
  showDesignGallery,
  freeAddOperation,
  canUseCutouts,
  children,
  onOpenChange,
  onFreeEditorViewChange,
  onOpenDesignGallery,
  onFreeAddOperationChange,
  onBeginShapeDrag,
  onShapeDragEnd,
  onAddFreeObject,
  onAddFreePreset,
  onAddObject,
}: ObjectsToolsPanelProps) {
  return (
    <details
      className="tool-section"
      open={open}
      onToggle={(event) => {
        onOpenChange(event.currentTarget.open);
      }}
    >
      <summary>
        <span><b>{templateId === "free" ? "02" : "04"}</b> {
          templateId === "free" ? "Herramientas" : "Figuras y texto"
        }</span>
        <small>{objectsCount}</small>
      </summary>
      {templateId === "free" ? (
        <div className="free-workbench">
          <div className="free-editor-nav" aria-label="Secciones del editor libre">
            {FREE_EDITOR_TABS.map(([view, icon, label]) => (
              <button
                key={view}
                className={
                  view === "designs"
                    ? showDesignGallery ? "active" : ""
                    : freeEditorView === view ? "active" : ""
                }
                onClick={() =>
                  view === "designs"
                    ? onOpenDesignGallery()
                    : onFreeEditorViewChange(view)
                }
                disabled={view === "objects" && objectsCount === 0}
                aria-label={`${label}${view === "objects" ? `, ${objectsCount} objetos` : ""}`}
                aria-pressed={
                  view === "designs" ? showDesignGallery : freeEditorView === view
                }
                title={label}
              >
                <i>{icon}</i>
                <span>{label}</span>
                {view === "objects" && objectsCount > 0 && (
                  <small>{objectsCount}</small>
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
                  onClick={() => onFreeAddOperationChange("solid")}
                  aria-pressed={freeAddOperation === "solid"}
                >
                  <i className="solid-dot" />
                  <span><strong>Sólido</strong><small>Agrega material</small></span>
                </button>
                <button
                  className={freeAddOperation === "hole" ? "active hole" : ""}
                  onClick={() => onFreeAddOperationChange("hole")}
                  disabled={!canUseCutouts}
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
                {SHAPES.map((shape) => (
                  <button
                    draggable
                    onDragStart={(event) => onBeginShapeDrag(event, shape.kind)}
                    onDragEnd={onShapeDragEnd}
                    onClick={() => onAddFreeObject(shape.kind)}
                    key={shape.kind}
                  >
                    <i>{freeAddOperation === "hole" ? shape.holeIcon : shape.solidIcon}</i>
                    <span><strong>{shape.label}</strong><small>{shape.detail}</small></span>
                  </button>
                ))}
              </div>
              {!canUseCutouts && (
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
                  <button onClick={() => onAddFreePreset("plate")}>
                    <i>▬</i><span>Placa</span>
                  </button>
                  <button onClick={() => onAddFreePreset("post")}>
                    <i>▮</i><span>Poste</span>
                  </button>
                  <button onClick={() => onAddFreePreset("washer")}>
                    <i>◎</i><span>Arandela</span>
                  </button>
                  <button onClick={() => onAddFreePreset("spacer")}>
                    <i>◌</i><span>Separador</span>
                  </button>
                  <button onClick={() => onAddFreePreset("mounting-tab")}>
                    <i>◫</i><span>Oreja</span>
                  </button>
                  <button onClick={() => onAddFreePreset("foot")}>
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
                <small>Elegí una pieza editable si no querés empezar desde cero.</small>
              </div>
              <button className="open-design-gallery" onClick={onOpenDesignGallery}>
                Abrir diseños editables
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="shape-palette" aria-label="Agregar figuras y texto">
          <button onClick={() => onAddObject("cube")}><i>■</i><span>Cubo</span></button>
          <button onClick={() => onAddObject("cylinder")}><i>●</i><span>Cilindro</span></button>
          <button onClick={() => onAddObject("sphere")}><i>◉</i><span>Esfera</span></button>
          <button onClick={() => onAddObject("text")}><i>T</i><span>Texto</span></button>
        </div>
      )}
      {children}
    </details>
  );
}
