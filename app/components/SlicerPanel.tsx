"use client";

import { useState } from "react";

import type {
  SliceLayerHeight,
  SliceMaterial,
  SliceResult,
} from "../../lib/slicer/client";

type SlicerSettings = {
  layerHeightMm: SliceLayerHeight;
  infillPercent: number;
  supports: boolean;
  material: SliceMaterial;
};

type SlicerPanelProps = {
  disabled?: boolean;
  slicing?: boolean;
  result?: SliceResult | null;
  onSlice: (settings: SlicerSettings) => Promise<void>;
};

function formatPrintTime(seconds: number | null) {
  if (seconds === null) {
    return "No disponible";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60);

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }

  if (hours === 0 && remainingSeconds > 0) {
    parts.push(`${remainingSeconds} s`);
  }

  return parts.join(" ") || "Menos de un minuto";
}

function formatNumber(
  value: number | null,
  digits = 2,
) {
  return value === null
    ? "No disponible"
    : value.toFixed(digits);
}

export default function SlicerPanel({
  disabled = false,
  slicing = false,
  result = null,
  onSlice,
}: SlicerPanelProps) {
  const [layerHeightMm, setLayerHeightMm] =
    useState<SliceLayerHeight>(0.2);

  const [infillPercent, setInfillPercent] =
    useState(20);

  const [supports, setSupports] =
    useState(false);

  const [material, setMaterial] =
    useState<SliceMaterial>("pla");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    await onSlice({
      layerHeightMm,
      infillPercent,
      supports,
      material,
    });
  };

  return (
    <form
      className="slicer-panel"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="slicer-panel__header">
        <div>
          <span className="eyebrow">
            Preparar impresión
          </span>

          <h3>Generar G-code</h3>

          <p>
            Laminado inicial optimizado para
            BIQU B1 con boquilla de 0,4 mm.
          </p>
        </div>

        <span className="slicer-panel__printer">
          BIQU B1
        </span>
      </div>

      <div className="slicer-panel__grid">
        <label>
          <span>Material</span>

          <select
            value={material}
            disabled={disabled || slicing}
            onChange={(event) => {
              setMaterial(
                event.target.value as SliceMaterial,
              );
            }}
          >
            <option value="pla">PLA</option>
            <option value="pla-plus">
              PLA+
            </option>
            <option value="petg">PETG</option>
          </select>
        </label>

        <label>
          <span>Calidad</span>

          <select
            value={layerHeightMm}
            disabled={disabled || slicing}
            onChange={(event) => {
              setLayerHeightMm(
                Number(
                  event.target.value,
                ) as SliceLayerHeight,
              );
            }}
          >
            <option value={0.28}>
              Rápida · 0,28 mm
            </option>

            <option value={0.2}>
              Normal · 0,20 mm
            </option>

            <option value={0.12}>
              Detallada · 0,12 mm
            </option>
          </select>
        </label>

        <label>
          <span>Relleno</span>

          <div className="slicer-panel__range">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={infillPercent}
              disabled={disabled || slicing}
              onChange={(event) => {
                setInfillPercent(
                  Number(event.target.value),
                );
              }}
            />

            <strong>
              {infillPercent}%
            </strong>
          </div>
        </label>

        <label className="slicer-panel__toggle">
          <input
            type="checkbox"
            checked={supports}
            disabled={disabled || slicing}
            onChange={(event) => {
              setSupports(
                event.target.checked,
              );
            }}
          />

          <span>
            <strong>Soportes</strong>

            <small>
              Activar para voladizos difíciles.
            </small>
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="button primary"
        disabled={disabled || slicing}
      >
        {slicing
          ? "Laminando modelo…"
          : "Generar y descargar G-code"}
      </button>

      {result ? (
        <section
          className="slicer-panel__result"
          aria-live="polite"
        >
          <div className="slicer-panel__result-header">
            <div>
              <span className="eyebrow">
                Laminado completado
              </span>

              <h4>{result.fileName}</h4>
            </div>

            <strong>Listo para imprimir</strong>
          </div>

          <dl className="slicer-panel__metrics">
            <div>
              <dt>Tiempo estimado</dt>
              <dd>
                {formatPrintTime(
                  result.printTimeSeconds,
                )}
              </dd>
            </div>

            <div>
              <dt>Filamento</dt>
              <dd>
                {formatNumber(
                  result.filamentMeters,
                )}{" "}
                m
              </dd>
            </div>

            <div>
              <dt>Peso estimado</dt>
              <dd>
                {formatNumber(
                  result.filamentGrams,
                  1,
                )}{" "}
                g
              </dd>
            </div>

            <div>
              <dt>Volumen</dt>
              <dd>
                {formatNumber(
                  result.filamentVolumeCm3,
                )}{" "}
                cm³
              </dd>
            </div>
          </dl>

          {result.requestId ? (
            <small>
              Solicitud: {result.requestId}
            </small>
          ) : null}
        </section>
      ) : null}

      {!disabled ? null : (
        <small className="slicer-panel__disabled">
          Agregá al menos un sólido válido para
          generar el archivo.
        </small>
      )}
    </form>
  );
}

export type {
  SlicerSettings,
};
