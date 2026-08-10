import type { BufferGeometry } from "three";
import { orientGeometriesForPrint } from "./print-orientation";

export async function createStlFile(
  geometries: BufferGeometry[],
  fileName: string,
): Promise<File> {
  const [THREE, { STLExporter }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/exporters/STLExporter.js"),
  ]);

  const group = new THREE.Group();
  const oriented = orientGeometriesForPrint(geometries);

  oriented.geometries.forEach((geometry) => {
    group.add(new THREE.Mesh(geometry));
  });

  group.name = fileName;

  let data: ArrayBuffer | DataView;
  try {
    data = new STLExporter().parse(group, {
      binary: true,
    });
  } finally {
    oriented.geometries.forEach((geometry) => geometry.dispose());
  }

  const blob = new Blob([data as BlobPart], {
    type: "model/stl",
  });

  return new File([blob], `${fileName}.stl`, {
    type: "model/stl",
  });
}
