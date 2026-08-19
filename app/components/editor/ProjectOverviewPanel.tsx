"use client";

import type { TemplateDefinition, TemplateId } from "../../../lib/models";

type ProjectOverviewPanelProps = {
  templateId: TemplateId;
  template: TemplateDefinition;
  templates: TemplateDefinition[];
  showReview: boolean;
  projectName: string;
  exportName: string;
  canUndo: boolean;
  canRedo: boolean;
  onProjectNameChange: (value: string) => void;
  onChooseTemplate: (id: TemplateId) => void;
  onUndo: () => void;
  onRedo: () => void;
};

export default function ProjectOverviewPanel({
  templateId,
  template,
  templates,
  showReview,
  projectName,
  exportName,
  canUndo,
  canRedo,
  onProjectNameChange,
  onChooseTemplate,
  onUndo,
  onRedo,
}: ProjectOverviewPanelProps) {
  return templateId === "free" && !showReview ? (
    <div className="free-project-bar">
      <div className="free-project-title">
        <span>EDITOR LIBRE</span>
        <input
          type="text"
          value={projectName}
          maxLength={60}
          onInput={(event) => {
            onProjectNameChange(event.currentTarget.value);
          }}
          aria-label="Nombre del proyecto"
          placeholder="Mi diseño"
          spellCheck={false}
        />
      </div>
      <details className="free-template-switcher">
        <summary>Cambiar plantilla</summary>
        <div>
          {templates.filter((item) => item.id !== "free").map((item) => (
            <button onClick={() => onChooseTemplate(item.id)} key={item.id}>
              <i>{item.icon}</i>
              <span>{item.shortName}</span>
            </button>
          ))}
        </div>
      </details>
      <div className="free-history-tools" aria-label="Historial de cambios">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer (Ctrl+Z)"
        >
          ↶ <span>Deshacer</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Rehacer (Ctrl+Y)"
        >
          ↷ <span>Rehacer</span>
        </button>
      </div>
    </div>
  ) : (
    <div className="project-overview">
      <label className="project-name-field compact-project-name">
        <span>
          <strong>Archivo</strong>
          <small>{exportName}</small>
        </span>
        <span className="file-name-control">
          <input
            type="text"
            value={projectName}
            maxLength={60}
            onInput={(event) => {
              onProjectNameChange(event.currentTarget.value);
            }}
            aria-label="Nombre personalizado del archivo"
            placeholder="mi-pieza-forja"
            spellCheck={false}
          />
          <em>.3D</em>
        </span>
      </label>

      <label className="template-compact-select">
        <span>
          <strong>Plantilla</strong>
          <small>{template.shortName}</small>
        </span>
        <select
          value={templateId}
          onChange={(event) =>
            onChooseTemplate(event.currentTarget.value as TemplateId)
          }
          aria-label="Cambiar plantilla"
        >
          {templates.map((item) => (
            <option value={item.id} key={item.id}>
              {item.shortName}
            </option>
          ))}
        </select>
      </label>
      <div className="project-overview-actions">
        {templates.filter((item) => item.id !== templateId).map((item) => (
          <button
            type="button"
            onClick={() => onChooseTemplate(item.id)}
            key={item.id}
            title={`Usar ${item.name}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.shortName}
          </button>
        ))}
      </div>
    </div>
  );
}
