"use client";

import type { LidStyle, ModelOptions, TemplateId } from "../../../lib/models";

type FeatureSettings = Omit<ModelOptions, "holes" | "objects">;

type FabricationSettingsPanelProps = {
  templateId: TemplateId;
  featureSettings: FeatureSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeatureChange: (
    key: keyof FeatureSettings,
    value: FeatureSettings[keyof FeatureSettings],
  ) => void;
};

export default function FabricationSettingsPanel({
  templateId,
  featureSettings,
  open,
  onOpenChange,
  onFeatureChange,
}: FabricationSettingsPanelProps) {
  if (templateId === "free") return null;

  return (
    <details
      className="tool-section"
      open={open}
      onToggle={(event) => {
        onOpenChange(event.currentTarget.open);
      }}
    >
      <summary>
        <span><b>02</b> Detalles de fabricación</span>
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
                onFeatureChange("cornerRadius", Number(event.currentTarget.value))
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
                onFeatureChange("lidStyle", event.target.value as LidStyle)
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
                    onFeatureChange(
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
                onFeatureChange("standoffCount", Number(event.target.value))
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
                    onFeatureChange(
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
                    onFeatureChange(
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
                    onFeatureChange(
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
  );
}
