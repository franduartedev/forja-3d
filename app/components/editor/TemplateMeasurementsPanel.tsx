"use client";

import type {
  ModelParameters,
  ParameterDefinition,
  TemplateId,
} from "../../../lib/models";
import ParameterField from "./ParameterField";

type TemplatePreset = {
  id: string;
  name: string;
  detail: string;
  parameters: ModelParameters;
};

type TemplateMeasurementsPanelProps = {
  templateId: TemplateId;
  parameters: ModelParameters;
  primaryFields: ParameterDefinition[];
  secondaryFields: ParameterDefinition[];
  presets: TemplatePreset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParameterChange: (key: string, value: string) => void;
  onApplyPreset: (preset: TemplatePreset) => void;
  onEditInFreeMode: () => void;
};

export default function TemplateMeasurementsPanel({
  templateId,
  parameters,
  primaryFields,
  secondaryFields,
  presets,
  open,
  onOpenChange,
  onParameterChange,
  onApplyPreset,
  onEditInFreeMode,
}: TemplateMeasurementsPanelProps) {
  return (
    <details
      className="tool-section"
      open={open}
      onToggle={(event) => {
        onOpenChange(event.currentTarget.open);
      }}
    >
      <summary>
        <span><b>01</b> {templateId === "free" ? "Lienzo y medidas" : "Medidas de la pieza"}</span>
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
            {presets.map((preset) => {
              const isActive = Object.entries(preset.parameters).every(
                ([key, value]) => parameters[key] === value,
              );
              return (
                <button
                  className={isActive ? "active" : ""}
                  onClick={() => onApplyPreset(preset)}
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
      <div className="primary-measure-block">
        <div className="measure-block-heading">
          <strong>Medidas principales</strong>
          <small>Lo mínimo para ajustar la pieza rápido.</small>
        </div>
        <div className="fields primary-fields">
          {primaryFields.map((field) => (
            <ParameterField
              field={field}
              value={parameters[field.key]}
              featured
              onChange={(value) => onParameterChange(field.key, value)}
              key={`${templateId}-${field.key}`}
            />
          ))}
        </div>
      </div>
      {secondaryFields.length > 0 && (
        <details className="secondary-measures">
          <summary>Más medidas</summary>
          <div className="fields">
            {secondaryFields.map((field) => (
              <ParameterField
                field={field}
                value={parameters[field.key]}
                onChange={(value) => onParameterChange(field.key, value)}
                key={`${templateId}-${field.key}`}
              />
            ))}
          </div>
        </details>
      )}
      {templateId !== "free" && (
        <button
          className="edit-in-free-action"
          onClick={onEditInFreeMode}
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
  );
}
