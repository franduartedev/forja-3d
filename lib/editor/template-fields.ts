import type { ModelParameters, ParameterDefinition } from "../models";

export type TemplateFieldGroups = {
  primaryFields: ParameterDefinition[];
  secondaryFields: ParameterDefinition[];
  primaryFieldsPreview: Array<{
    key: string;
    label: string;
    value: number;
  }>;
};

export function getTemplateFieldGroups(
  fields: ParameterDefinition[],
  primaryMeasureKeys: string[],
  parameters: ModelParameters,
): TemplateFieldGroups {
  const primaryMeasureKeySet = new Set(primaryMeasureKeys);
  const primaryFields = fields.filter((field) =>
    primaryMeasureKeySet.has(field.key),
  );
  const secondaryFields = fields.filter(
    (field) => !primaryMeasureKeySet.has(field.key),
  );
  const primaryFieldsPreview = primaryFields.slice(0, 4).map((field) => ({
    key: field.key,
    label: field.label,
    value: parameters[field.key],
  }));

  return {
    primaryFields,
    secondaryFields,
    primaryFieldsPreview,
  };
}
