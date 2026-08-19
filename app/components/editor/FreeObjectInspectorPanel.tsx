"use client";

import type { CustomObject, ObjectOperation } from "../../../lib/models";
import InspectorNumberField from "./InspectorNumberField";

type TransformMode = "select" | "translate" | "rotate" | "scale";

type FreeObjectInspectorPanelProps = {
  selectedObject: CustomObject | null;
  selectedObjectIds: string[];
  freeTransformMode: TransformMode;
  selectedObjectKindLabel: string | null;
  selectedObjectDescription: string | null;
  canExport: boolean;
  volumeCm3: number;
  onTransformModeChange: (mode: TransformMode) => void;
  onAlignSelectedObjects: (axis: "x" | "z" | "floor") => void;
  onDistributeSelectedObjects: (axis: "x" | "z") => void;
  onDuplicateSelectedObject: () => void;
  onDeleteSelectedObject: () => void;
  onUpdateObject: (
    key: keyof CustomObject,
    value: string | number | boolean,
  ) => void;
  onUpdateObjectById: (id: string, patch: Partial<CustomObject>) => void;
  onToggleObjectState: (id: string, key: "hidden" | "locked") => void;
  onOpenLibrary: () => void;
  onOpenDesignGallery: () => void;
};

export default function FreeObjectInspectorPanel({
  selectedObject,
  selectedObjectIds,
  freeTransformMode,
  selectedObjectKindLabel,
  selectedObjectDescription,
  canExport,
  volumeCm3,
  onTransformModeChange,
  onAlignSelectedObjects,
  onDistributeSelectedObjects,
  onDuplicateSelectedObject,
  onDeleteSelectedObject,
  onUpdateObject,
  onUpdateObjectById,
  onToggleObjectState,
  onOpenLibrary,
  onOpenDesignGallery,
}: FreeObjectInspectorPanelProps) {
  return (
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
            <button onClick={() => onAlignSelectedObjects("x")}>Alinear X</button>
            <button onClick={() => onAlignSelectedObjects("z")}>Alinear Z</button>
            <button onClick={() => onAlignSelectedObjects("floor")}>Al piso</button>
            <button
              onClick={() => onDistributeSelectedObjects("x")}
              disabled={selectedObjectIds.length < 3}
            >
              Distribuir X
            </button>
            <button
              onClick={() => onDistributeSelectedObjects("z")}
              disabled={selectedObjectIds.length < 3}
            >
              Distribuir Z
            </button>
          </div>
          <p>
            Los objetos bloqueados conservan su posición y no se eliminan.
          </p>
          <div className="editor-actions">
            <button onClick={onDuplicateSelectedObject}>Duplicar grupo</button>
            <button className="danger-action" onClick={onDeleteSelectedObject}>
              Eliminar grupo
            </button>
          </div>
        </div>
      ) : selectedObject ? (
        <div className="free-inspector-content">
          <section className="inspector-object-summary" aria-label="Objeto seleccionado">
            <div className="inspector-object-title">
              <i
                className={
                  selectedObject.operation === "hole"
                    ? "hole-dot"
                    : "solid-dot"
                }
                aria-hidden="true"
              />
              <div>
                <span>Objeto seleccionado</span>
                <h2>{selectedObject.name}</h2>
                <p>
                  {selectedObjectKindLabel} ·{" "}
                  {selectedObject.operation === "hole" ? "Recorte" : "Sólido"}
                </p>
              </div>
            </div>
            <p>{selectedObjectDescription}</p>
            <div className="inspector-state-chips" aria-label="Estado del objeto">
              {selectedObject.hidden && <span>Oculto</span>}
              {selectedObject.locked && <span>Bloqueado</span>}
              {!selectedObject.hidden && !selectedObject.locked && <span>Editable</span>}
            </div>
          </section>

          {selectedObject.locked && (
            <p className="inspector-lock-note">
              Este objeto está bloqueado. Desbloquealo para editarlo.
            </p>
          )}

          <section className="inspector-section priority-section" aria-labelledby="inspector-size-title">
            <div className="inspector-section-heading">
              <div>
                <span>Medidas</span>
                <strong id="inspector-size-title">Tamaño del objeto</strong>
              </div>
              <button
                className={freeTransformMode === "scale" ? "active" : ""}
                onClick={() => onTransformModeChange("scale")}
                disabled={selectedObject.locked}
              >
                Usar tamaño en visor
              </button>
            </div>
            <div className="inspector-field-grid">
              <InspectorNumberField
                label={
                  selectedObject.kind === "text"
                    ? "Tamaño"
                    : selectedObject.kind === "tube"
                      ? "Ø exterior"
                      : selectedObject.kind === "cylinder" ||
                          selectedObject.kind === "cone" ||
                          selectedObject.kind === "sphere"
                        ? "Diámetro"
                        : "Ancho"
                }
                value={selectedObject.width}
                unit="mm"
                min="1"
                step="0.5"
                disabled={selectedObject.locked}
                onChange={(value) => onUpdateObject("width", value)}
              />
              {(selectedObject.kind === "cube" ||
                selectedObject.kind === "wedge" ||
                selectedObject.kind === "tube") && (
                <InspectorNumberField
                  label={
                    selectedObject.kind === "tube"
                      ? "Ø interior"
                      : "Profundidad"
                  }
                  value={selectedObject.depth}
                  unit="mm"
                  min={selectedObject.kind === "tube" ? 0.5 : 1}
                  max={
                    selectedObject.kind === "tube"
                      ? Math.max(0.5, selectedObject.width - 0.5)
                      : undefined
                  }
                  step="0.5"
                  disabled={selectedObject.locked}
                  onChange={(value) => onUpdateObject("depth", value)}
                />
              )}
              {selectedObject.kind !== "sphere" && (
                <InspectorNumberField
                  label={selectedObject.kind === "text" ? "Relieve" : "Altura"}
                  value={selectedObject.height}
                  unit="mm"
                  min="0.6"
                  step="0.2"
                  disabled={selectedObject.locked}
                  onChange={(value) => onUpdateObject("height", value)}
                />
              )}
            </div>
          </section>

          <section className="inspector-section" aria-labelledby="inspector-position-title">
            <div className="inspector-section-heading">
              <div>
                <span>Posición</span>
                <strong id="inspector-position-title">Ubicación en la pieza</strong>
              </div>
              <button
                className={freeTransformMode === "translate" ? "active" : ""}
                onClick={() => onTransformModeChange("translate")}
                disabled={selectedObject.locked}
              >
                Usar mover en visor
              </button>
            </div>
            <div className="inspector-field-grid">
              <InspectorNumberField
                label="X"
                value={selectedObject.x}
                unit="mm"
                step="0.5"
                disabled={selectedObject.locked}
                onChange={(value) => onUpdateObject("x", value)}
              />
              <InspectorNumberField
                label="Y"
                value={selectedObject.y}
                unit="mm"
                step="0.5"
                disabled={selectedObject.locked}
                onChange={(value) => onUpdateObject("y", value)}
              />
              <InspectorNumberField
                label="Z"
                value={selectedObject.z}
                unit="mm"
                step="0.5"
                disabled={selectedObject.locked}
                onChange={(value) => onUpdateObject("z", value)}
              />
            </div>
            <div className="free-quick-actions">
              <button
                disabled={selectedObject.locked}
                onClick={() => onUpdateObject("y", 0)}
              >
                Apoyar en piso
              </button>
              <button
                disabled={selectedObject.locked}
                onClick={() =>
                  onUpdateObjectById(selectedObject.id, { x: 0, z: 0 })
                }
              >
                Centrar X/Z
              </button>
            </div>
          </section>

          {selectedObject.kind !== "sphere" && (
            <details className="inspector-section inspector-details">
              <summary>
                <span>
                  <small>Rotación</small>
                  <strong>Giro por eje</strong>
                </span>
                <b>⌄</b>
              </summary>
              <div className="inspector-section-heading inline-heading">
                <span>Valores en grados</span>
                <button
                  className={freeTransformMode === "rotate" ? "active" : ""}
                  onClick={() => onTransformModeChange("rotate")}
                  disabled={selectedObject.locked}
                >
                  Usar rotación en visor
                </button>
              </div>
              <div className="inspector-field-grid">
                <InspectorNumberField
                  label="X"
                  value={selectedObject.rotationX ?? 0}
                  unit="°"
                  step="5"
                  disabled={selectedObject.locked}
                  onChange={(value) => onUpdateObject("rotationX", value)}
                />
                <InspectorNumberField
                  label="Y"
                  value={selectedObject.rotation}
                  unit="°"
                  step="5"
                  disabled={selectedObject.locked}
                  onChange={(value) => onUpdateObject("rotation", value)}
                />
                <InspectorNumberField
                  label="Z"
                  value={selectedObject.rotationZ ?? 0}
                  unit="°"
                  step="5"
                  disabled={selectedObject.locked}
                  onChange={(value) => onUpdateObject("rotationZ", value)}
                />
              </div>
            </details>
          )}

          <details className="inspector-section inspector-details">
            <summary>
              <span>
                <small>Más opciones</small>
                <strong>Nombre y operación</strong>
              </span>
              <b>⌄</b>
            </summary>
            <label className="inspector-name-field">
              <span>Nombre</span>
              <input
                type="text"
                value={selectedObject.name}
                maxLength={40}
                disabled={selectedObject.locked}
                onInput={(event) =>
                  onUpdateObject("name", event.currentTarget.value)
                }
              />
            </label>

            <label className="select-field compact-select operation-field">
              <span>
                <strong>Tipo de objeto</strong>
                <small>Suma material o funciona como recorte</small>
              </span>
              <select
                value={selectedObject.operation ?? "solid"}
                disabled={selectedObject.locked}
                onChange={(event) =>
                  onUpdateObject(
                    "operation",
                    event.target.value as ObjectOperation,
                  )
                }
              >
                <option value="solid">Sólido</option>
                <option value="hole">Recorte</option>
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
                    onUpdateObject("text", event.currentTarget.value)
                  }
                />
              </label>
            )}
          </details>

          <section className="inspector-actions-panel" aria-label="Acciones del objeto">
            <div className="inspector-action-grid">
              <button onClick={onDuplicateSelectedObject}>Duplicar</button>
              <button
                onClick={() =>
                  onToggleObjectState(selectedObject.id, "hidden")
                }
              >
                {selectedObject.hidden ? "Mostrar" : "Ocultar"}
              </button>
              <button
                disabled={selectedObject.locked}
                onClick={() =>
                  onUpdateObject(
                    "operation",
                    selectedObject.operation === "hole" ? "solid" : "hole",
                  )
                }
              >
                {selectedObject.operation === "hole"
                  ? "Convertir en sólido"
                  : "Convertir en recorte"}
              </button>
              <button
                className={selectedObject.locked ? "active" : ""}
                onClick={() =>
                  onToggleObjectState(selectedObject.id, "locked")
                }
              >
                {selectedObject.locked ? "Desbloquear" : "Bloquear"}
              </button>
            </div>
            <button
              className="danger-action inspector-delete-action"
              onClick={onDeleteSelectedObject}
              disabled={selectedObject.locked}
            >
              Eliminar
            </button>
          </section>
        </div>
      ) : (
        <div className="inspector-empty-state">
          <span>✦</span>
          <strong>No hay nada seleccionado</strong>
          <p>
            Elegí una figura en el visor o en Capas para cambiar su tamaño, posición o tipo.
          </p>
          <div className="inspector-empty-actions">
            <button onClick={onOpenLibrary}>Abrir Biblioteca</button>
            <button onClick={onOpenDesignGallery}>Ver diseños</button>
          </div>
        </div>
      )}

      <div className={`inspector-print-status ${
        canExport ? "ready" : ""
      }`}>
        <span>{canExport ? "✓" : "+"}</span>
        <div>
          <strong>
            {canExport ? "Listo para exportar" : "Agregá una forma visible"}
          </strong>
          <small>{volumeCm3.toFixed(1)} cm³ aproximados</small>
        </div>
      </div>
    </>
  );
}
