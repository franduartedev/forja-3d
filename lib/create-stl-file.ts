import type { BufferGeometry } from "three";

export async function createStlFile(
  geometries: BufferGeometry[],
  fileName: string,
): Promise<File> {
  const [THREE, { STLExporter }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/exporters/STLExporter.js"),
  ]);

  const group = new THREE.Group();

  geometries.forEach((geometry) => {
    group.add(new THREE.Mesh(geometry));
  });

  group.name = fileName;

  const data = new STLExporter().parse(group, {
    binary: true,
  });

  const blob = new Blob([data as BlobPart], {
    type: "model/stl",
  });

  return new File([blob], `${fileName}.stl`, {
    type: "model/stl",
  });
}
