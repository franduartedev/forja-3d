"use client";

type InspectorNumberFieldProps = {
  label: string;
  value: number;
  unit?: "mm" | "°";
  min?: number | string;
  max?: number | string;
  step?: number | string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export default function InspectorNumberField({
  label,
  value,
  unit,
  min,
  max,
  step,
  disabled,
  onChange,
}: InspectorNumberFieldProps) {
  return (
    <label className="inspector-number-field">
      <span>{label}</span>
      <span className="inspector-number-control">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onInput={(event) => onChange(Number(event.currentTarget.value))}
          aria-label={unit ? `${label} en ${unit}` : label}
        />
        {unit && <em>{unit}</em>}
      </span>
    </label>
  );
}
