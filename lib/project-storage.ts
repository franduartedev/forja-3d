import { TEMPLATES } from "./models";
import type {
  Cutout,
  CustomObject,
  ModelParameters,
  TemplateId,
} from "./models";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function recordValue(source: unknown, key: string) {
  return isRecord(source) ? source[key] : undefined;
}

export function isTemplateId(value: unknown): value is TemplateId {
  return TEMPLATES.some((template) => template.id === value);
}

export function restoreMeasurements(
  saved: unknown,
  defaults: ModelParameters,
) {
  const restored = { ...defaults };
  if (!isRecord(saved)) return restored;

  Object.keys(defaults).forEach((key) => {
    const value = saved[key];
    if (isFiniteNumber(value) && value > 0) restored[key] = value;
  });
  return restored;
}

export function restoreKnownSettings<T extends object>(
  saved: unknown,
  defaults: T,
) {
  const restored = { ...defaults } as Record<string, unknown>;
  if (!isRecord(saved)) return restored as T;

  Object.entries(defaults).forEach(([key, fallback]) => {
    const value = saved[key];
    if (
      typeof value === typeof fallback &&
      (typeof value !== "number" || Number.isFinite(value))
    ) {
      restored[key] = value;
    }
  });
  return restored as T;
}

function isCutout(value: unknown): value is Cutout {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.kind === "round" || value.kind === "rect") &&
    (value.face === "base" || value.face === "front") &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.z) &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.height) &&
    value.height > 0
  );
}

export function restoreCutouts(saved: unknown, defaults: Cutout[]) {
  if (!Array.isArray(saved)) {
    return defaults.map((cutout) => ({ ...cutout }));
  }
  const seenIds = new Set<string>();
  return saved
    .filter(isCutout)
    .filter((cutout) => {
      if (seenIds.has(cutout.id)) return false;
      seenIds.add(cutout.id);
      return true;
    })
    .map((cutout) => ({ ...cutout }));
}

function isCustomObject(value: unknown): value is CustomObject {
  if (!isRecord(value)) return false;
  const kindIsValid = [
    "cube",
    "cylinder",
    "sphere",
    "cone",
    "tube",
    "wedge",
    "text",
  ].includes(String(value.kind));
  const operationIsValid =
    value.operation === undefined ||
    value.operation === "solid" ||
    value.operation === "hole";
  const optionalRotationsAreValid =
    (value.rotationX === undefined || isFiniteNumber(value.rotationX)) &&
    (value.rotationZ === undefined || isFiniteNumber(value.rotationZ));
  const optionalCornerRadiusIsValid =
    value.cornerRadius === undefined ||
    (isFiniteNumber(value.cornerRadius) && value.cornerRadius >= 0);
  const optionalStateIsValid =
    (value.hidden === undefined || typeof value.hidden === "boolean") &&
    (value.locked === undefined || typeof value.locked === "boolean");
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    kindIsValid &&
    operationIsValid &&
    optionalRotationsAreValid &&
    optionalCornerRadiusIsValid &&
    optionalStateIsValid &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.z) &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.depth) &&
    value.depth > 0 &&
    isFiniteNumber(value.height) &&
    value.height > 0 &&
    isFiniteNumber(value.rotation) &&
    (value.text === undefined || typeof value.text === "string")
  );
}

export function restoreObjects(saved: unknown, defaults: CustomObject[]) {
  if (!Array.isArray(saved)) {
    return defaults.map((object) => ({ ...object }));
  }
  const seenIds = new Set<string>();
  return saved
    .filter(isCustomObject)
    .filter((object) => {
      if (seenIds.has(object.id)) return false;
      seenIds.add(object.id);
      return true;
    })
    .map((object) => ({ ...object }));
}
