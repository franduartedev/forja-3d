import type { CustomObject } from "./models";

export function cloneObjects(objects: CustomObject[]) {
  return objects.map((object) => ({ ...object }));
}

export function normalizeObjectSelection(
  objects: CustomObject[],
  selectedIds: string[],
) {
  const validIds = new Set(objects.map((object) => object.id));
  const selection = selectedIds.filter(
    (id, index) => validIds.has(id) && selectedIds.indexOf(id) === index,
  );
  const normalized =
    selection.length > 0
      ? selection
      : objects[0]
        ? [objects[0].id]
        : [];

  return {
    selectedIds: normalized,
    selectedId: normalized.at(-1) ?? null,
  };
}

export function patchObjectSelection(
  objects: CustomObject[],
  sourceId: string,
  patch: Partial<CustomObject>,
  selectedIds: string[],
  moveGroup: boolean,
) {
  const source = objects.find((object) => object.id === sourceId);
  if (!source || source.locked) return objects;
  const selectedSet = new Set(selectedIds);
  const shouldMoveGroup =
    moveGroup &&
    selectedSet.size > 1 &&
    selectedSet.has(sourceId) &&
    true;

  if (!shouldMoveGroup) {
    return objects.map((object) =>
      object.id === sourceId ? { ...object, ...patch } : object,
    );
  }

  const deltaX = patch.x === undefined ? 0 : patch.x - source.x;
  const deltaY = patch.y === undefined ? 0 : patch.y - source.y;
  const deltaZ = patch.z === undefined ? 0 : patch.z - source.z;

  return objects.map((object) =>
    selectedSet.has(object.id) && !object.locked
      ? {
          ...object,
          x: object.x + deltaX,
          y: object.y + deltaY,
          z: object.z + deltaZ,
        }
      : object,
  );
}

export function alignObjectSelection(
  objects: CustomObject[],
  selectedIds: string[],
  axis: "x" | "z" | "floor",
) {
  const selectedSet = new Set(selectedIds);
  const selected = objects.filter(
    (object) => selectedSet.has(object.id) && !object.locked,
  );
  if (selected.length < 2) return objects;

  const target =
    axis === "floor"
      ? 0
      : selected.reduce((sum, object) => sum + object[axis], 0) /
        selected.length;

  return objects.map((object) => {
    if (!selectedSet.has(object.id) || object.locked) return object;
    return axis === "floor"
      ? { ...object, y: 0 }
      : { ...object, [axis]: Number(target.toFixed(2)) };
  });
}

export function distributeObjectSelection(
  objects: CustomObject[],
  selectedIds: string[],
  axis: "x" | "z",
) {
  const selectedSet = new Set(selectedIds);
  const selected = objects
    .filter((object) => selectedSet.has(object.id) && !object.locked)
    .sort((first, second) => first[axis] - second[axis]);
  if (selected.length < 3) return objects;

  const start = selected[0][axis];
  const end = selected.at(-1)?.[axis] ?? start;
  const spacing = (end - start) / (selected.length - 1);
  const positions = new Map(
    selected.map((object, index) => [
      object.id,
      Number((start + spacing * index).toFixed(2)),
    ]),
  );

  return objects.map((object) => {
    const position = positions.get(object.id);
    return position === undefined
      ? object
      : { ...object, [axis]: position };
  });
}

export function reorderObject(
  objects: CustomObject[],
  id: string,
  direction: "up" | "down",
) {
  const index = objects.findIndex((object) => object.id === id);
  if (index < 0) return objects;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= objects.length) return objects;
  const next = [...objects];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
