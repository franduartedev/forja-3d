export type PrinterProfileId = "biqu-b1-0.4";
export type MaterialPresetId = "pla" | "pla-plus" | "petg";
export type QualityPresetId = "draft" | "standard" | "detail";
export type AdhesionMode = "none" | "skirt" | "brim";

export type PrintVolume = {
  width: number;
  depth: number;
  height: number;
};

export type PrinterProfile = {
  id: PrinterProfileId;
  name: string;
  nozzleDiameter: number;
  gcodeFlavor: "marlin";
  volume: PrintVolume;
};

export type MaterialPreset = {
  id: MaterialPresetId;
  name: string;
  nozzleTemperature: number;
  bedTemperature: number;
};

export type QualityPreset = {
  id: QualityPresetId;
  name: string;
  layerHeight: number;
  printSpeed: number;
};

export type SliceSettings = {
  printerId: PrinterProfileId;
  materialId: MaterialPresetId;
  qualityId: QualityPresetId;
  infillPercent: number;
  supports: boolean;
  adhesion: AdhesionMode;
};

export type SliceModelInfo = {
  fileName: string;
  byteLength: number;
  bounds: PrintVolume;
};

export type SliceRequest = {
  schemaVersion: 1;
  model: SliceModelInfo;
  settings: SliceSettings;
};

export type SliceValidation = {
  errors: string[];
  warnings: string[];
};

export const PRINTER_PROFILES: Record<PrinterProfileId, PrinterProfile> = {
  "biqu-b1-0.4": {
    id: "biqu-b1-0.4",
    name: "BIQU B1 · boquilla 0,4 mm",
    nozzleDiameter: 0.4,
    gcodeFlavor: "marlin",
    volume: { width: 235, depth: 235, height: 270 },
  },
};

export const MATERIAL_PRESETS: Record<MaterialPresetId, MaterialPreset> = {
  pla: {
    id: "pla",
    name: "PLA",
    nozzleTemperature: 200,
    bedTemperature: 60,
  },
  "pla-plus": {
    id: "pla-plus",
    name: "PLA+",
    nozzleTemperature: 210,
    bedTemperature: 60,
  },
  petg: {
    id: "petg",
    name: "PETG",
    nozzleTemperature: 235,
    bedTemperature: 75,
  },
};

export const QUALITY_PRESETS: Record<QualityPresetId, QualityPreset> = {
  draft: {
    id: "draft",
    name: "Borrador",
    layerHeight: 0.28,
    printSpeed: 55,
  },
  standard: {
    id: "standard",
    name: "Normal",
    layerHeight: 0.2,
    printSpeed: 45,
  },
  detail: {
    id: "detail",
    name: "Detalle",
    layerHeight: 0.12,
    printSpeed: 35,
  },
};

export const DEFAULT_SLICE_SETTINGS: SliceSettings = {
  printerId: "biqu-b1-0.4",
  materialId: "pla",
  qualityId: "standard",
  infillPercent: 20,
  supports: false,
  adhesion: "skirt",
};

export function validateSliceRequest(request: SliceRequest): SliceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const printer = PRINTER_PROFILES[request.settings.printerId];
  const material = MATERIAL_PRESETS[request.settings.materialId];
  const quality = QUALITY_PRESETS[request.settings.qualityId];
  const { model } = request;

  if (!printer) errors.push("El perfil de impresora no está habilitado.");
  if (!material) errors.push("El material seleccionado no está habilitado.");
  if (!quality) errors.push("La calidad seleccionada no está habilitada.");

  if (
    !Number.isFinite(request.settings.infillPercent) ||
    request.settings.infillPercent < 0 ||
    request.settings.infillPercent > 100
  ) {
    errors.push("El relleno debe estar entre 0% y 100%.");
  }

  const dimensions = [model.bounds.width, model.bounds.depth, model.bounds.height];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    errors.push("El modelo tiene límites inválidos.");
  }

  if (!Number.isInteger(model.byteLength) || model.byteLength <= 0) {
    errors.push("El archivo STL está vacío o es inválido.");
  }

  if (model.byteLength > 25 * 1024 * 1024) {
    errors.push("El archivo supera el límite de 25 MB del laminador.");
  }

  if (printer) {
    if (
      model.bounds.width > printer.volume.width ||
      model.bounds.depth > printer.volume.depth ||
      model.bounds.height > printer.volume.height
    ) {
      errors.push(`El modelo supera el volumen de impresión de ${printer.name}.`);
    }
  }

  if (printer && quality && quality.layerHeight > printer.nozzleDiameter * 0.8) {
    errors.push("La altura de capa es demasiado grande para la boquilla.");
  }

  if (material) {
    if (material.nozzleTemperature > 250 || material.bedTemperature > 90) {
      warnings.push("El perfil usa temperaturas altas; revisá el material antes de imprimir.");
    }
  }

  return { errors, warnings };
}

