"use client";

import type { ReactNode } from "react";
import type { Cutout, TemplateId } from "../../../lib/models";

type CutoutsPanelProps = {
  templateId: TemplateId;
  holesCount: number;
  cutoutFace: Cutout["face"];
  cutoutTool: Cutout["kind"] | null;
  selectedFaceHole: Cutout | null;
  placementEditor: ReactNode;
  onChooseFace: (face: Cutout["face"]) => void;
  onToggleTool: (tool: Cutout["kind"]) => void;
  onUpdateHole: (key: keyof Cutout, value: string | number) => void;
  onDuplicateSelectedHole: () => void;
  onDeleteSelectedHole: () => void;
};

export default function CutoutsPanel({
  templateId,
  holesCount,
  cutoutFace,
  cutoutTool,
  selectedFaceHole,
  placementEditor,
  onChooseFace,
  onToggleTool,
  onUpdateHole,
  onDuplicateSelectedHole,
  onDeleteSelectedHole,
}: CutoutsPanelProps) {
  if (templateId === "free") return null;

  return (
    <details className="tool-section">
      <summary>
        <span><b>03</b> Agujeros y recortes</span>
        <small>{holesCount}</small>
      </summary>
      {(templateId === "box" || templateId === "bracket") && (
        <div className="face-tabs" aria-label="Cara donde editar recortes">
          <button
            className={cutoutFace === "base" ? "active" : ""}
            onClick={() => onChooseFace("base")}
          >
            Base
          </button>
          <button
            className={cutoutFace === "front" ? "active" : ""}
            onClick={() => onChooseFace("front")}
          >
            {templateId === "bracket" ? "Ala vertical" : "Frente"}
          </button>
        </div>
      )}
      <div className="tool-palette" aria-label="Tipo de recorte a colocar">
        <button
          className={cutoutTool === "round" ? "active" : ""}
          onClick={() => onToggleTool("round")}
          aria-pressed={cutoutTool === "round"}
        >
          <i>○</i>
          <span><strong>Agujero</strong><small>Circular</small></span>
        </button>
        <button
          className={cutoutTool === "rect" ? "active" : ""}
          onClick={() => onToggleTool("rect")}
          aria-pressed={cutoutTool === "rect"}
        >
          <i>□</i>
          <span><strong>Recorte</strong><small>Rectangular</small></span>
        </button>
      </div>
      {placementEditor}
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
                  onUpdateHole("x", Number(event.currentTarget.value))
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
                  onUpdateHole("z", Number(event.currentTarget.value))
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
                  onUpdateHole("width", Number(event.currentTarget.value))
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
                    onUpdateHole("height", Number(event.currentTarget.value))
                  }
                  aria-label="Alto del recorte"
                />
              </label>
            )}
          </div>
          <div className="editor-actions">
            <button onClick={onDuplicateSelectedHole}>Duplicar</button>
            <button className="danger-action" onClick={onDeleteSelectedHole}>
              Eliminar
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
