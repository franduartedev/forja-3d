import {
  validateModel,
  validateObjects,
  type Cutout,
  type CustomObject,
  type ModelOptions,
  type ModelParameters,
  type TemplateId,
} from "../models";

type FeatureSettings = Omit<ModelOptions, "holes" | "objects">;

export type EditorValidationInput = {
  templateId: TemplateId;
  parameters: ModelParameters;
  holes: Cutout[];
  visibleObjects: CustomObject[];
  featureSettings: FeatureSettings;
};

export function getEditorValidation({
  templateId,
  parameters,
  holes,
  visibleObjects,
  featureSettings,
}: EditorValidationInput) {
  const baseValidation = validateModel(templateId, parameters);
  const featureErrors: string[] = [];

  holes.forEach((hole, index) => {
    if (templateId === "free") return;
    const faceWidth =
      templateId === "box" && hole.face === "front"
        ? parameters.width - parameters.wall * 2
        : parameters.width;
    const faceHeight =
      hole.face === "front" ? parameters.height : parameters.depth;
    const holeHeight = hole.kind === "round" ? hole.width : hole.height;
    const outsideRectangle =
      hole.width <= 0 ||
      holeHeight <= 0 ||
      Math.abs(hole.x) + hole.width / 2 >= faceWidth / 2 ||
      Math.abs(hole.z) + holeHeight / 2 >= faceHeight / 2;
    if (outsideRectangle) {
      featureErrors.push(`El recorte ${index + 1} queda fuera de la cara seleccionada.`);
    }
  });

  if (
    templateId === "free" &&
    visibleObjects.some((object) => object.operation === "hole") &&
    !visibleObjects.some((object) => object.operation !== "hole")
  ) {
    featureErrors.push("Agregá al menos un sólido antes de usar figuras de recorte.");
  }

  featureErrors.push(...validateObjects(visibleObjects));

  if (featureSettings.standoffHole >= featureSettings.standoffDiameter) {
    featureErrors.push("El agujero del soporte debe ser menor que su diámetro exterior.");
  }

  const positiveFeatureValues = [
    featureSettings.lidThickness,
    featureSettings.standoffDiameter,
    featureSettings.standoffHeight,
    featureSettings.standoffHole,
  ];
  if (
    !Number.isFinite(featureSettings.cornerRadius) ||
    featureSettings.cornerRadius < 0 ||
    !Number.isFinite(featureSettings.standoffCount) ||
    featureSettings.standoffCount < 0 ||
    positiveFeatureValues.some(
      (value) => !Number.isFinite(value) || value <= 0,
    ) ||
    !["none", "snap", "screw", "slide"].includes(
      featureSettings.lidStyle,
    )
  ) {
    featureErrors.push("La configuración avanzada contiene valores inválidos.");
  }

  return {
    errors: [...baseValidation.errors, ...featureErrors],
    warnings: baseValidation.warnings,
  };
}
