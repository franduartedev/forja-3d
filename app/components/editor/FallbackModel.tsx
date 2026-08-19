"use client";

import type { ModelParameters, TemplateId } from "../../../lib/models";

type FallbackModelProps = {
  templateId: TemplateId;
  parameters: ModelParameters;
  onRetry: () => void;
};

export default function FallbackModel({
  templateId,
  parameters,
  onRetry,
}: FallbackModelProps) {
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
