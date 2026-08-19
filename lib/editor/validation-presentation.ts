type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  severity: ValidationSeverity;
  title: string;
  detail: string;
  action: string;
};

export function describeValidationIssue(
  message: string,
  severity: ValidationSeverity,
) {
  const recorte = message.match(/recorte\s+(\d+)/i)?.[1];
  const figura = message.match(/figura\s+(\d+)/i)?.[1];
  const tubo = message.match(/tubo\s+(\d+)/i)?.[1];

  if (recorte) {
    return {
      title: `Recorte ${recorte}`,
      detail: "El recorte queda fuera de la cara donde intentás usarlo.",
      action: "Movelo hacia adentro de la cara o reducí su medida.",
    };
  }
  if (figura) {
    return {
      title: `Figura ${figura}`,
      detail: "Una de las figuras tiene una medida o una posición que no se puede usar así.",
      action: "Seleccioná la figura y corregí sus medidas o posición.",
    };
  }
  if (tubo) {
    return {
      title: `Tubo ${tubo}`,
      detail: "El diámetro interior del tubo es demasiado grande para su borde exterior.",
      action: "Reducí el diámetro interior o aumentá el exterior.",
    };
  }
  if (message.includes("mayores que cero")) {
    return {
      title: "Medidas de la pieza",
      detail: message,
      action: "Revisá los campos de medidas y usá valores mayores que 0 mm.",
    };
  }
  if (message.includes("espesor ocupa")) {
    return {
      title: "Espesor de pared",
      detail: "Las paredes ocupan todo el interior de la caja.",
      action: "Bajá el espesor o aumentá ancho/profundidad.",
    };
  }
  if (message.includes("base debe")) {
    return {
      title: "Base de la caja",
      detail: "La base quedó demasiado gruesa para la altura total.",
      action: "Reducí el espesor de base o aumentá la altura.",
    };
  }
  if (message.includes("dos alas")) {
    return {
      title: "Espesor del soporte",
      detail: "El espesor es demasiado grande para el tamaño del soporte.",
      action: "Reducí el espesor o aumentá las alas del soporte.",
    };
  }
  if (message.includes("sólido")) {
    return {
      title: "Diseño libre",
      detail: "Todavía no hay una pieza sólida sobre la que aplicar recortes.",
      action: "Agregá un sólido y después usá recortes si los necesitás.",
    };
  }
  if (message.includes("soporte debe")) {
    return {
      title: "Soporte interno",
      detail: "El agujero del soporte es demasiado grande para el borde que lo rodea.",
      action: "Hacé el agujero más chico que el diámetro exterior.",
    };
  }
  if (message.includes("frágil")) {
    return {
      title: "Pieza delicada",
      detail: "Una de las medidas puede dejar la pieza demasiado fina.",
      action: "Podés exportar igual, pero conviene aumentar ese espesor.",
    };
  }
  if (message.includes("supera el volumen")) {
    return {
      title: "Tamaño de la pieza",
      detail: "La pieza supera el volumen de referencia de impresión.",
      action: "Reducí sus medidas o revisá si entra en tu impresora.",
    };
  }
  return {
    title: severity === "error" ? "Revisá la pieza" : "Advertencia",
    detail: message,
    action:
      severity === "error"
        ? "Corregí este punto antes de exportar."
        : "Podés exportar, pero conviene revisar esta medida.",
  };
}

export function getValidationIssues(validation: {
  errors: string[];
  warnings: string[];
}): ValidationIssue[] {
  return [
    ...validation.errors.map((message) => ({
      severity: "error" as const,
      ...describeValidationIssue(message, "error"),
    })),
    ...validation.warnings.map((message) => ({
      severity: "warning" as const,
      ...describeValidationIssue(message, "warning"),
    })),
  ];
}
