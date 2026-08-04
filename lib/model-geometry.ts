import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import helvetikerFont from "three/examples/fonts/helvetiker_regular.typeface.json";
import {
  ADDITION,
  Brush,
  Evaluator,
  SUBTRACTION,
} from "three-bvh-csg";
import type {
  Cutout,
  CustomObject,
  ModelOptions,
  ModelParameters,
  TemplateId,
} from "./models";

const textFont = new FontLoader().parse(helvetikerFont);

function addCutout(shape: THREE.Shape, cutout: Cutout, width: number, height: number) {
  const centerX = width / 2 + cutout.x;
  const centerY = height / 2 + cutout.z;

  if (cutout.kind === "round") {
    const hole = new THREE.Path();
    hole.absarc(centerX, centerY, cutout.width / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return;
  }

  const hole = new THREE.Path();
  const x = centerX - cutout.width / 2;
  const y = centerY - cutout.height / 2;
  hole.moveTo(x, y);
  hole.lineTo(x, y + cutout.height);
  hole.lineTo(x + cutout.width, y + cutout.height);
  hole.lineTo(x + cutout.width, y);
  hole.closePath();
  shape.holes.push(hole);
}

function rectangularShape(
  width: number,
  height: number,
  holes: Cutout[] = [],
  cornerRadius = 0,
) {
  const radius = Math.max(0, Math.min(cornerRadius, width / 2 - 0.1, height / 2 - 0.1));
  const shape = new THREE.Shape();

  if (radius <= 0.05) {
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, height);
    shape.lineTo(0, height);
  } else {
    shape.moveTo(radius, 0);
    shape.lineTo(width - radius, 0);
    shape.quadraticCurveTo(width, 0, width, radius);
    shape.lineTo(width, height - radius);
    shape.quadraticCurveTo(width, height, width - radius, height);
    shape.lineTo(radius, height);
    shape.quadraticCurveTo(0, height, 0, height - radius);
    shape.lineTo(0, radius);
    shape.quadraticCurveTo(0, 0, radius, 0);
  }
  shape.closePath();
  holes.forEach((hole) => addCutout(shape, hole, width, height));
  return shape;
}

function addRoundedRectangleHole(
  shape: THREE.Shape,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
) {
  const radius = Math.max(
    0,
    Math.min(cornerRadius, width / 2 - 0.1, height / 2 - 0.1),
  );
  const hole = new THREE.Path();

  if (radius <= 0.05) {
    hole.moveTo(x, y);
    hole.lineTo(x, y + height);
    hole.lineTo(x + width, y + height);
    hole.lineTo(x + width, y);
  } else {
    hole.moveTo(x + radius, y);
    hole.quadraticCurveTo(x, y, x, y + radius);
    hole.lineTo(x, y + height - radius);
    hole.quadraticCurveTo(x, y + height, x + radius, y + height);
    hole.lineTo(x + width - radius, y + height);
    hole.quadraticCurveTo(
      x + width,
      y + height,
      x + width,
      y + height - radius,
    );
    hole.lineTo(x + width, y + radius);
    hole.quadraticCurveTo(x + width, y, x + width - radius, y);
  }
  hole.closePath();
  shape.holes.push(hole);
}

function createFlatPlateGeometry(
  width: number,
  depth: number,
  thickness: number,
  holes: Cutout[] = [],
  cornerRadius = 0,
) {
  const geometry = new THREE.ExtrudeGeometry(
    rectangularShape(width, depth, holes, cornerRadius),
    {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 32,
    },
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(-width / 2, 0, depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createFrontCutoutGeometry(
  cutout: Cutout,
  depth: number,
  height: number,
  wall: number,
) {
  const centerY = height / 2 + cutout.z;
  const cutterDepth = Math.max(4, wall * 3);
  let geometry: THREE.BufferGeometry;

  if (cutout.kind === "round") {
    geometry = new THREE.CylinderGeometry(
      cutout.width / 2,
      cutout.width / 2,
      cutterDepth,
      36,
    );
    geometry.rotateX(Math.PI / 2);
  } else {
    geometry = new THREE.BoxGeometry(
      cutout.width,
      cutout.height,
      cutterDepth,
    );
  }
  geometry.translate(cutout.x, centerY, depth / 2);
  return geometry;
}

function createBoxWallGeometry(
  width: number,
  depth: number,
  height: number,
  wall: number,
  bottom: number,
  cornerRadius: number,
  frontHoles: Cutout[],
) {
  const shape = rectangularShape(width, depth, [], cornerRadius);
  const innerWidth = width - wall * 2;
  const innerDepth = depth - wall * 2;
  addRoundedRectangleHole(
    shape,
    wall,
    wall,
    innerWidth,
    innerDepth,
    Math.max(0, cornerRadius - wall),
  );

  const wallGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - bottom,
    bevelEnabled: false,
    curveSegments: 32,
  });
  wallGeometry.rotateX(-Math.PI / 2);
  wallGeometry.translate(-width / 2, bottom, depth / 2);
  wallGeometry.computeVertexNormals();

  if (!frontHoles.length) return wallGeometry;

  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  const resources: THREE.BufferGeometry[] = [wallGeometry];
  const wallBrush = new Brush(wallGeometry);
  wallBrush.updateMatrixWorld();
  let result = wallBrush;

  frontHoles.forEach((cutout) => {
    const cutterGeometry = createFrontCutoutGeometry(
      cutout,
      depth,
      height,
      wall,
    );
    resources.push(cutterGeometry);
    const cutter = new Brush(cutterGeometry);
    cutter.updateMatrixWorld();
    result = evaluator.evaluate(result, cutter, SUBTRACTION) as Brush;
    resources.push(result.geometry);
  });

  const geometry = result.geometry.clone();
  geometry.computeVertexNormals();
  new Set(resources).forEach((resource) => resource.dispose());
  return geometry;
}

function createVerticalPanelGeometry(
  width: number,
  height: number,
  thickness: number,
  holes: Cutout[] = [],
  cornerRadius = 0,
) {
  const geometry = new THREE.ExtrudeGeometry(
    rectangularShape(width, height, holes, cornerRadius),
    {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 32,
    },
  );
  geometry.translate(-width / 2, 0, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function createRingGeometry(
  outerDiameter: number,
  innerDiameter: number,
  height: number,
  x: number,
  y: number,
  z: number,
) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerDiameter / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerDiameter / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 32,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(x, y, z);
  geometry.computeVertexNormals();
  return geometry;
}

function createBoxGeometries(
  params: ModelParameters,
  options: ModelOptions,
  arrangeForPrint: boolean,
) {
  const { width, depth, height, wall, bottom } = params;
  const baseHoles = options.holes.filter((hole) => hole.face === "base");
  const frontHoles = options.holes.filter((hole) => hole.face === "front");
  const geometries: THREE.BufferGeometry[] = [
    createFlatPlateGeometry(width, depth, bottom, baseHoles, options.cornerRadius),
    createBoxWallGeometry(
      width,
      depth,
      height,
      wall,
      bottom,
      options.cornerRadius,
      frontHoles,
    ),
  ];

  if (options.standoffCount > 0) {
    const x = Math.max(
      0,
      width / 2 - wall - options.standoffDiameter / 2 - 3,
    );
    const z = Math.max(
      0,
      depth / 2 - wall - options.standoffDiameter / 2 - 3,
    );
    const positions =
      options.standoffCount === 2
        ? [[-x, -z], [x, z]]
        : [[-x, -z], [x, -z], [x, z], [-x, z]];
    positions.forEach(([positionX, positionZ]) => {
      geometries.push(
        createRingGeometry(
          options.standoffDiameter,
          Math.min(options.standoffHole, options.standoffDiameter - 0.8),
          options.standoffHeight,
          positionX,
          bottom,
          positionZ,
        ),
      );
    });
  }

  if (options.lidStyle !== "none") {
    const clearance = options.lidStyle === "slide" ? Math.max(0.4, wall * 0.35) : 0;
    const lidWidth = width - clearance * 2;
    const lidDepth = depth - clearance * 2;
    const screwHoles: Cutout[] =
      options.lidStyle === "screw"
        ? [
            { id: "lh1", kind: "round", face: "base", x: -lidWidth / 2 + 7, z: -lidDepth / 2 + 7, width: 3.2, height: 3.2 },
            { id: "lh2", kind: "round", face: "base", x: lidWidth / 2 - 7, z: -lidDepth / 2 + 7, width: 3.2, height: 3.2 },
            { id: "lh3", kind: "round", face: "base", x: lidWidth / 2 - 7, z: lidDepth / 2 - 7, width: 3.2, height: 3.2 },
            { id: "lh4", kind: "round", face: "base", x: -lidWidth / 2 + 7, z: lidDepth / 2 - 7, width: 3.2, height: 3.2 },
          ]
        : [];
    const lid = createFlatPlateGeometry(
      lidWidth,
      lidDepth,
      options.lidThickness,
      screwHoles,
      options.cornerRadius,
    );
    const lidX = arrangeForPrint ? width / 2 + lidWidth / 2 + 8 : 0;
    const lidY = arrangeForPrint
      ? options.lidStyle === "snap"
        ? 3
        : options.lidStyle === "slide"
          ? 2
          : 0
      : height + 5;
    lid.translate(lidX, lidY, 0);
    geometries.push(lid);

    if (options.lidStyle === "snap") {
      [-1, 1].forEach((direction) => {
        const tab = new THREE.BoxGeometry(10, 3, 2);
        tab.translate(
          lidX + direction * (width / 2 - wall - 5),
          arrangeForPrint ? 1.5 : height + 3.5,
          depth / 2 - wall,
        );
        geometries.push(tab);
      });
    }

    if (options.lidStyle === "slide") {
      [-1, 1].forEach((direction) => {
        const rail = new THREE.BoxGeometry(2, 2, lidDepth - 4);
        rail.translate(
          lidX + direction * (lidWidth / 2 - 2),
          arrangeForPrint ? 1 : height + 4,
          0,
        );
        geometries.push(rail);
      });
    }
  }

  return geometries;
}

function createBracketGeometries(params: ModelParameters, options: ModelOptions) {
  const { width, depth, height, thickness } = params;
  const horizontal = createFlatPlateGeometry(
    width,
    depth,
    thickness,
    options.holes.filter((hole) => hole.face === "base"),
    options.cornerRadius,
  );

  const vertical = createVerticalPanelGeometry(
    width,
    height,
    thickness,
    options.holes.filter((hole) => hole.face === "front"),
    options.cornerRadius,
  );
  vertical.translate(0, 0, -depth / 2);
  return [horizontal, vertical];
}

function createPerforatedPlateGeometry(params: ModelParameters, options: ModelOptions) {
  return createFlatPlateGeometry(
    params.width,
    params.depth,
    params.thickness,
    options.holes.filter((hole) => hole.face === "base"),
    options.cornerRadius,
  );
}

function createLocalObjectGeometry(object: CustomObject) {
  let geometry: THREE.BufferGeometry;

  if (object.kind === "cylinder") {
    geometry = new THREE.CylinderGeometry(
      Math.max(0.5, object.width / 2),
      Math.max(0.5, object.width / 2),
      object.height,
      36,
    );
    geometry.translate(0, object.height / 2, 0);
    return geometry;
  }

  if (object.kind === "cone") {
    geometry = new THREE.CylinderGeometry(
      0,
      Math.max(0.5, object.width / 2),
      object.height,
      36,
    );
    geometry.translate(0, object.height / 2, 0);
    return geometry;
  }

  if (object.kind === "tube") {
    const outerRadius = Math.max(0.5, object.width / 2);
    const innerRadius = Math.max(
      0.25,
      Math.min(object.depth / 2, outerRadius - 0.25),
    );
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    geometry = new THREE.ExtrudeGeometry(shape, {
      depth: object.height,
      bevelEnabled: false,
      curveSegments: 36,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    return geometry;
  }

  if (object.kind === "wedge") {
    const shape = new THREE.Shape();
    shape.moveTo(-object.width / 2, 0);
    shape.lineTo(object.width / 2, 0);
    shape.lineTo(-object.width / 2, object.height);
    shape.closePath();
    geometry = new THREE.ExtrudeGeometry(shape, {
      depth: object.depth,
      bevelEnabled: false,
      curveSegments: 1,
    });
    geometry.translate(0, 0, -object.depth / 2);
    geometry.computeVertexNormals();
    return geometry;
  }

  if (object.kind === "sphere") {
    geometry = new THREE.SphereGeometry(
      Math.max(0.5, object.width / 2),
      32,
      20,
    );
    geometry.translate(0, object.width / 2, 0);
    return geometry;
  }

  if (object.kind === "text") {
    const bevel = Math.min(0.35, Math.max(0.12, object.height * 0.18));
    geometry = new TextGeometry((object.text || "FORJA").slice(0, 20), {
      font: textFont,
      size: Math.max(2, object.width),
      depth: Math.max(0.6, object.height),
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.72,
      bevelSegments: 2,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    if (bounds) {
      const center = bounds.getCenter(new THREE.Vector3());
      geometry.translate(
        -center.x,
        -bounds.min.y,
        -center.z,
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  const requestedRadius = object.cornerRadius ?? 2.4;
  const radius = Math.max(
    0.05,
    Math.min(
      requestedRadius,
      object.width / 2 - 0.05,
      object.depth / 2 - 0.05,
      object.height / 2 - 0.05,
    ),
  );
  geometry = new RoundedBoxGeometry(
    object.width,
    object.height,
    object.depth,
    5,
    radius,
  );
  geometry.translate(0, object.height / 2, 0);
  return geometry;
}

function createObjectGeometry(object: CustomObject) {
  const geometry = createLocalObjectGeometry(object);
  geometry.rotateX(THREE.MathUtils.degToRad(object.rotationX ?? 0));
  geometry.rotateY(THREE.MathUtils.degToRad(object.rotation));
  geometry.rotateZ(THREE.MathUtils.degToRad(object.rotationZ ?? 0));
  geometry.translate(object.x, object.y, object.z);
  geometry.computeVertexNormals();
  return geometry;
}

function createPreviewObjectGeometry(object: CustomObject) {
  const geometry = createLocalObjectGeometry(object);
  geometry.userData.forjaObject = { ...object };
  return geometry;
}

function createFreeBooleanGeometry(objects: CustomObject[]) {
  const solids = objects.filter((object) => object.operation !== "hole");
  if (!solids.length) return null;
  const holes = objects.filter((object) => object.operation === "hole");
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  const resources: THREE.BufferGeometry[] = [];

  const brushFor = (object: CustomObject) => {
    const geometry = createObjectGeometry(object);
    resources.push(geometry);
    const brush = new Brush(geometry);
    brush.updateMatrixWorld();
    return brush;
  };

  let result: Brush = brushFor(solids[0]);
  solids.slice(1).forEach((object) => {
    result = evaluator.evaluate(result, brushFor(object), ADDITION) as Brush;
    resources.push(result.geometry);
  });
  holes.forEach((object) => {
    result = evaluator.evaluate(result, brushFor(object), SUBTRACTION) as Brush;
    resources.push(result.geometry);
  });

  const geometry = result.geometry.clone();
  geometry.computeVertexNormals();
  new Set(resources).forEach((resource) => resource.dispose());
  return geometry;
}

function legacyHoles(templateId: TemplateId, params: ModelParameters): Cutout[] {
  if (templateId === "box") return [];
  if (templateId === "free") return [];
  if (templateId === "bracket") {
    return [
      { id: "b1", kind: "round", face: "base", x: -params.width * 0.23, z: 2, width: params.holeDiameter, height: params.holeDiameter },
      { id: "b2", kind: "round", face: "base", x: params.width * 0.23, z: 2, width: params.holeDiameter, height: params.holeDiameter },
      { id: "b3", kind: "round", face: "front", x: -params.width * 0.23, z: params.height * 0.08, width: params.holeDiameter, height: params.holeDiameter },
      { id: "b4", kind: "round", face: "front", x: params.width * 0.23, z: params.height * 0.08, width: params.holeDiameter, height: params.holeDiameter },
    ];
  }
  const x = params.width / 2 - params.margin;
  const z = params.depth / 2 - params.margin;
  return [
    { id: "p1", kind: "round", face: "base", x: -x, z: -z, width: params.holeDiameter, height: params.holeDiameter },
    { id: "p2", kind: "round", face: "base", x, z: -z, width: params.holeDiameter, height: params.holeDiameter },
    { id: "p3", kind: "round", face: "base", x, z, width: params.holeDiameter, height: params.holeDiameter },
    { id: "p4", kind: "round", face: "base", x: -x, z, width: params.holeDiameter, height: params.holeDiameter },
  ];
}

const DEFAULT_OPTIONS: Omit<ModelOptions, "holes" | "objects"> = {
  cornerRadius: 2,
  lidStyle: "none",
  lidThickness: 2,
  standoffCount: 0,
  standoffDiameter: 7,
  standoffHeight: 8,
  standoffHole: 3,
};

export function createModelGeometries(
  templateId: TemplateId,
  params: ModelParameters,
  suppliedOptions?: Partial<ModelOptions>,
  finalizeFree = true,
  arrangeForPrint = false,
) {
  const options: ModelOptions = {
    ...DEFAULT_OPTIONS,
    ...suppliedOptions,
    holes: suppliedOptions?.holes ?? legacyHoles(templateId, params),
    objects: suppliedOptions?.objects ?? [],
  };
  const visibleObjects = options.objects.filter((object) => !object.hidden);

  if (templateId === "free") {
    if (!finalizeFree) {
      return visibleObjects.map(createPreviewObjectGeometry);
    }
    const geometry = createFreeBooleanGeometry(visibleObjects);
    return geometry ? [geometry] : [];
  }

  const baseGeometries =
    templateId === "box"
      ? createBoxGeometries(params, options, arrangeForPrint)
      : templateId === "bracket"
        ? createBracketGeometries(params, options)
        : [createPerforatedPlateGeometry(params, options)];

  return [...baseGeometries, ...visibleObjects.map(createObjectGeometry)];
}
