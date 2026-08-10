import type {
  Cutout,
  CustomObject,
  LidStyle,
  ModelParameters,
  ObjectKind,
  ObjectOperation,
  TemplateId,
} from "./models";

export type FreePresetId =
  | "plate"
  | "post"
  | "washer"
  | "spacer"
  | "mounting-tab"
  | "foot";
export type FreeDesignId =
  | "phone-stand"
  | "tray"
  | "tool-holder"
  | "nameplate"
  | "wall-hook"
  | "cable-guide"
  | "corner-bracket"
  | "sensor-case"
  | "desk-organizer"
  | "battery-holder"
  | "headphone-hook"
  | "plant-marker"
  | "key-rack"
  | "sd-card-holder"
  | "pen-cup"
  | "mini-shelf"
  | "remote-holder"
  | "control-knob"
  | "pcb-mount"
  | "mini-planter"
  | "toothbrush-holder"
  | "soap-dish"
  | "drawer-divider"
  | "cable-spool"
  | "door-stop"
  | "bookend"
  | "led-channel"
  | "label-tag"
  | "bit-organizer"
  | "switch-plate"
  | "napkin-holder";
export type DesignCategory = "organizacion" | "soportes" | "electronica" | "hogar";
export type WorkplanePoint = { x: number; z: number };

export const STARTER_DESIGNS: Array<{
  id: FreeDesignId;
  name: string;
  icon: string;
  description: string;
  detail: string;
  category: DesignCategory;
  size: string;
}> = [
  {
    id: "phone-stand",
    name: "Soporte celular",
    icon: "▱",
    description: "Base, respaldo inclinado y apoyo frontal.",
    detail: "3 piezas editables",
    category: "soportes",
    size: "65 × 75 mm",
  },
  {
    id: "tray",
    name: "Bandeja",
    icon: "▣",
    description: "Organizador abierto con base y cuatro paredes.",
    detail: "5 piezas editables",
    category: "organizacion",
    size: "100 × 70 mm",
  },
  {
    id: "tool-holder",
    name: "Portaherramientas",
    icon: "⠿",
    description: "Base perforada para mechas o destornilladores.",
    detail: "1 base + 6 recortes",
    category: "organizacion",
    size: "90 × 34 mm",
  },
  {
    id: "nameplate",
    name: "Cartel personalizable",
    icon: "Aa",
    description: "Placa con texto en relieve y dos perforaciones.",
    detail: "Texto completamente editable",
    category: "hogar",
    size: "90 × 34 mm",
  },
  {
    id: "wall-hook",
    name: "Gancho de pared",
    icon: "⌁",
    description: "Placa, brazo reforzado y perforaciones de montaje.",
    detail: "5 piezas editables",
    category: "soportes",
    size: "42 × 48 mm",
  },
  {
    id: "cable-guide",
    name: "Guía para cables",
    icon: "∿",
    description: "Base compacta con tres canales para organizar cables.",
    detail: "1 base + 3 canales",
    category: "organizacion",
    size: "62 × 24 mm",
  },
  {
    id: "corner-bracket",
    name: "Escuadra reforzada",
    icon: "◩",
    description: "Dos alas, refuerzo central y agujeros de fijación.",
    detail: "3 sólidos + 4 recortes",
    category: "soportes",
    size: "54 × 48 mm",
  },
  {
    id: "sensor-case",
    name: "Carcasa de sensor",
    icon: "▤",
    description: "Caja abierta pequeña con ventana y paso de cable.",
    detail: "6 sólidos + 2 recortes",
    category: "electronica",
    size: "58 × 42 mm",
  },
  {
    id: "desk-organizer",
    name: "Organizador de escritorio",
    icon: "▥",
    description: "Bandeja con tres sectores para útiles y accesorios.",
    detail: "7 piezas editables",
    category: "organizacion",
    size: "120 × 82 mm",
  },
  {
    id: "battery-holder",
    name: "Portabaterías",
    icon: "▦",
    description: "Soporte abierto con cuatro espacios ajustables.",
    detail: "8 piezas editables",
    category: "electronica",
    size: "82 × 54 mm",
  },
  {
    id: "headphone-hook",
    name: "Soporte de auriculares",
    icon: "⌐",
    description: "Gancho reforzado para fijar debajo de una mesa.",
    detail: "4 sólidos + 2 recortes",
    category: "soportes",
    size: "54 × 64 mm",
  },
  {
    id: "plant-marker",
    name: "Marcador para plantas",
    icon: "⌁",
    description: "Estaca con placa y texto personalizable en relieve.",
    detail: "3 piezas editables",
    category: "hogar",
    size: "34 × 110 mm",
  },
  {
    id: "key-rack",
    name: "Organizador de llaves",
    icon: "⌘",
    description: "Placa de pared con cuatro ganchos y fijaciones.",
    detail: "9 sólidos + 2 recortes",
    category: "hogar",
    size: "120 × 48 mm",
  },
  {
    id: "sd-card-holder",
    name: "Portatarjetas SD",
    icon: "▥",
    description: "Base compacta con seis ranuras para tarjetas.",
    detail: "1 sólido + 6 recortes",
    category: "electronica",
    size: "82 × 38 mm",
  },
  {
    id: "pen-cup",
    name: "Portalápices",
    icon: "◉",
    description: "Recipiente cilíndrico abierto con base reforzada.",
    detail: "2 piezas editables",
    category: "organizacion",
    size: "72 × 72 mm",
  },
  {
    id: "mini-shelf",
    name: "Estante pequeño",
    icon: "▰",
    description: "Repisa con respaldo, refuerzos y agujeros de montaje.",
    detail: "4 sólidos + 2 recortes",
    category: "soportes",
    size: "110 × 70 mm",
  },
  {
    id: "remote-holder",
    name: "Soporte para control",
    icon: "▯",
    description: "Bandeja vertical para controles remotos o teléfonos.",
    detail: "5 piezas editables",
    category: "hogar",
    size: "66 × 44 mm",
  },
  {
    id: "control-knob",
    name: "Perilla de control",
    icon: "◉",
    description: "Perilla estriada con alojamiento central ajustable.",
    detail: "9 sólidos + 1 recorte",
    category: "electronica",
    size: "36 × 36 mm",
  },
  {
    id: "pcb-mount",
    name: "Base para placa PCB",
    icon: "▧",
    description: "Plataforma con separadores para montar una placa electrónica.",
    detail: "5 piezas editables",
    category: "electronica",
    size: "80 × 58 mm",
  },
  {
    id: "mini-planter",
    name: "Maceta pequeña",
    icon: "◒",
    description: "Maceta compacta de pared gruesa con drenaje inferior.",
    detail: "2 sólidos + 1 recorte",
    category: "hogar",
    size: "70 × 70 mm",
  },
  {
    id: "toothbrush-holder",
    name: "Portacepillos",
    icon: "⠿",
    description: "Base compacta con cuatro alojamientos individuales.",
    detail: "1 sólido + 4 recortes",
    category: "hogar",
    size: "78 × 42 mm",
  },
  {
    id: "soap-dish",
    name: "Jabonera drenante",
    icon: "▤",
    description: "Bandeja inclinable con canales amplios de drenaje.",
    detail: "1 sólido + 5 recortes",
    category: "hogar",
    size: "100 × 66 mm",
  },
  {
    id: "drawer-divider",
    name: "Divisor modular",
    icon: "╬",
    description: "Separador cruzado para cajones y cajas organizadoras.",
    detail: "4 piezas editables",
    category: "organizacion",
    size: "120 × 90 mm",
  },
  {
    id: "cable-spool",
    name: "Carrete para cables",
    icon: "◎",
    description: "Carrete compacto para cables finos, hilo o estaño.",
    detail: "3 piezas editables",
    category: "organizacion",
    size: "72 × 72 mm",
  },
  {
    id: "door-stop",
    name: "Tope de puerta",
    icon: "◢",
    description: "Cuña reforzada con tres nervaduras antideslizantes.",
    detail: "4 piezas editables",
    category: "hogar",
    size: "42 × 88 mm",
  },
  {
    id: "bookend",
    name: "Sujetalibros",
    icon: "◩",
    description: "Base vertical reforzada para sostener libros y carpetas.",
    detail: "4 piezas editables",
    category: "organizacion",
    size: "76 × 84 mm",
  },
  {
    id: "led-channel",
    name: "Canal para tira LED",
    icon: "━",
    description: "Perfil abierto con guías laterales y tope final.",
    detail: "4 piezas editables",
    category: "electronica",
    size: "120 × 18 mm",
  },
  {
    id: "label-tag",
    name: "Etiqueta personalizable",
    icon: "Aa",
    description: "Identificador con texto en relieve y perforación lateral.",
    detail: "2 sólidos + 1 recorte",
    category: "organizacion",
    size: "76 × 30 mm",
  },
  {
    id: "bit-organizer",
    name: "Organizador de puntas",
    icon: "⠿",
    description: "Base compacta con ocho casquillos elevados y acceso cómodo.",
    detail: "9 piezas integradas",
    category: "organizacion",
    size: "108 × 42 mm",
  },
  {
    id: "switch-plate",
    name: "Frente para interruptor",
    icon: "▣",
    description: "Placa configurable con marco elevado y fijaciones simétricas.",
    detail: "5 sólidos + 3 recortes",
    category: "electronica",
    size: "86 × 86 mm",
  },
  {
    id: "napkin-holder",
    name: "Servilletero",
    icon: "▥",
    description: "Base abierta con laterales aligerados y apoyo posterior.",
    detail: "4 sólidos + 2 ventanas",
    category: "hogar",
    size: "112 × 76 mm",
  },
];

export type EditableTemplateOptions = {
  holes: Cutout[];
  objects: CustomObject[];
  lidStyle: LidStyle;
  lidThickness: number;
  standoffCount: number;
  standoffDiameter: number;
  standoffHeight: number;
  standoffHole: number;
};

type ObjectFactoryOptions = {
  kind: ObjectKind;
  operation: ObjectOperation;
  index: number;
  point?: WorkplanePoint;
  idFactory: (prefix: string) => string;
};

const SHAPE_NAMES: Record<ObjectKind, string> = {
  cube: "Cubo",
  cylinder: "Cilindro",
  sphere: "Esfera",
  cone: "Cono",
  tube: "Tubo",
  wedge: "Cuña",
  text: "Texto",
};

export function createFreePrimitive({
  kind,
  operation,
  index,
  point = { x: 0, z: 0 },
  idFactory,
}: ObjectFactoryOptions): CustomObject {
  return {
    id: idFactory("object"),
    kind,
    name: `${SHAPE_NAMES[kind]} ${index + 1}`,
    hidden: false,
    locked: false,
    x: point.x,
    y: 0,
    z: point.z,
    width:
      kind === "text"
        ? 8
        : kind === "wedge"
          ? 20
          : kind === "tube"
            ? 18
            : 15,
    depth:
      kind === "text"
        ? 2
        : kind === "tube"
          ? 10
          : kind === "wedge"
            ? 20
            : 15,
    height:
      kind === "text"
        ? 1.4
        : kind === "cone"
          ? 18
          : kind === "wedge"
            ? 12
            : 10,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    cornerRadius: kind === "cube" ? 2.4 : undefined,
    operation,
    text: kind === "text" ? "FORJA" : undefined,
  };
}

export function createStarterDesign(
  design: FreeDesignId,
  index: number,
  point: WorkplanePoint,
  idFactory: (prefix: string) => string,
): CustomObject[] {
  const make = (
    kind: ObjectKind,
    name: string,
    overrides: Partial<CustomObject>,
    operation: ObjectOperation = "solid",
  ) => ({
    ...createFreePrimitive({
      kind,
      operation,
      index,
      point,
      idFactory,
    }),
    name,
    cornerRadius:
      kind === "cube"
        ? Math.min(4, Math.max(1.2, (overrides.height ?? 10) * 0.32))
        : undefined,
    ...overrides,
  });
  const x = point.x;
  const z = point.z;
  const suffix = index + 1;

  if (design === "phone-stand") {
    return [
      make("cube", `Base soporte ${suffix}`, {
        x,
        z,
        width: 65,
        depth: 75,
        height: 4,
      }),
      make("cube", `Respaldo soporte ${suffix}`, {
        x,
        y: 2,
        z: z - 30,
        width: 65,
        depth: 4,
        height: 78,
        rotationX: -15,
      }),
      make("cube", `Tope soporte ${suffix}`, {
        x,
        y: 3.5,
        z: z + 29,
        width: 65,
        depth: 9,
        height: 11,
      }),
    ];
  }

  if (design === "tray") {
    return [
      make("cube", `Base bandeja ${suffix}`, {
        x,
        z,
        width: 100,
        depth: 70,
        height: 3,
      }),
      make("cube", `Frente bandeja ${suffix}`, {
        x,
        y: 2.5,
        z: z + 33.5,
        width: 100,
        depth: 3,
        height: 15,
      }),
      make("cube", `Fondo bandeja ${suffix}`, {
        x,
        y: 2.5,
        z: z - 33.5,
        width: 100,
        depth: 3,
        height: 15,
      }),
      make("cube", `Lateral izquierdo ${suffix}`, {
        x: x - 48.5,
        y: 2.5,
        z,
        width: 3,
        depth: 64,
        height: 15,
      }),
      make("cube", `Lateral derecho ${suffix}`, {
        x: x + 48.5,
        y: 2.5,
        z,
        width: 3,
        depth: 64,
        height: 15,
      }),
    ];
  }

  if (design === "tool-holder") {
    const holes = [-30, -18, -6, 6, 18, 30].map((offset, holeIndex) =>
      make(
        "cylinder",
        `Hueco herramienta ${holeIndex + 1}`,
        {
          x: x + offset,
          y: -1,
          z,
          width: 9,
          depth: 9,
          height: 8,
        },
        "hole",
      ),
    );
    return [
      make("cube", `Base portaherramientas ${suffix}`, {
        x,
        z,
        width: 90,
        depth: 34,
        height: 5,
      }),
      ...holes,
    ];
  }

  if (design === "wall-hook") {
    return [
      make("cube", `Placa gancho ${suffix}`, {
        x,
        z: z - 17,
        width: 42,
        depth: 5,
        height: 62,
      }),
      make("cube", `Brazo gancho ${suffix}`, {
        x,
        y: 20,
        z: z + 8,
        width: 18,
        depth: 48,
        height: 8,
        rotationX: -8,
      }),
      make("wedge", `Refuerzo gancho ${suffix}`, {
        x,
        y: 3,
        z: z - 2,
        width: 16,
        depth: 24,
        height: 24,
        rotation: 90,
      }),
      make(
        "cylinder",
        `Fijación superior ${suffix}`,
        {
          x,
          y: 41,
          z: z - 20,
          width: 5,
          depth: 5,
          height: 8,
          rotationX: 90,
        },
        "hole",
      ),
      make(
        "cylinder",
        `Fijación inferior ${suffix}`,
        {
          x,
          y: 13,
          z: z - 20,
          width: 5,
          depth: 5,
          height: 8,
          rotationX: 90,
        },
        "hole",
      ),
    ];
  }

  if (design === "cable-guide") {
    const channels = [-18, 0, 18].map((offset, channelIndex) =>
      make(
        "cylinder",
        `Canal ${channelIndex + 1}`,
        {
          x: x + offset,
          y: 2,
          z,
          width: 10,
          depth: 10,
          height: 10,
        },
        "hole",
      ),
    );
    return [
      make("cube", `Base guía ${suffix}`, {
        x,
        z,
        width: 62,
        depth: 24,
        height: 8,
      }),
      ...channels,
    ];
  }

  if (design === "corner-bracket") {
    const holes = [-18, 18].flatMap((offset, holeIndex) => [
      make(
        "cylinder",
        `Agujero base ${holeIndex + 1}`,
        {
          x: x + offset,
          y: -1,
          z: z + 10,
          width: 5,
          depth: 5,
          height: 8,
        },
        "hole",
      ),
      make(
        "cylinder",
        `Agujero vertical ${holeIndex + 1}`,
        {
          x: x + offset,
          y: 23,
          z: z - 22,
          width: 5,
          depth: 5,
          height: 8,
          rotationX: 90,
        },
        "hole",
      ),
    ]);
    return [
      make("cube", `Ala base ${suffix}`, {
        x,
        z: z + 2,
        width: 54,
        depth: 48,
        height: 5,
      }),
      make("cube", `Ala vertical ${suffix}`, {
        x,
        y: 0,
        z: z - 22,
        width: 54,
        depth: 5,
        height: 48,
      }),
      make("wedge", `Refuerzo central ${suffix}`, {
        x,
        y: 3,
        z: z - 18,
        width: 7,
        depth: 34,
        height: 34,
        rotation: 90,
      }),
      ...holes,
    ];
  }

  if (design === "sensor-case") {
    return [
      make("cube", `Base carcasa ${suffix}`, {
        x,
        z,
        width: 58,
        depth: 42,
        height: 3,
      }),
      make("cube", `Frente carcasa ${suffix}`, {
        x,
        y: 2.5,
        z: z + 19.5,
        width: 58,
        depth: 3,
        height: 24,
      }),
      make("cube", `Fondo carcasa ${suffix}`, {
        x,
        y: 2.5,
        z: z - 19.5,
        width: 58,
        depth: 3,
        height: 24,
      }),
      make("cube", `Lateral izquierdo ${suffix}`, {
        x: x - 27.5,
        y: 2.5,
        z,
        width: 3,
        depth: 36,
        height: 24,
      }),
      make("cube", `Lateral derecho ${suffix}`, {
        x: x + 27.5,
        y: 2.5,
        z,
        width: 3,
        depth: 36,
        height: 24,
      }),
      make("cube", `Tapa carcasa ${suffix}`, {
        x,
        y: 26,
        z,
        width: 58,
        depth: 42,
        height: 2.5,
      }),
      make(
        "cube",
        `Ventana sensor ${suffix}`,
        {
          x,
          y: 14,
          z: z + 19,
          width: 22,
          depth: 10,
          height: 8,
          rotationX: 90,
        },
        "hole",
      ),
      make(
        "cylinder",
        `Paso de cable ${suffix}`,
        {
          x: x + 18,
          y: 10,
          z: z - 23,
          width: 7,
          depth: 7,
          height: 9,
          rotationX: 90,
        },
        "hole",
      ),
    ];
  }

  if (design === "desk-organizer") {
    return [
      make("cube", `Base organizador ${suffix}`, {
        x, z, width: 120, depth: 82, height: 3,
      }),
      make("cube", `Frente organizador ${suffix}`, {
        x, y: 2.5, z: z + 39.5, width: 120, depth: 3, height: 24,
      }),
      make("cube", `Fondo organizador ${suffix}`, {
        x, y: 2.5, z: z - 39.5, width: 120, depth: 3, height: 24,
      }),
      make("cube", `Lateral izquierdo ${suffix}`, {
        x: x - 58.5, y: 2.5, z, width: 3, depth: 76, height: 24,
      }),
      make("cube", `Lateral derecho ${suffix}`, {
        x: x + 58.5, y: 2.5, z, width: 3, depth: 76, height: 24,
      }),
      make("cube", `Divisor izquierdo ${suffix}`, {
        x: x - 20, y: 2.5, z, width: 3, depth: 76, height: 18,
      }),
      make("cube", `Divisor derecho ${suffix}`, {
        x: x + 20, y: 2.5, z, width: 3, depth: 76, height: 18,
      }),
    ];
  }

  if (design === "battery-holder") {
    return [
      make("cube", `Base portabaterías ${suffix}`, {
        x, z, width: 82, depth: 54, height: 3,
      }),
      make("cube", `Frente portabaterías ${suffix}`, {
        x, y: 2.5, z: z + 25.5, width: 82, depth: 3, height: 18,
      }),
      make("cube", `Fondo portabaterías ${suffix}`, {
        x, y: 2.5, z: z - 25.5, width: 82, depth: 3, height: 18,
      }),
      make("cube", `Lateral izquierdo ${suffix}`, {
        x: x - 39.5, y: 2.5, z, width: 3, depth: 48, height: 18,
      }),
      make("cube", `Lateral derecho ${suffix}`, {
        x: x + 39.5, y: 2.5, z, width: 3, depth: 48, height: 18,
      }),
      ...[-20, 0, 20].map((offset, dividerIndex) =>
        make("cube", `Divisor batería ${dividerIndex + 1}`, {
          x: x + offset, y: 2.5, z, width: 2.5, depth: 48, height: 14,
        }),
      ),
    ];
  }

  if (design === "headphone-hook") {
    return [
      make("cube", `Placa soporte auricular ${suffix}`, {
        x, z: z - 22, width: 54, depth: 42, height: 5,
      }),
      make("cube", `Brazo soporte auricular ${suffix}`, {
        x, y: 4.5, z: z + 18, width: 18, depth: 64, height: 8.5,
      }),
      make("cube", `Tope soporte auricular ${suffix}`, {
        x, y: 5, z: z + 48, width: 28, depth: 7, height: 22,
      }),
      make("wedge", `Refuerzo soporte auricular ${suffix}`, {
        x, y: 4, z: z - 3, width: 14, depth: 28, height: 24, rotation: 90,
      }),
      ...[-16, 16].map((offset, holeIndex) =>
        make(
          "cylinder",
          `Fijación auricular ${holeIndex + 1}`,
          {
            x: x + offset, y: -1, z: z - 22,
            width: 5, depth: 5, height: 8,
          },
          "hole",
        ),
      ),
    ];
  }

  if (design === "plant-marker") {
    return [
      make("cube", `Estaca marcador ${suffix}`, {
        x, z: z - 38, width: 11, depth: 72, height: 3,
      }),
      make("cube", `Placa marcador ${suffix}`, {
        x, z: z + 20, width: 34, depth: 46, height: 3,
      }),
      {
        ...make("text", `Texto marcador ${suffix}`, {
          x, y: 2.8, z: z + 20, width: 5.5, depth: 2, height: 1.5,
        }),
        text: "PLANTA",
      },
    ];
  }

  if (design === "key-rack") {
    const hooks = [-42, -14, 14, 42].flatMap((offset, hookIndex) => [
      make("cube", `Brazo llave ${hookIndex + 1}`, {
        x: x + offset, y: 3.5, z: z + 29, width: 9, depth: 28, height: 7.5,
      }),
      make("cube", `Tope llave ${hookIndex + 1}`, {
        x: x + offset, y: 4, z: z + 41, width: 13, depth: 6, height: 17,
      }),
    ]);
    return [
      make("cube", `Placa llaves ${suffix}`, {
        x, z, width: 120, depth: 48, height: 4,
      }),
      ...hooks,
      ...[-51, 51].map((offset, holeIndex) =>
        make(
          "cylinder",
          `Fijación llaves ${holeIndex + 1}`,
          { x: x + offset, y: -1, z: z - 11, width: 5, depth: 5, height: 7 },
          "hole",
        ),
      ),
    ];
  }

  if (design === "sd-card-holder") {
    const slots = [-30, -18, -6, 6, 18, 30].map((offset, slotIndex) =>
      make(
        "cube",
        `Ranura SD ${slotIndex + 1}`,
        { x: x + offset, y: -1, z, width: 4, depth: 24, height: 12 },
        "hole",
      ),
    );
    return [
      make("cube", `Base tarjetas SD ${suffix}`, {
        x, z, width: 82, depth: 38, height: 9,
      }),
      ...slots,
    ];
  }

  if (design === "pen-cup") {
    return [
      make("tube", `Cuerpo portalápices ${suffix}`, {
        x, z, width: 72, depth: 64, height: 95,
      }),
      make("cylinder", `Base portalápices ${suffix}`, {
        x, z, width: 72, depth: 72, height: 4,
      }),
    ];
  }

  if (design === "mini-shelf") {
    return [
      make("cube", `Base estante ${suffix}`, {
        x, z: z + 2, width: 110, depth: 70, height: 5,
      }),
      make("cube", `Respaldo estante ${suffix}`, {
        x, y: 4, z: z - 31.5, width: 110, depth: 7, height: 58,
      }),
      make("wedge", `Refuerzo izquierdo ${suffix}`, {
        x: x - 40, y: 4, z: z - 25, width: 8, depth: 42, height: 42, rotation: 90,
      }),
      make("wedge", `Refuerzo derecho ${suffix}`, {
        x: x + 40, y: 4, z: z - 25, width: 8, depth: 42, height: 42, rotation: 90,
      }),
      ...[-34, 34].map((offset, holeIndex) =>
        make(
          "cylinder",
          `Fijación estante ${holeIndex + 1}`,
          {
            x: x + offset, y: 36, z: z - 34,
            width: 5, depth: 5, height: 10, rotationX: 90,
          },
          "hole",
        ),
      ),
    ];
  }

  if (design === "remote-holder") {
    return [
      make("cube", `Base soporte control ${suffix}`, {
        x, z, width: 66, depth: 44, height: 4,
      }),
      make("cube", `Respaldo soporte control ${suffix}`, {
        x, y: 3, z: z - 20.5, width: 66, depth: 3, height: 82,
      }),
      make("cube", `Frente soporte control ${suffix}`, {
        x, y: 3, z: z + 20.5, width: 66, depth: 3, height: 24,
      }),
      make("cube", `Lateral izquierdo control ${suffix}`, {
        x: x - 31.5, y: 3, z, width: 3, depth: 38, height: 48,
      }),
      make("cube", `Lateral derecho control ${suffix}`, {
        x: x + 31.5, y: 3, z, width: 3, depth: 38, height: 48,
      }),
    ];
  }

  if (design === "control-knob") {
    const ribs = Array.from({ length: 8 }, (_, ribIndex) => {
      const angle = (ribIndex / 8) * Math.PI * 2;
      return make("cube", `Agarre perilla ${ribIndex + 1}`, {
        x: x + Math.cos(angle) * 15,
        z: z + Math.sin(angle) * 15,
        width: 7,
        depth: 11,
        height: 20,
        rotation: (ribIndex / 8) * 360,
      });
    });
    return [
      make("cylinder", `Cuerpo perilla ${suffix}`, {
        x, z, width: 34, depth: 34, height: 22,
      }),
      ...ribs,
      make(
        "cylinder",
        `Alojamiento eje ${suffix}`,
        { x, y: -1, z, width: 6, depth: 6, height: 26 },
        "hole",
      ),
    ];
  }

  if (design === "pcb-mount") {
    const posts = [
      [-29, -18],
      [29, -18],
      [29, 18],
      [-29, 18],
    ].map(([offsetX, offsetZ], postIndex) =>
      make("cylinder", `Separador PCB ${postIndex + 1}`, {
        x: x + offsetX,
        y: 2.5,
        z: z + offsetZ,
        width: 9,
        depth: 9,
        height: 9,
      }),
    );
    return [
      make("cube", `Base PCB ${suffix}`, {
        x, z, width: 80, depth: 58, height: 3,
      }),
      ...posts,
    ];
  }

  if (design === "mini-planter") {
    return [
      make("tube", `Cuerpo maceta ${suffix}`, {
        x, z, width: 70, depth: 60, height: 68,
      }),
      make("cylinder", `Base maceta ${suffix}`, {
        x, z, width: 70, depth: 70, height: 4,
      }),
      make(
        "cylinder",
        `Drenaje maceta ${suffix}`,
        { x, y: -1, z, width: 6, depth: 6, height: 10 },
        "hole",
      ),
    ];
  }

  if (design === "toothbrush-holder") {
    const holes = [-27, -9, 9, 27].map((offset, holeIndex) =>
      make(
        "cylinder",
        `Alojamiento cepillo ${holeIndex + 1}`,
        { x: x + offset, y: -1, z, width: 10, depth: 10, height: 13 },
        "hole",
      ),
    );
    return [
      make("cube", `Base portacepillos ${suffix}`, {
        x, z, width: 78, depth: 42, height: 9,
      }),
      ...holes,
    ];
  }

  if (design === "soap-dish") {
    const drains = [-32, -16, 0, 16, 32].map((offset, drainIndex) =>
      make(
        "cube",
        `Drenaje jabonera ${drainIndex + 1}`,
        { x: x + offset, y: -1, z, width: 7, depth: 46, height: 13 },
        "hole",
      ),
    );
    return [
      make("cube", `Base jabonera ${suffix}`, {
        x, z, width: 100, depth: 66, height: 8,
      }),
      ...drains,
    ];
  }

  if (design === "drawer-divider") {
    return [
      make("cube", `Divisor largo ${suffix}`, {
        x, z, width: 120, depth: 3, height: 42,
      }),
      make("cube", `Divisor transversal ${suffix}`, {
        x, z, width: 3, depth: 90, height: 42,
      }),
      make("cube", `Pie divisor izquierdo ${suffix}`, {
        x: x - 48, z, width: 20, depth: 14, height: 3,
      }),
      make("cube", `Pie divisor derecho ${suffix}`, {
        x: x + 48, z, width: 20, depth: 14, height: 3,
      }),
    ];
  }

  if (design === "cable-spool") {
    return [
      make("cylinder", `Disco inferior carrete ${suffix}`, {
        x, z, width: 72, depth: 72, height: 4,
      }),
      make("cylinder", `Núcleo carrete ${suffix}`, {
        x, y: 3.5, z, width: 20, depth: 20, height: 45,
      }),
      make("cylinder", `Disco superior carrete ${suffix}`, {
        x, y: 48, z, width: 72, depth: 72, height: 4,
      }),
    ];
  }

  if (design === "door-stop") {
    return [
      make("wedge", `Cuña puerta ${suffix}`, {
        x, z, width: 42, depth: 88, height: 28,
      }),
      ...[-20, 0, 20].map((offset, ribIndex) =>
        make("cube", `Nervadura tope ${ribIndex + 1}`, {
          x, y: 1, z: z + offset, width: 44, depth: 4, height: 3,
        }),
      ),
    ];
  }

  if (design === "bookend") {
    return [
      make("cube", `Base sujetalibros ${suffix}`, {
        x, z: z + 4, width: 76, depth: 84, height: 4,
      }),
      make("cube", `Respaldo sujetalibros ${suffix}`, {
        x, y: 3, z: z - 36, width: 76, depth: 6, height: 108,
      }),
      make("wedge", `Refuerzo izquierdo sujetalibros ${suffix}`, {
        x: x - 25, y: 3, z: z - 29, width: 8, depth: 50, height: 50, rotation: 90,
      }),
      make("wedge", `Refuerzo derecho sujetalibros ${suffix}`, {
        x: x + 25, y: 3, z: z - 29, width: 8, depth: 50, height: 50, rotation: 90,
      }),
    ];
  }

  if (design === "led-channel") {
    return [
      make("cube", `Base canal LED ${suffix}`, {
        x, z, width: 120, depth: 18, height: 2,
      }),
      make("cube", `Guía izquierda LED ${suffix}`, {
        x, y: 1.5, z: z - 8, width: 120, depth: 2, height: 6.5,
      }),
      make("cube", `Guía derecha LED ${suffix}`, {
        x, y: 1.5, z: z + 8, width: 120, depth: 2, height: 6.5,
      }),
      make("cube", `Tope canal LED ${suffix}`, {
        x: x - 59, y: 1.5, z, width: 2, depth: 16, height: 6.5,
      }),
    ];
  }

  if (design === "label-tag") {
    return [
      make("cube", `Base etiqueta ${suffix}`, {
        x, z, width: 76, depth: 30, height: 3,
      }),
      {
        ...make("text", `Texto etiqueta ${suffix}`, {
          x: x + 7, y: 2.8, z, width: 5.2, depth: 2, height: 1.5,
        }),
        text: "NOMBRE",
      },
      make(
        "cylinder",
        `Agujero etiqueta ${suffix}`,
        { x: x - 30, y: -1, z, width: 5, depth: 5, height: 7 },
        "hole",
      ),
    ];
  }

  if (design === "bit-organizer") {
    const sockets = [-42, -30, -18, -6, 6, 18, 30, 42].map((offset, socketIndex) =>
      make("tube", `Casquillo punta ${socketIndex + 1}`, {
        x: x + offset, y: 5, z, width: 10, depth: 6, height: 10,
      }),
    );
    return [
      make("cube", `Base organizador de puntas ${suffix}`, {
        x, z, width: 108, depth: 42, height: 6,
      }),
      ...sockets,
    ];
  }

  if (design === "switch-plate") {
    return [
      make("cube", `Placa interruptor ${suffix}`, {
        x, z, width: 86, depth: 86, height: 4,
      }),
      make("cube", `Marco superior interruptor ${suffix}`, {
        x, y: 3, z: z - 23, width: 54, depth: 4, height: 3,
      }),
      make("cube", `Marco inferior interruptor ${suffix}`, {
        x, y: 3, z: z + 23, width: 54, depth: 4, height: 3,
      }),
      make("cube", `Marco izquierdo interruptor ${suffix}`, {
        x: x - 25, y: 3, z, width: 4, depth: 46, height: 3,
      }),
      make("cube", `Marco derecho interruptor ${suffix}`, {
        x: x + 25, y: 3, z, width: 4, depth: 46, height: 3,
      }),
      make(
        "cube",
        `Ventana interruptor ${suffix}`,
        { x, y: -1, z, width: 42, depth: 42, height: 9 },
        "hole",
      ),
      make(
        "cylinder",
        `Fijación superior interruptor ${suffix}`,
        { x, y: -1, z: z - 34, width: 4, depth: 4, height: 8 },
        "hole",
      ),
      make(
        "cylinder",
        `Fijación inferior interruptor ${suffix}`,
        { x, y: -1, z: z + 34, width: 4, depth: 4, height: 8 },
        "hole",
      ),
    ];
  }

  if (design === "napkin-holder") {
    return [
      make("cube", `Base servilletero ${suffix}`, {
        x, z, width: 112, depth: 76, height: 5,
      }),
      make("cube", `Lateral izquierdo servilletero ${suffix}`, {
        x: x - 51, y: 4, z, width: 10, depth: 72, height: 68,
      }),
      make("cube", `Lateral derecho servilletero ${suffix}`, {
        x: x + 51, y: 4, z, width: 10, depth: 72, height: 68,
      }),
      make("cube", `Apoyo posterior servilletero ${suffix}`, {
        x, y: 4, z: z - 33, width: 102, depth: 10, height: 22,
      }),
      make(
        "cube",
        `Ventana izquierda servilletero ${suffix}`,
        { x: x - 51, y: 19, z: z + 3, width: 14, depth: 48, height: 34 },
        "hole",
      ),
      make(
        "cube",
        `Ventana derecha servilletero ${suffix}`,
        { x: x + 51, y: 19, z: z + 3, width: 14, depth: 48, height: 34 },
        "hole",
      ),
    ];
  }

  return [
    make("cube", `Placa cartel ${suffix}`, {
      x,
      z,
      width: 90,
      depth: 34,
      height: 3,
    }),
    {
      ...make("text", `Texto cartel ${suffix}`, {
        x,
        y: 2.8,
        z,
        width: 7,
        depth: 2,
        height: 1.8,
      }),
      text: "FORJA",
    },
    make(
      "cylinder",
      `Agujero izquierdo ${suffix}`,
      {
        x: x - 38,
        y: -1,
        z,
        width: 4,
        depth: 4,
        height: 6,
      },
      "hole",
    ),
    make(
      "cylinder",
      `Agujero derecho ${suffix}`,
      {
        x: x + 38,
        y: -1,
        z,
        width: 4,
        depth: 4,
        height: 6,
      },
      "hole",
    ),
  ];
}

export function createFreePreset(
  preset: FreePresetId,
  index: number,
  point: WorkplanePoint,
  idFactory: (prefix: string) => string,
): CustomObject[] {
  if (preset === "washer") {
    const solid = createFreePrimitive({
      kind: "cylinder",
      operation: "solid",
      index,
      point,
      idFactory,
    });
    const hole = createFreePrimitive({
      kind: "cylinder",
      operation: "hole",
      index: index + 1,
      point,
      idFactory,
    });
    return [
      {
        ...solid,
        name: `Arandela ${index + 1}`,
        width: 24,
        depth: 24,
        height: 4,
      },
      {
        ...hole,
        name: `Hueco arandela ${index + 1}`,
        y: -1,
        width: 12,
        depth: 12,
        height: 6,
      },
    ];
  }

  if (preset === "spacer") {
    return [
      {
        ...createFreePrimitive({
          kind: "tube",
          operation: "solid",
          index,
          point,
          idFactory,
        }),
        name: `Separador ${index + 1}`,
        width: 10,
        depth: 4,
        height: 12,
      },
    ];
  }

  if (preset === "mounting-tab") {
    const tab = createFreePrimitive({
      kind: "cube",
      operation: "solid",
      index,
      point,
      idFactory,
    });
    const hole = createFreePrimitive({
      kind: "cylinder",
      operation: "hole",
      index: index + 1,
      point,
      idFactory,
    });
    return [
      {
        ...tab,
        name: `Oreja de montaje ${index + 1}`,
        width: 28,
        depth: 18,
        height: 4,
      },
      {
        ...hole,
        name: `Agujero de montaje ${index + 1}`,
        x: point.x + 7,
        y: -1,
        width: 5,
        depth: 5,
        height: 6,
      },
    ];
  }

  if (preset === "foot") {
    return [
      {
        ...createFreePrimitive({
          kind: "cylinder",
          operation: "solid",
          index,
          point,
          idFactory,
        }),
        name: `Pata ${index + 1}`,
        width: 18,
        depth: 18,
        height: 8,
      },
    ];
  }

  const object = createFreePrimitive({
    kind: preset === "plate" ? "cube" : "cylinder",
    operation: "solid",
    index,
    point,
    idFactory,
  });
  return [
    preset === "plate"
      ? {
          ...object,
          name: `Placa ${index + 1}`,
          width: 40,
          depth: 30,
          height: 3,
        }
      : {
          ...object,
          name: `Poste ${index + 1}`,
          width: 8,
          depth: 8,
          height: 20,
        },
  ];
}

function editableHole(
  hole: Cutout,
  surface: "base" | "front",
  surfaceDepth: number,
  surfaceHeight: number,
  frontZ: number,
  idFactory: (prefix: string) => string,
): CustomObject {
  const isRound = hole.kind === "round";
  const cutterDepth = Math.max(6, surfaceDepth + 4);
  if (surface === "base") {
    return {
      ...createFreePrimitive({
        kind: isRound ? "cylinder" : "cube",
        operation: "hole",
        index: 0,
        point: { x: hole.x, z: hole.z },
        idFactory,
      }),
      name: isRound ? "Agujero de plantilla" : "Recorte de plantilla",
      y: -1,
      width: hole.width,
      depth: isRound ? hole.width : hole.height,
      height: surfaceHeight + 2,
    };
  }

  return {
    ...createFreePrimitive({
      kind: isRound ? "cylinder" : "cube",
      operation: "hole",
      index: 0,
      point: { x: hole.x, z: frontZ - cutterDepth / 2 },
      idFactory,
    }),
    name: isRound ? "Agujero frontal" : "Recorte frontal",
    y: surfaceHeight / 2 + hole.z,
    width: hole.width,
    depth: isRound ? hole.width : hole.height,
    height: cutterDepth,
    rotationX: 90,
  };
}

export function createEditableTemplateDesign(
  templateId: Exclude<TemplateId, "free">,
  parameters: ModelParameters,
  options: EditableTemplateOptions,
  idFactory: (prefix: string) => string,
): CustomObject[] {
  const objects: CustomObject[] = [];
  const make = (
    kind: ObjectKind,
    name: string,
    overrides: Partial<CustomObject>,
  ): CustomObject => ({
    ...createFreePrimitive({
      kind,
      operation: "solid",
      index: objects.length,
      idFactory,
    }),
    name,
    ...overrides,
  });

  if (templateId === "plate") {
    objects.push(
      make("cube", "Placa editable", {
        width: parameters.width,
        depth: parameters.depth,
        height: parameters.thickness,
      }),
    );
    options.holes.forEach((hole) => {
      objects.push(
        editableHole(
          hole,
          "base",
          parameters.thickness,
          parameters.thickness,
          0,
          idFactory,
        ),
      );
    });
  }

  if (templateId === "bracket") {
    objects.push(
      make("cube", "Ala horizontal editable", {
        width: parameters.width,
        depth: parameters.depth,
        height: parameters.thickness,
      }),
      make("cube", "Ala vertical editable", {
        y: 0,
        z: -parameters.depth / 2 + parameters.thickness / 2,
        width: parameters.width,
        depth: parameters.thickness,
        height: parameters.height,
      }),
    );
    options.holes.forEach((hole) => {
      objects.push(
        editableHole(
          hole,
          hole.face,
          parameters.thickness,
          hole.face === "front" ? parameters.height : parameters.thickness,
          -parameters.depth / 2,
          idFactory,
        ),
      );
    });
  }

  if (templateId === "box") {
    const wallHeight = parameters.height - parameters.bottom;
    objects.push(
      make("cube", "Base editable", {
        width: parameters.width,
        depth: parameters.depth,
        height: parameters.bottom,
      }),
      make("cube", "Pared frontal", {
        y: parameters.bottom,
        z: parameters.depth / 2 - parameters.wall / 2,
        width: parameters.width,
        depth: parameters.wall,
        height: wallHeight,
      }),
      make("cube", "Pared trasera", {
        y: parameters.bottom,
        z: -parameters.depth / 2 + parameters.wall / 2,
        width: parameters.width,
        depth: parameters.wall,
        height: wallHeight,
      }),
      make("cube", "Pared izquierda", {
        x: -parameters.width / 2 + parameters.wall / 2,
        y: parameters.bottom,
        width: parameters.wall,
        depth: parameters.depth - parameters.wall * 2,
        height: wallHeight,
      }),
      make("cube", "Pared derecha", {
        x: parameters.width / 2 - parameters.wall / 2,
        y: parameters.bottom,
        width: parameters.wall,
        depth: parameters.depth - parameters.wall * 2,
        height: wallHeight,
      }),
    );
    options.holes.forEach((hole) => {
      objects.push(
        editableHole(
          hole,
          hole.face,
          parameters.wall,
          hole.face === "front" ? parameters.height : parameters.bottom,
          parameters.depth / 2,
          idFactory,
        ),
      );
    });

    if (options.standoffCount > 0) {
      const x = Math.max(
        0,
        parameters.width / 2 - parameters.wall - options.standoffDiameter / 2 - 3,
      );
      const z = Math.max(
        0,
        parameters.depth / 2 - parameters.wall - options.standoffDiameter / 2 - 3,
      );
      const positions = options.standoffCount === 2
        ? [[-x, -z], [x, z]]
        : [[-x, -z], [x, -z], [x, z], [-x, z]];
      positions.forEach(([positionX, positionZ], positionIndex) => {
        objects.push(
          make("tube", `Soporte interno ${positionIndex + 1}`, {
            x: positionX,
            y: parameters.bottom,
            z: positionZ,
            width: options.standoffDiameter,
            depth: options.standoffHole,
            height: options.standoffHeight,
          }),
        );
      });
    }

    if (options.lidStyle !== "none") {
      objects.push(
        make("cube", "Tapa editable", {
          y: 0,
          z: parameters.depth + 8,
          width: parameters.width,
          depth: parameters.depth,
          height: options.lidThickness,
        }),
      );
    }
  }

  return [...objects, ...options.objects.map((object) => ({ ...object }))];
}
