import * as THREE from "three";

export type PrintOrientationResult = {
  geometries: THREE.BufferGeometry[];
  transform: THREE.Matrix4;
};

function boundsOf(geometries: THREE.BufferGeometry[]) {
  const bounds = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
  });
  return bounds;
}

export function orientGeometriesForPrint(
  sourceGeometries: THREE.BufferGeometry[],
): PrintOrientationResult {
  const geometries = sourceGeometries.map((geometry) => geometry.clone());
  const transform = new THREE.Matrix4();
  if (!geometries.length) return { geometries, transform };

  const sourceBounds = boundsOf(geometries);
  const floorInForjaSpace = new THREE.Matrix4().makeTranslation(
    0,
    -sourceBounds.min.y,
    0,
  );
  const yUpToZUp = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const initialTransform = yUpToZUp.clone().multiply(floorInForjaSpace);
  geometries.forEach((geometry) => geometry.applyMatrix4(initialTransform));

  const rotatedBounds = boundsOf(geometries);
  const floorInPrintSpace = new THREE.Matrix4().makeTranslation(
    0,
    0,
    -rotatedBounds.min.z,
  );
  geometries.forEach((geometry) => {
    geometry.applyMatrix4(floorInPrintSpace);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  });
  transform.multiplyMatrices(floorInPrintSpace, initialTransform);
  return { geometries, transform };
}
