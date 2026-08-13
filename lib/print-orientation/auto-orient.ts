import * as THREE from "three";

export type OrientationCandidateId =
  | "baseline"
  | "pos-z-down"
  | "neg-x-down"
  | "pos-x-down"
  | "neg-y-down"
  | "pos-y-down";

export type AutoOrientationChoice = {
  candidateRotation: THREE.Matrix4;
  chosenOrientationId: OrientationCandidateId;
  wasAdjusted: boolean;
};

type CandidateDefinition = {
  id: OrientationCandidateId;
  rotation: THREE.Matrix4;
};

type TriangleMetrics = {
  area: number;
  normal: THREE.Vector3;
  centroid: THREE.Vector3;
  vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
};

type CandidateMetrics = {
  id: OrientationCandidateId;
  contactArea: number;
  stabilityScore: number;
  height: number;
  downwardFacingRatio: number;
  stable: boolean;
  score: number;
};

const CONTACT_Z_EPS = 0.05;
const CONTACT_NORMAL_COS = Math.cos((15 * Math.PI) / 180);
const DOWNWARD_FACE_NORMAL_Z = -Math.cos((45 * Math.PI) / 180);
const MIN_CONTACT_AREA_MM2 = 20;
const PRESERVE_MARGIN = 0.1;

const SCORE_WEIGHTS = {
  contact: 0.3,
  stability: 0.25,
  overhang: 0.2,
  height: 0.05,
  preserve: 0.1,
} as const;

const tempVectorA = new THREE.Vector3();
const tempVectorB = new THREE.Vector3();
const tempVectorC = new THREE.Vector3();
const tempEdgeA = new THREE.Vector3();
const tempEdgeB = new THREE.Vector3();
const tempNormal = new THREE.Vector3();

function boundsOf(geometries: THREE.BufferGeometry[]) {
  const bounds = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
  });
  return bounds;
}

function floorGeometries(geometries: THREE.BufferGeometry[]) {
  const bounds = boundsOf(geometries);
  const offset = -bounds.min.z;
  if (Math.abs(offset) > 0) {
    geometries.forEach((geometry) => {
      geometry.translate(0, 0, offset);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    });
  }
  return new THREE.Matrix4().makeTranslation(0, 0, offset);
}

function forEachTriangle(
  geometry: THREE.BufferGeometry,
  callback: (triangle: TriangleMetrics) => void,
) {
  const position = geometry.getAttribute("position");
  if (!position) return;

  const index = geometry.index;
  const processTriangle = (ia: number, ib: number, ic: number) => {
    tempVectorA.fromBufferAttribute(position, ia);
    tempVectorB.fromBufferAttribute(position, ib);
    tempVectorC.fromBufferAttribute(position, ic);

    tempEdgeA.subVectors(tempVectorB, tempVectorA);
    tempEdgeB.subVectors(tempVectorC, tempVectorA);
    tempNormal.crossVectors(tempEdgeA, tempEdgeB);
    const normalLength = tempNormal.length();
    if (normalLength <= 1e-12) return;

    tempNormal.multiplyScalar(1 / normalLength);
    const area = normalLength * 0.5;
    callback({
      area,
      normal: tempNormal.clone(),
      centroid: new THREE.Vector3()
        .addVectors(tempVectorA, tempVectorB)
        .add(tempVectorC)
        .multiplyScalar(1 / 3),
      vertices: [
        tempVectorA.clone(),
        tempVectorB.clone(),
        tempVectorC.clone(),
      ],
    });
  };

  if (index) {
    for (let triangle = 0; triangle < index.count; triangle += 3) {
      processTriangle(
        index.getX(triangle),
        index.getX(triangle + 1),
        index.getX(triangle + 2),
      );
    }
    return;
  }

  for (let triangle = 0; triangle < position.count; triangle += 3) {
    processTriangle(triangle, triangle + 1, triangle + 2);
  }
}

function computeCenterOfMass(geometries: THREE.BufferGeometry[]) {
  const center = new THREE.Vector3();
  let totalVolume = 0;
  const origin = new THREE.Vector3();

  geometries.forEach((geometry) => {
    forEachTriangle(geometry, ({ vertices: [first, second, third] }) => {
      const signedVolume =
        first.dot(tempVectorB.copy(second).cross(tempVectorC.copy(third))) / 6;
      const tetrahedronCenter = new THREE.Vector3()
        .add(origin)
        .add(first)
        .add(second)
        .add(third)
        .multiplyScalar(0.25);
      center.addScaledVector(tetrahedronCenter, signedVolume);
      totalVolume += signedVolume;
    });
  });

  if (Math.abs(totalVolume) <= 1e-9) {
    return null;
  }

  return center.divideScalar(totalVolume);
}

function isContactTriangle(triangle: TriangleMetrics) {
  if (triangle.normal.z > -CONTACT_NORMAL_COS) return false;
  return triangle.vertices.every((vertex) => vertex.z <= CONTACT_Z_EPS);
}

function isDownwardFacingNonContact(triangle: TriangleMetrics) {
  if (isContactTriangle(triangle)) return false;
  return triangle.normal.z < DOWNWARD_FACE_NORMAL_Z;
}

function analyzeCandidate(geometries: THREE.BufferGeometry[]): Omit<
  CandidateMetrics,
  "id" | "score"
> {
  let contactArea = 0;
  let downwardFacingArea = 0;
  let totalArea = 0;
  const contactBounds = new THREE.Box3();
  let hasContact = false;

  geometries.forEach((geometry) => {
    forEachTriangle(geometry, (triangle) => {
      totalArea += triangle.area;
      if (isContactTriangle(triangle)) {
        contactArea += triangle.area;
        triangle.vertices.forEach((vertex) => contactBounds.expandByPoint(vertex));
        hasContact = true;
      } else if (isDownwardFacingNonContact(triangle)) {
        downwardFacingArea += triangle.area;
      }
    });
  });

  const bounds = boundsOf(geometries);
  const height = Math.max(0, bounds.max.z - bounds.min.z);
  const downwardFacingRatio =
    totalArea > 0 ? downwardFacingArea / totalArea : 0;

  if (!hasContact || contactArea < MIN_CONTACT_AREA_MM2) {
    return {
      contactArea,
      stabilityScore: 0,
      height,
      downwardFacingRatio,
      stable: false,
    };
  }

  const centerOfMass = computeCenterOfMass(geometries);
  if (!centerOfMass) {
    return {
      contactArea,
      stabilityScore: 0,
      height,
      downwardFacingRatio,
      stable: false,
    };
  }

  const insideX =
    centerOfMass.x >= contactBounds.min.x &&
    centerOfMass.x <= contactBounds.max.x;
  const insideY =
    centerOfMass.y >= contactBounds.min.y &&
    centerOfMass.y <= contactBounds.max.y;
  const stable = insideX && insideY;

  let stabilityScore = 0;
  if (stable) {
    const sizeX = Math.max(contactBounds.max.x - contactBounds.min.x, 1e-6);
    const sizeY = Math.max(contactBounds.max.y - contactBounds.min.y, 1e-6);
    const centerX = (contactBounds.min.x + contactBounds.max.x) * 0.5;
    const centerY = (contactBounds.min.y + contactBounds.max.y) * 0.5;
    const offsetX = Math.abs(centerOfMass.x - centerX) / (sizeX * 0.5);
    const offsetY = Math.abs(centerOfMass.y - centerY) / (sizeY * 0.5);
    stabilityScore = 1 - Math.min(1, Math.max(offsetX, offsetY));
  }

  return {
    contactArea,
    stabilityScore,
    height,
    downwardFacingRatio,
    stable,
  };
}

function rotationKey(rotation: THREE.Matrix4) {
  const elements = rotation.elements;
  return elements
    .map((value) => (Math.abs(value) < 1e-6 ? 0 : Math.round(value * 1000) / 1000))
    .join(",");
}

function axialCandidates(): CandidateDefinition[] {
  const candidates: CandidateDefinition[] = [
    {
      id: "baseline",
      rotation: new THREE.Matrix4(),
    },
    {
      id: "pos-z-down",
      rotation: new THREE.Matrix4().makeRotationX(Math.PI),
    },
    {
      id: "pos-x-down",
      rotation: new THREE.Matrix4().makeRotationY(Math.PI / 2),
    },
    {
      id: "neg-x-down",
      rotation: new THREE.Matrix4().makeRotationY(-Math.PI / 2),
    },
    {
      id: "pos-y-down",
      rotation: new THREE.Matrix4().makeRotationX(-Math.PI / 2),
    },
    {
      id: "neg-y-down",
      rotation: new THREE.Matrix4().makeRotationX(Math.PI / 2),
    },
  ];

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = rotationKey(candidate.rotation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreCandidates(metrics: CandidateMetrics[]) {
  const valid = metrics.filter((metric) => metric.stable);
  if (!valid.length) return metrics;

  const maxContact = Math.max(...valid.map((metric) => metric.contactArea), 1e-6);
  const maxHeight = Math.max(...valid.map((metric) => metric.height), 1e-6);

  valid.forEach((metric) => {
    const contactNorm = metric.contactArea / maxContact;
    const overhangNorm = metric.downwardFacingRatio;
    const heightNorm = metric.height / maxHeight;
    const preserveBonus = metric.id === "baseline" ? 1 : 0;

    metric.score =
      SCORE_WEIGHTS.contact * contactNorm +
      SCORE_WEIGHTS.stability * metric.stabilityScore +
      SCORE_WEIGHTS.overhang * (1 - overhangNorm) +
      SCORE_WEIGHTS.height * (1 - heightNorm) +
      SCORE_WEIGHTS.preserve * preserveBonus;
  });

  return metrics;
}

function evaluateCandidate(
  sourceGeometries: THREE.BufferGeometry[],
  initialTransform: THREE.Matrix4,
  candidate: CandidateDefinition,
): CandidateMetrics {
  const geometries = sourceGeometries.map((geometry) => geometry.clone());
  const candidateTransform = candidate.rotation.clone().multiply(initialTransform);
  geometries.forEach((geometry) => geometry.applyMatrix4(candidateTransform));
  floorGeometries(geometries);

  const metrics = analyzeCandidate(geometries);
  geometries.forEach((geometry) => geometry.dispose());

  return {
    id: candidate.id,
    score: 0,
    ...metrics,
  };
}

function chooseCandidate(metrics: CandidateMetrics[]): CandidateMetrics {
  const scored = scoreCandidates(metrics);
  const valid = scored.filter((metric) => metric.stable);
  const baseline = scored.find((metric) => metric.id === "baseline");

  if (!valid.length) {
    return baseline ?? scored[0];
  }

  const best = valid.reduce((currentBest, metric) =>
    metric.score > currentBest.score ? metric : currentBest,
  );

  if (
    best.id !== "baseline" &&
    baseline?.stable &&
    best.score < baseline.score * (1 + PRESERVE_MARGIN)
  ) {
    return baseline;
  }

  return best;
}

export function chooseAutoOrientation(
  sourceGeometries: THREE.BufferGeometry[],
  initialTransform: THREE.Matrix4,
): AutoOrientationChoice {
  const candidates = axialCandidates();
  const metrics = candidates.map((candidate) =>
    evaluateCandidate(sourceGeometries, initialTransform, candidate),
  );
  const chosen = chooseCandidate(metrics);

  const candidate = candidates.find((entry) => entry.id === chosen.id) ?? candidates[0];

  return {
    candidateRotation: candidate.rotation.clone(),
    chosenOrientationId: candidate.id,
    wasAdjusted: candidate.id !== "baseline",
  };
}
