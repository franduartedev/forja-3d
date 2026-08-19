"use client";

import type { CustomObject, TemplateId } from "../../../lib/models";

type ObjectLayersPanelProps = {
  templateId: TemplateId;
  objects: CustomObject[];
  visibleSolidCount: number;
  visibleCutoutCount: number;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  onAddObject: () => void;
  onSelectFreeObject: (id: string, additive: boolean) => void;
  onSelectObject: (id: string) => void;
  onToggleObjectState: (id: string, key: "hidden" | "locked") => void;
  onMoveObjectInStack: (id: string, direction: "up" | "down") => void;
};

export default function ObjectLayersPanel({
  templateId,
  objects,
  visibleSolidCount,
  visibleCutoutCount,
  selectedObjectId,
  selectedObjectIds,
  onAddObject,
  onSelectFreeObject,
  onSelectObject,
  onToggleObjectState,
  onMoveObjectInStack,
}: ObjectLayersPanelProps) {
  if (templateId === "free") {
    return (
      <div className="free-object-list" aria-label="Objetos del modelo">
        <div className="free-list-heading">
          <span>
            {visibleSolidCount} sólidos
            <i>·</i>
            {visibleCutoutCount} recortes visibles
          </span>
          <button onClick={onAddObject}>+ Agregar</button>
        </div>
        {objects.map((object, index) => (
          <div
            className={`free-layer-row ${
              selectedObjectIds.includes(object.id) ? "active" : ""
            } ${object.hidden ? "is-hidden" : ""} ${
              object.operation === "hole" ? "is-hole" : "is-solid"
            }`}
            key={object.id}
          >
            <button
              className="free-layer-main"
              onClick={(event) =>
                onSelectFreeObject(
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
                onClick={() => onToggleObjectState(object.id, "hidden")}
                title={object.hidden ? "Mostrar objeto" : "Ocultar objeto"}
                aria-label={object.hidden ? "Mostrar objeto" : "Ocultar objeto"}
              >
                {object.hidden ? "◌" : "◉"}
              </button>
              <button
                onClick={() => onToggleObjectState(object.id, "locked")}
                title={object.locked ? "Desbloquear objeto" : "Bloquear objeto"}
                aria-label={object.locked ? "Desbloquear objeto" : "Bloquear objeto"}
              >
                {object.locked ? "▣" : "▢"}
              </button>
              <button
                onClick={() => onMoveObjectInStack(object.id, "up")}
                disabled={index === 0}
                title="Subir capa"
                aria-label={`Subir ${object.name}`}
              >
                ↑
              </button>
              <button
                onClick={() => onMoveObjectInStack(object.id, "down")}
                disabled={index === objects.length - 1}
                title="Bajar capa"
                aria-label={`Bajar ${object.name}`}
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="object-tabs wide" aria-label="Objetos agregados">
      {objects.map((object) => (
        <button
          className={object.id === selectedObjectId ? "active" : ""}
          onClick={() => onSelectObject(object.id)}
          key={object.id}
        >
          {object.name}
        </button>
      ))}
    </div>
  );
}
