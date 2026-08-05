"use client";

import { useState } from "react";

import type {
  SliceLayerHeight,
  SliceMaterial,
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
  onSlice: (settings: SlicerSettings) => Promise<void>;
};

export default function SlicerPanel({
  disabled = false,
  slicing = false,
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
