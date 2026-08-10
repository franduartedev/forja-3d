import * as THREE from "three";
import type { Manifold as ManifoldSolid, ManifoldToplevel } from "manifold-3d";

const DEFAULT_WELD_TOLERANCE = 1e-5;

let kernelPromise: Promise<ManifoldToplevel> | null = null;

export function loadExperimentalManifoldKernel() {
  if (!kernelPromise) {
    kernelPromise = import("manifold-3d").then(async ({ default: ManifoldModule }) => {
      const kernel = await ManifoldModule();
      kernel.setup();
      return kernel;
    });
  }
  return kernelPromise;
}

export async function bufferGeometryToManifold(
  geometry: THREE.BufferGeometry,
  weldTolerance = DEFAULT_WELD_TOLERANCE,
  label = "operando",
) {
  if (!(weldTolerance > 0)) {
    throw new Error("La tolerancia de soldado debe ser positiva");
  }
  const kernel = await loadExperimentalManifoldKernel();
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("La geometría no tiene posiciones");

  const sourceIndex = geometry.index;
  const vertexMap = new Map<string, number>();
  const vertices: number[] = [];
  const triangles: number[] = [];
  const sourceVertexCount = sourceIndex?.count ?? position.count;

  for (let index = 0; index < sourceVertexCount; index += 1) {
    const sourceVertex = sourceIndex?.getX(index) ?? index;
    const x = position.getX(sourceVertex);
    const y = position.getY(sourceVertex);
    const z = position.getZ(sourceVertex);
    const key = [x, y, z]
      .map((value) => Math.round(value / weldTolerance))
      .join(",");
    let targetVertex = vertexMap.get(key);

    if (targetVertex === undefined) {
      targetVertex = vertices.length / 3;
      vertexMap.set(key, targetVertex);
      vertices.push(x, y, z);
    }
    triangles.push(targetVertex);
  }

  const mesh = new kernel.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(vertices),
    triVerts: new Uint32Array(triangles),
    tolerance: weldTolerance,
  });
  let manifold: ManifoldSolid;
  try {
    manifold = kernel.Manifold.ofMesh(mesh);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "geometría inválida";
    throw new Error(`No se puede exportar: Manifold rechazó ${label} (${detail})`);
  }
  const status = manifold.status();
  if (status !== "NoError") {
    manifold.delete();
    throw new Error(`No se puede exportar: Manifold rechazó ${label} (${status})`);
  }
  return manifold;
}

export async function unionManifolds(manifolds: readonly ManifoldSolid[]) {
  if (!manifolds.length) throw new Error("UNION requiere al menos un sólido");
  const kernel = await loadExperimentalManifoldKernel();
  return kernel.Manifold.union(manifolds);
}

export async function subtractManifolds(
  base: ManifoldSolid,
  cutters: readonly ManifoldSolid[],
) {
  if (!cutters.length) throw new Error("SUBTRACT requiere al menos un recorte");
  const kernel = await loadExperimentalManifoldKernel();
  return kernel.Manifold.difference([base, ...cutters]);
}

export function manifoldToBufferGeometry(manifold: ManifoldSolid) {
  const mesh = manifold.getMesh();
  const representative = Array.from({ length: mesh.numVert }, (_, index) => index);
  for (let index = 0; index < mesh.mergeFromVert.length; index += 1) {
    representative[mesh.mergeFromVert[index]] = mesh.mergeToVert[index];
  }
  const resolveRepresentative = (vertex: number): number => {
    const parent = representative[vertex];
    if (parent === vertex) return vertex;
    representative[vertex] = resolveRepresentative(parent);
    return representative[vertex];
  };
  const compactVertices = new Map<number, number>();
  const positions: number[] = [];
  const indices = new Uint32Array(mesh.triVerts.length);

  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const representativeVertex = resolveRepresentative(mesh.triVerts[index]);
    let compactVertex = compactVertices.get(representativeVertex);
    if (compactVertex === undefined) {
      compactVertex = compactVertices.size;
      compactVertices.set(representativeVertex, compactVertex);
      const sourceOffset = representativeVertex * mesh.numProp;
      positions.push(
        mesh.vertProperties[sourceOffset],
        mesh.vertProperties[sourceOffset + 1],
        mesh.vertProperties[sourceOffset + 2],
      );
    }
    indices[index] = compactVertex;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export type GeometryAudit = {
  finite: boolean;
  componentCount: number;
  nonManifoldEdgeCount: number;
  degenerateTriangleCount: number;
};

export function auditBufferGeometry(
  geometry: THREE.BufferGeometry,
  tolerance = DEFAULT_WELD_TOLERANCE,
): GeometryAudit {
  const position = geometry.getAttribute("position");
  if (!position) {
    return {
      finite: false,
      componentCount: 0,
      nonManifoldEdgeCount: 0,
      degenerateTriangleCount: 0,
    };
  }

  const sourceIndex = geometry.index;
  const indexCount = sourceIndex?.count ?? position.count;
  const triangleCount = Math.floor(indexCount / 3);
  const edges = new Map<string, number[]>();
  const triangleEdges: string[][] = Array.from(
    { length: triangleCount },
    () => [],
  );
  let finite = indexCount % 3 === 0;
  let degenerateTriangleCount = 0;
  const vertexKey = (offset: number) => {
    const vertex = sourceIndex?.getX(offset) ?? offset;
    const coordinates = [
      position.getX(vertex),
      position.getY(vertex),
      position.getZ(vertex),
    ];
    if (!coordinates.every(Number.isFinite)) finite = false;
    if (sourceIndex) return `i:${vertex}`;
    return coordinates
      .map((value) => Math.round(value / tolerance))
      .join(",");
  };

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const vertices = [0, 1, 2].map((offset) =>
      vertexKey(triangle * 3 + offset),
    );
    if (new Set(vertices).size !== 3) degenerateTriangleCount += 1;

    for (const [first, second] of [[0, 1], [1, 2], [2, 0]]) {
      const edge = vertices[first] < vertices[second]
        ? `${vertices[first]}|${vertices[second]}`
        : `${vertices[second]}|${vertices[first]}`;
      const incident = edges.get(edge) ?? [];
      incident.push(triangle);
      edges.set(edge, incident);
      triangleEdges[triangle].push(edge);
    }
  }

  const visited = new Set<number>();
  let componentCount = 0;
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    if (visited.has(triangle)) continue;
    componentCount += 1;
    const pending = [triangle];
    visited.add(triangle);
    while (pending.length) {
      const current = pending.pop() as number;
      triangleEdges[current].forEach((edge) => {
        (edges.get(edge) ?? []).forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            pending.push(neighbor);
          }
        });
      });
    }
  }

  return {
    finite,
    componentCount,
    nonManifoldEdgeCount: [...edges.values()].filter(
      (incident) => incident.length !== 2,
    ).length,
    degenerateTriangleCount,
  };
}

export function assertExportableManifoldGeometry(
  geometry: THREE.BufferGeometry,
  requireSingleComponent = true,
) {
  const audit = auditBufferGeometry(geometry);
  if (!audit.finite) {
    throw new Error("No se puede exportar: la geometría contiene coordenadas inválidas");
  }
  if (audit.nonManifoldEdgeCount > 0 || audit.degenerateTriangleCount > 0) {
    throw new Error(
      `No se puede exportar: la geometría no es manifold (${audit.nonManifoldEdgeCount} aristas problemáticas)`,
    );
  }
  if (requireSingleComponent && audit.componentCount !== 1) {
    throw new Error(
      `No se puede exportar: el modelo contiene ${audit.componentCount} componentes separadas`,
    );
  }
  return audit;
}
