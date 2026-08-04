export type TemplateId = "box" | "bracket" | "plate" | "free";
export type ModelParameters = Record<string, number>;
export type HoleFace = "base" | "front";
export type HoleKind = "round" | "rect";
export type ObjectKind =
  | "cube"
  | "cylinder"
  | "sphere"
  | "cone"
  | "tube"
  | "wedge"
  | "text";
export type ObjectOperation = "solid" | "hole";
export type LidStyle = "none" | "snap" | "screw" | "slide";

export type Cutout = {
  id: string;
  kind: HoleKind;
  face: HoleFace;
  x: number;
  z: number;
  width: number;
  height: number;
};

export type CustomObject = {
  id: string;
  kind: ObjectKind;
  name: string;
  hidden?: boolean;
  locked?: boolean;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  rotationX?: number;
  rotationZ?: number;
  cornerRadius?: number;
  operation?: ObjectOperation;
  text?: string;
};

export type ModelOptions = {
  holes: Cutout[];
  objects: CustomObject[];
  cornerRadius: number;
  lidStyle: LidStyle;
  lidThickness: number;
  standoffCount: number;
  standoffDiameter: number;
  standoffHeight: number;
  standoffHole: number;
};

export type ParameterDefinition = {
  key: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
};

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  fields: ParameterDefinition[];
  defaults: ModelParameters;
  tip: string;
};

const commonSizeFields: ParameterDefinition[] = [
  { key: "width", label: "Ancho exterior", hint: "Eje X", min: 10, max: 235, step: 1 },
  { key: "depth", label: "Profundidad", hint: "Eje Y", min: 10, max: 235, step: 1 },
];

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "box",
    name: "Caja electrónica",
    shortName: "Caja",
    icon: "▣",
    description: "Una caja paramétrica con tapa, recortes y soportes internos.",
    defaults: { width: 80, depth: 50, height: 30, wall: 2, bottom: 2 },
    fields: [
      ...commonSizeFields,
      { key: "height", label: "Altura", hint: "Eje Z", min: 5, max: 270, step: 1 },
      { key: "wall", label: "Espesor de pared", hint: "Recomendado: 2 mm", min: 0.8, max: 8, step: 0.1 },
      { key: "bottom", label: "Espesor de base", hint: "Recomendado: 2 mm", min: 0.8, max: 8, step: 0.1 },
    ],
    tip: "Para comprobar un encastre, imprimí primero una sección pequeña antes de fabricar la caja completa.",
  },
  {
    id: "bracket",
    name: "Soporte en L",
    shortName: "Soporte L",
    icon: "⌞",
    description: "Un soporte reforzado con perforaciones editables.",
    defaults: { width: 60, depth: 35, height: 45, thickness: 4, holeDiameter: 4.5 },
    fields: [
      ...commonSizeFields,
      { key: "height", label: "Altura vertical", hint: "Ala vertical", min: 12, max: 200, step: 1 },
      { key: "thickness", label: "Espesor", hint: "Recomendado: 4 mm", min: 1.2, max: 12, step: 0.1 },
    ],
    tip: "Orientá el soporte según la carga y usá más perímetros si va a soportar peso de manera continua.",
  },
  {
    id: "plate",
    name: "Placa perforada",
    shortName: "Placa",
    icon: "⊙",
    description: "Una base plana con agujeros y objetos configurables.",
    defaults: { width: 90, depth: 60, thickness: 3, holeDiameter: 4, margin: 10 },
    fields: [
      ...commonSizeFields,
      { key: "thickness", label: "Espesor", hint: "Recomendado: 3 mm", min: 0.8, max: 12, step: 0.1 },
    ],
    tip: "Dejá al menos dos diámetros entre el centro del agujero y el borde si la placa va a recibir esfuerzo.",
  },
  {
    id: "free",
    name: "Editor libre",
    shortName: "Libre",
    icon: "✦",
    description: "Un espacio vacío para crear con sólidos y recortes booleanos.",
    defaults: { width: 120, depth: 100 },
    fields: [
      { key: "width", label: "Ancho del lienzo", hint: "Eje X", min: 10, max: 235, step: 1 },
      { key: "depth", label: "Profundidad del lienzo", hint: "Eje Z", min: 10, max: 235, step: 1 },
    ],
    tip: "Usá sólidos para construir y convertí cualquier figura en agujero para restarla del modelo.",
  },
];

export function validateModel(templateId: TemplateId, params: ModelParameters) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const definition = TEMPLATES.find((template) => template.id === templateId);
  const requiredValues = Object.keys(definition?.defaults ?? {}).map(
    (key) => params[key],
  );

  if (
    requiredValues.some(
      (value) => !Number.isFinite(value) || value <= 0,
    )
  ) {
    errors.push("Todas las medidas deben ser mayores que cero.");
  }

  if (templateId === "box") {
    if (params.width - params.wall * 2 <= 0 || params.depth - params.wall * 2 <= 0) {
      errors.push("El espesor ocupa todo el espacio interior.");
    }
    if (params.bottom >= params.height) {
      errors.push("La base debe ser más fina que la altura.");
    }
    if (params.wall < 1.2 || params.bottom < 1.2) {
      warnings.push("Una pared menor a 1,2 mm puede resultar frágil.");
    }
  }

  if (templateId === "bracket") {
    if (params.thickness >= params.depth || params.thickness >= params.height) {
      errors.push("El espesor debe ser menor que las dos alas del soporte.");
    }
    if (params.thickness < 2.4) {
      warnings.push("Un soporte menor a 2,4 mm puede flexionarse bajo carga.");
    }
  }

  if (templateId === "plate") {
    if (params.thickness < 1.2) {
      warnings.push("Una placa menor a 1,2 mm puede resultar frágil.");
    }
  }

  const height = params.height ?? params.thickness;
  if (params.width > 235 || params.depth > 235 || height > 270) {
    warnings.push("La pieza supera el volumen de referencia de 235 × 235 × 270 mm.");
  }

  return { errors, warnings };
}

export function validateObjects(objects: CustomObject[]) {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  objects.forEach((object, index) => {
    const dimensions = [object.width, object.depth, object.height];
    const transforms = [
      object.x,
      object.y,
      object.z,
      object.rotation,
      object.rotationX ?? 0,
      object.rotationZ ?? 0,
    ];
    const cornerRadiusIsValid =
      object.cornerRadius === undefined ||
      (Number.isFinite(object.cornerRadius) && object.cornerRadius >= 0);
    if (
      dimensions.some((value) => !Number.isFinite(value) || value <= 0) ||
      transforms.some((value) => !Number.isFinite(value)) ||
      !cornerRadiusIsValid
    ) {
      errors.push(
        `La figura ${index + 1} tiene medidas o coordenadas inválidas.`,
      );
    }
    if (object.kind === "tube" && object.depth >= object.width) {
      errors.push(
        `El tubo ${index + 1} necesita un diámetro interior menor que el exterior.`,
      );
    }
    if (!object.id || seenIds.has(object.id)) {
      errors.push(`La figura ${index + 1} tiene un identificador duplicado.`);
    }
    seenIds.add(object.id);
  });

  return errors;
}

export function modelVolumeCm3(templateId: TemplateId, params: ModelParameters) {
  if (templateId === "box") {
    const outer = params.width * params.depth * params.height;
    const cavity =
      (params.width - params.wall * 2) *
      (params.depth - params.wall * 2) *
      (params.height - params.bottom);
    return Math.max(0, outer - cavity) / 1000;
  }

  if (templateId === "free") {
    return 0;
  }

  const holeArea = Math.PI * (params.holeDiameter / 2) ** 2;
  if (templateId === "bracket") {
    const solid =
      params.width * params.depth * params.thickness +
      params.width * params.height * params.thickness -
      params.width * params.thickness * params.thickness;
    return Math.max(0, solid - holeArea * params.thickness * 4) / 1000;
  }

  return Math.max(0, (params.width * params.depth - holeArea * 4) * params.thickness) / 1000;
}

export function modelPrimarySpec(templateId: TemplateId, params: ModelParameters) {
  if (templateId === "box") {
    return {
      label: "Interior útil",
      value: `${Math.max(0, params.width - params.wall * 2).toFixed(1)} × ${Math.max(0, params.depth - params.wall * 2).toFixed(1)} mm`,
    };
  }
  if (templateId === "bracket") {
    return { label: "Aletas", value: `${params.depth} × ${params.height} mm` };
  }
  if (templateId === "free") {
    return { label: "Lienzo de trabajo", value: `${params.width} × ${params.depth} mm` };
  }
  return { label: "Superficie útil", value: `${params.width} × ${params.depth} mm` };
}
