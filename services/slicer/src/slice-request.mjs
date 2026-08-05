export const MAX_STL_BYTES = 50 * 1024 * 1024;

export const ALLOWED_PRINTER_PROFILES = ["biqu-b1-0.4"];
export const ALLOWED_MATERIALS = ["pla", "pla-plus", "petg"];
export const ALLOWED_LAYER_HEIGHTS = [0.12, 0.2, 0.28];

export class SliceRequestError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "SliceRequestError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requireTextField(formData, fieldName) {
  const value = formData.get(fieldName);

  if (typeof value !== "string" || value.trim() === "") {
    throw new SliceRequestError(
      "INVALID_REQUEST",
      `Falta el campo ${fieldName}.`,
    );
  }

  return value.trim();
}

function parseNumberField(formData, fieldName) {
  const rawValue = requireTextField(formData, fieldName);
  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new SliceRequestError(
      "INVALID_REQUEST",
      `El campo ${fieldName} debe ser numérico.`,
    );
  }

  return value;
}

function parseBooleanField(formData, fieldName) {
  const rawValue = requireTextField(formData, fieldName);

  if (rawValue === "true") return true;
  if (rawValue === "false") return false;

  throw new SliceRequestError(
    "INVALID_REQUEST",
    `El campo ${fieldName} debe ser true o false.`,
  );
}

function validateFile(file) {
  if (
    !file ||
    typeof file === "string" ||
    typeof file.arrayBuffer !== "function"
  ) {
    throw new SliceRequestError(
      "INVALID_FILE",
      "Debés adjuntar un archivo STL en el campo file.",
    );
  }

  const fileName = file.name?.toLowerCase() ?? "";

  if (!fileName.endsWith(".stl")) {
    throw new SliceRequestError(
      "INVALID_FILE",
      "El archivo debe tener extensión .stl.",
    );
  }

  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw new SliceRequestError(
      "INVALID_FILE",
      "El archivo STL está vacío.",
    );
  }

  if (file.size > MAX_STL_BYTES) {
    throw new SliceRequestError(
      "FILE_TOO_LARGE",
      "El archivo STL supera el límite de 50 MB.",
      413,
    );
  }

  return file;
}

export function validateSliceFormData(formData) {
  const file = validateFile(formData.get("file"));
  const printerProfileId = requireTextField(
    formData,
    "printerProfileId",
  );
  const layerHeightMm = parseNumberField(formData, "layerHeightMm");
  const infillPercent = parseNumberField(formData, "infillPercent");
  const supports = parseBooleanField(formData, "supports");
  const material = requireTextField(formData, "material");

  if (!ALLOWED_PRINTER_PROFILES.includes(printerProfileId)) {
    throw new SliceRequestError(
      "INVALID_PRINTER_PROFILE",
      "El perfil de impresora no está habilitado.",
    );
  }

  if (!ALLOWED_LAYER_HEIGHTS.includes(layerHeightMm)) {
    throw new SliceRequestError(
      "INVALID_LAYER_HEIGHT",
      "La altura de capa debe ser 0.12, 0.2 o 0.28 mm.",
    );
  }

  if (
    !Number.isInteger(infillPercent) ||
    infillPercent < 0 ||
    infillPercent > 100
  ) {
    throw new SliceRequestError(
      "INVALID_INFILL",
      "El relleno debe ser un número entero entre 0 y 100.",
    );
  }

  if (!ALLOWED_MATERIALS.includes(material)) {
    throw new SliceRequestError(
      "INVALID_MATERIAL",
      "El material seleccionado no está habilitado.",
    );
  }

  return {
    file,
    settings: {
      printerProfileId,
      layerHeightMm,
      infillPercent,
      supports,
      material,
    },
  };
}
