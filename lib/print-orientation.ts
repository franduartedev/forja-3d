import * as THREE from "three";
import {
  chooseAutoOrientation,
  type OrientationCandidateId,
} from "./print-orientation/auto-orient";

export type { OrientationCandidateId } from "./print-orientation/auto-orient";

export type PrintOrientationResult = {
  geometries: THREE.BufferGeometry[];
  transform: THREE.Matrix4;
  wasAdjusted?: boolean;
  chosenOrientationId?: OrientationCandidateId;
};

function boundsOf(geometries: THREE.BufferGeometry[]) {
  const bounds = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
  });
  return bounds;
}

function transformedBoundsOf(
  geometries: THREE.BufferGeometry[],
  transform: THREE.Matrix4,
) {
  const bounds = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      bounds.union(geometry.boundingBox.clone().applyMatrix4(transform));
    }
  });
  return bounds;
}

export function orientGeometriesForPrint(
  sourceGeometries: THREE.BufferGeometry[],
): PrintOrientationResult {
  const geometries = sourceGeometries.map((geometry) => geometry.clone());
  const transform = new THREE.Matrix4();
  if (!geometries.length) {
    return { geometries, transform };
  }

  const sourceBounds = boundsOf(geometries);
  const floorInForjaSpace = new THREE.Matrix4().makeTranslation(
    0,
    -sourceBounds.min.y,
    0,
  );
  const yUpToZUp = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const initialTransform = yUpToZUp.clone().multiply(floorInForjaSpace);

  const {
    candidateRotation,
    chosenOrientationId,
    wasAdjusted,
  } = chooseAutoOrientation(sourceGeometries, initialTransform);

  const rotatedTransform = candidateRotation.clone().multiply(initialTransform);
  const rotatedBounds = transformedBoundsOf(geometries, rotatedTransform);
  const floorInPrintSpace = new THREE.Matrix4().makeTranslation(
    0,
    0,
    -rotatedBounds.min.z,
  );
  transform.multiplyMatrices(
    floorInPrintSpace,
    rotatedTransform,
  );
  geometries.forEach((geometry) => {
    geometry.applyMatrix4(transform);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  });

  return {
    geometries,
    transform,
    wasAdjusted,
    chosenOrientationId,
  };
}
