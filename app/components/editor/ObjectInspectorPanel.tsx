"use client";

import type { CustomObject, ObjectOperation, TemplateId } from "../../../lib/models";

type TransformMode = "select" | "translate" | "rotate" | "scale";

type ObjectInspectorPanelProps = {
  templateId: TemplateId;
  selectedObject: CustomObject;
  freeTransformMode: TransformMode;
  onUpdateObject: (
    key: keyof CustomObject,
    value: string | number | boolean,
  ) => void;
  onUpdateObjectById: (id: string, patch: Partial<CustomObject>) => void;
  onDuplicateSelectedObject: () => void;
  onDeleteSelectedObject: () => void;
};

export default function ObjectInspectorPanel({
  templateId,
  selectedObject,
  freeTransformMode,
  onUpdateObject,
  onUpdateObjectById,
  onDuplicateSelectedObject,
  onDeleteSelectedObject,
}: ObjectInspectorPanelProps) {
  return (
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
            <strong>Tipo en la pieza</strong>
            <small>Sumá material o usalo como recorte</small>
          </span>
          <select
            value={selectedObject.operation ?? "solid"}
            onChange={(event) =>
              onUpdateObject(
                "operation",
                event.target.value as ObjectOperation,
              )
            }
            aria-label="Tipo del objeto en la pieza"
          >
            <option value="solid">Sólido</option>
            <option value="hole">Recorte</option>
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
              onUpdateObject("text", event.currentTarget.value)
            }
            aria-label="Contenido del texto 3D"
          />
        </label>
      )}
      {templateId === "free" && (
        <div className="property-group-label">
          <span>
            {freeTransformMode === "select"
              ? "Propiedades"
              : freeTransformMode === "translate"
              ? "Posición"
              : freeTransformMode === "rotate"
              ? "Rotación"
              : "Tamaño"}
          </span>
          <small>
            {freeTransformMode === "select"
              ? "Seleccioná una herramienta o editá valores"
              : freeTransformMode === "scale"
              ? "Medidas finales"
              : "Ejes X · Y · Z"}
          </small>
        </div>
      )}
      <div className="mini-grid two">
        {(templateId !== "free" ||
          freeTransformMode === "select" ||
          freeTransformMode === "translate") && (
          <>
        <label>
          <span>Posición X</span>
          <input
            type="number"
            value={selectedObject.x}
            step="0.5"
            onInput={(event) =>
              onUpdateObject("x", Number(event.currentTarget.value))
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
              onUpdateObject("z", Number(event.currentTarget.value))
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
              onUpdateObject("y", Number(event.currentTarget.value))
            }
            aria-label="Altura del objeto sobre la base"
          />
        </label>
          </>
        )}
        {(templateId !== "free" ||
          freeTransformMode === "select" ||
          freeTransformMode === "scale") && (
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
              onUpdateObject("width", Number(event.currentTarget.value))
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
                onUpdateObject("depth", Number(event.currentTarget.value))
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
                onUpdateObject("height", Number(event.currentTarget.value))
              }
            aria-label="Altura del objeto"
          />
        </label>
        )}
          </>
        )}
        {(templateId !== "free" ||
          freeTransformMode === "select" ||
          freeTransformMode === "rotate") && (
          <>
        {selectedObject.kind !== "sphere" && (
          <label>
            <span>Rotación Y</span>
            <input
              type="number"
              value={selectedObject.rotation}
              step="5"
              onInput={(event) =>
                onUpdateObject(
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
                  onUpdateObject(
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
                  onUpdateObject(
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
      {templateId === "free" &&
        (freeTransformMode === "select" ||
          freeTransformMode === "translate") && (
        <div className="free-quick-actions">
          <button onClick={() => onUpdateObject("y", 0)}>Apoyar en piso</button>
          <button
            onClick={() =>
              onUpdateObjectById(selectedObject.id, { x: 0, z: 0 })
            }
          >
            Centrar X/Z
          </button>
        </div>
      )}
      <div className="editor-actions">
        <button onClick={onDuplicateSelectedObject}>Duplicar</button>
        <button className="danger-action" onClick={onDeleteSelectedObject}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
