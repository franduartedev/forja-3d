const MATERIAL_DENSITY_G_CM3 = {
  pla: 1.24,
  "pla-plus": 1.24,
  petg: 1.27,
};

function getNumberMatch(gcode, pattern) {
  const match = gcode.match(pattern);

  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);

  return Number.isFinite(value) ? value : null;
}

function parseDurationSeconds(value) {
  if (!value) {
    return null;
  }

  const hoursMatch = value.match(/(\d+)h/);
  const minutesMatch = value.match(/(\d+)m/);
  const secondsMatch = value.match(/(\d+)s/);

  const hours = Number(hoursMatch?.[1] ?? 0);
  const minutes = Number(minutesMatch?.[1] ?? 0);
  const seconds = Number(secondsMatch?.[1] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
}

export function parseGcodeMetadata(gcode, material) {
  const filamentMillimeters = getNumberMatch(
    gcode,
    /;\s*filament used \[mm\]\s*=\s*([\d.]+)/i,
  );

  const filamentVolumeCm3 = getNumberMatch(
    gcode,
    /;\s*filament used \[cm3\]\s*=\s*([\d.]+)/i,
  );

  const timeMatch = gcode.match(
    /;\s*estimated printing time \(normal mode\)\s*=\s*(.+)/i,
  );

  const estimatedPrintTime = timeMatch?.[1]?.trim() ?? null;

  const density = MATERIAL_DENSITY_G_CM3[material] ?? null;

  const filamentGrams =
    filamentVolumeCm3 !== null && density !== null
      ? filamentVolumeCm3 * density
      : null;

  return {
    estimatedPrintTime,
    estimatedPrintTimeSeconds:
      parseDurationSeconds(estimatedPrintTime),
    filamentMillimeters,
    filamentMeters:
      filamentMillimeters === null
        ? null
        : filamentMillimeters / 1000,
    filamentVolumeCm3,
    filamentGrams,
  };
}
