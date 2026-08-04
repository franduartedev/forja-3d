import JSZip from "jszip";
import * as THREE from "three";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function geometryMeshData(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const vertices: Array<[number, number, number]> = [];
  for (let index = 0; index < position.count; index += 1) {
    vertices.push([
      position.getX(index),
      position.getY(index),
      position.getZ(index),
    ]);
  }

  const triangles: Array<[number, number, number]> = [];
  if (geometry.index) {
    for (let index = 0; index < geometry.index.count; index += 3) {
      triangles.push([
        geometry.index.getX(index),
        geometry.index.getX(index + 1),
        geometry.index.getX(index + 2),
      ]);
    }
  } else {
    for (let index = 0; index < position.count; index += 3) {
      triangles.push([index, index + 1, index + 2]);
    }
  }
  return { vertices, triangles };
}

export async function create3mfBlob(
  geometries: THREE.BufferGeometry[],
  projectName: string,
) {
  const objects = geometries.map((geometry, index) => {
    const { vertices, triangles } = geometryMeshData(geometry);
    return `
      <object id="${index + 1}" name="${escapeXml(`${projectName}-${index + 1}`)}" type="model">
        <mesh>
          <vertices>${vertices
            .map(
              ([x, y, z]) =>
                `<vertex x="${x.toFixed(5)}" y="${z.toFixed(5)}" z="${y.toFixed(5)}"/>`,
            )
            .join("")}</vertices>
          <triangles>${triangles
            .map(([v1, v2, v3]) => `<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`)
            .join("")}</triangles>
        </mesh>
      </object>`;
  });

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="es-AR"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(projectName)}</metadata>
  <metadata name="Application">FORJA</metadata>
  <resources>${objects.join("")}</resources>
  <build>${geometries
    .map((_, index) => `<item objectid="${index + 1}"/>`)
    .join("")}</build>
</model>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`,
  );
  zip.folder("3D")?.file("3dmodel.model", model);
  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const arrayBuffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: "model/3mf" });
}

function stepNumber(value: number) {
  if (Math.abs(value) < 1e-9) return "0.";
  return Number(value.toFixed(6)).toString().includes(".")
    ? Number(value.toFixed(6)).toString()
    : `${Number(value.toFixed(6))}.`;
}

function stepString(value: string) {
  return value.replaceAll("'", "''");
}

export function createStepBlob(
  geometries: THREE.BufferGeometry[],
  projectName: string,
) {
  const entities: string[] = [];
  const add = (entity: string) => {
    entities.push(entity);
    return entities.length;
  };

  const application = add("APPLICATION_CONTEXT('mechanical design')");
  const productContext = add(`PRODUCT_CONTEXT('',#${application},'mechanical')`);
  const product = add(
    `PRODUCT('${stepString(projectName)}','${stepString(projectName)}','',(#${productContext}))`,
  );
  const formation = add(
    `PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#${product},.NOT_KNOWN.)`,
  );
  const definitionContext = add(
    `PRODUCT_DEFINITION_CONTEXT('part definition',#${application},'design')`,
  );
  const definition = add(
    `PRODUCT_DEFINITION('design','',#${formation},#${definitionContext})`,
  );
  const definitionShape = add(`PRODUCT_DEFINITION_SHAPE('','',#${definition})`);
  const lengthUnit = add("(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.))");
  const angleUnit = add("(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.))");
  const solidAngleUnit = add(
    "(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT())",
  );
  const uncertainty = add(
    `UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-6),#${lengthUnit},'distance_accuracy_value','')`,
  );
  const context = add(
    `(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#${uncertainty}))GLOBAL_UNIT_ASSIGNED_CONTEXT((#${lengthUnit},#${angleUnit},#${solidAngleUnit}))REPRESENTATION_CONTEXT('FORJA','3D'))`,
  );

  const breps: number[] = [];
  geometries.forEach((geometry, geometryIndex) => {
    const triangleGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
    const position = triangleGeometry.getAttribute("position");
    const faces: number[] = [];

    for (let index = 0; index < position.count; index += 3) {
      const points = [0, 1, 2].map((offset) =>
        add(
          `CARTESIAN_POINT('',(${stepNumber(position.getX(index + offset))},${stepNumber(position.getY(index + offset))},${stepNumber(position.getZ(index + offset))}))`,
        ),
      );
      const loop = add(`POLY_LOOP('',(${points.map((id) => `#${id}`).join(",")}))`);
      const bound = add(`FACE_OUTER_BOUND('',#${loop},.T.)`);
      faces.push(add(`FACE('',(#${bound}))`));
    }

    const shell = add(`CLOSED_SHELL('',(${faces.map((id) => `#${id}`).join(",")}))`);
    breps.push(add(`FACETED_BREP('FORJA ${geometryIndex + 1}',#${shell})`));
    if (triangleGeometry !== geometry) triangleGeometry.dispose();
  });

  const representation = add(
    `FACETED_BREP_SHAPE_REPRESENTATION('FORJA',(${breps
      .map((id) => `#${id}`)
      .join(",")}),#${context})`,
  );
  add(`SHAPE_DEFINITION_REPRESENTATION(#${definitionShape},#${representation})`);

  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "");
  const step = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('FORJA faceted model'),'2;1');
FILE_NAME('${stepString(projectName)}.step','${timestamp}',('FORJA user'),('FORJA'),'FORJA','FORJA','');
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));
ENDSEC;
DATA;
${entities.map((entity, index) => `#${index + 1}=${entity};`).join("\n")}
ENDSEC;
END-ISO-10303-21;`;

  return new Blob([step], { type: "application/step" });
}
