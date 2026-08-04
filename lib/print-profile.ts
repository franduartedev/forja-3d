export type PrintMaterial = "pla" | "petg" | "abs";

export const PRINT_MATERIALS: Record<
  PrintMaterial,
  { label: string; density: number; note: string }
> = {
  pla: {
    label: "PLA",
    density: 1.24,
    note: "La opción más simple para piezas generales y prototipos.",
  },
  petg: {
    label: "PETG",
    density: 1.27,
    note: "Más resistente al uso y al calor; cuidá puentes y tolerancias.",
  },
  abs: {
    label: "ABS",
    density: 1.04,
    note: "Requiere buena ventilación y, preferentemente, cámara cerrada.",
  },
};

export function getPrintProfile({
  material,
  nozzleSize,
  minimumWall,
}: {
  material: PrintMaterial;
  nozzleSize: number;
  minimumWall: number;
}) {
  const safeNozzle = Number.isFinite(nozzleSize) && nozzleSize > 0
    ? nozzleSize
    : 0.4;
  const recommendedWall = Number((safeNozzle * 2).toFixed(2));
  const wallIsKnown = Number.isFinite(minimumWall) && minimumWall > 0;
  const wallIsRecommended = !wallIsKnown || minimumWall >= recommendedWall;

  return {
    material: PRINT_MATERIALS[material],
    recommendedWall,
    wallIsRecommended,
    wallMessage: wallIsKnown
      ? wallIsRecommended
        ? `El espesor de ${minimumWall} mm admite al menos dos líneas de pared.`
        : `Probá un espesor de ${recommendedWall} mm o mayor para esta boquilla.`
      : `Como referencia, usá paredes de ${recommendedWall} mm o más.`,
  };
}
