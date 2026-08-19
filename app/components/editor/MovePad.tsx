"use client";

import { useState } from "react";

type MovePadProps = {
  selected: boolean;
  x: number;
  z: number;
  onMoveBy: (deltaX: number, deltaZ: number) => void;
  onCenter: () => void;
};

export default function MovePad({
  selected,
  x,
  z,
  onMoveBy,
  onCenter,
}: MovePadProps) {
  const [step, setStep] = useState(1);
  return (
    <div className={`move-console ${selected ? "" : "disabled"}`}>
      <div className="move-readout">
        <span>Mover seleccionado</span>
        <strong>{selected ? `X ${x.toFixed(1)} · Z ${z.toFixed(1)}` : "Elegí un elemento"}</strong>
        <label>
          Paso
          <select
            value={step}
            onChange={(event) => setStep(Number(event.target.value))}
            disabled={!selected}
            aria-label="Paso de movimiento en milímetros"
          >
            <option value="0.5">0,5 mm</option>
            <option value="1">1 mm</option>
            <option value="5">5 mm</option>
          </select>
        </label>
      </div>
      <div className="direction-pad" aria-label="Mover elemento con flechas">
        <button disabled={!selected} onClick={() => onMoveBy(0, step)} aria-label="Mover hacia arriba">↑</button>
        <button disabled={!selected} onClick={() => onMoveBy(-step, 0)} aria-label="Mover a la izquierda">←</button>
        <button disabled={!selected} onClick={onCenter} className="center-button" aria-label="Centrar elemento">●</button>
        <button disabled={!selected} onClick={() => onMoveBy(step, 0)} aria-label="Mover a la derecha">→</button>
        <button disabled={!selected} onClick={() => onMoveBy(0, -step)} aria-label="Mover hacia abajo">↓</button>
      </div>
    </div>
  );
}
