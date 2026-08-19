"use client";

import type { ParameterDefinition } from "../../../lib/models";

type ParameterFieldProps = {
  field: ParameterDefinition;
  value: number;
  featured?: boolean;
  onChange: (value: string) => void;
};

export default function ParameterField({
  field,
  value,
  featured = false,
  onChange,
}: ParameterFieldProps) {
  return (
    <label className={`field ${featured ? "primary-measure" : ""}`}>
      <span>
        <strong>{field.label}</strong>
        <small>{field.hint}</small>
      </span>
      <span className="number-control">
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
          aria-label={`${field.label} en milímetros`}
        />
        <em>mm</em>
      </span>
    </label>
  );
}
