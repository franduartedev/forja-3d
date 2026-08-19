import type { TemplateId } from "../models";

type EditorValidation = {
  errors: string[];
  warnings: string[];
};

export type EditorStatusInput = {
  templateId: TemplateId;
  validation: EditorValidation;
  hasPrintableGeometry: boolean;
  showReview: boolean;
  exporting: string | null;
};

export type EditorStatus = {
  isValid: boolean;
  canExport: boolean;
  geometryStatusLabel: string;
  exportStatusLabel: string;
  statusTone: "ready" | "error" | "idle";
  statusDetail: string;
  nextStepLabel: string;
  statusActionLabel: string;
  topbarPrimaryLabel: string;
};

export function getEditorStatus({
  templateId,
  validation,
  hasPrintableGeometry,
  showReview,
  exporting,
}: EditorStatusInput): EditorStatus {
  const isValid = validation.errors.length === 0;
  const canExport = isValid && hasPrintableGeometry;
  const geometryStatusLabel = !isValid
    ? "Necesita corrección"
    : hasPrintableGeometry ? "Modelo válido" : "Sin sólidos";
  const exportStatusLabel = canExport
    ? "Listo para exportar"
    : "Exportación bloqueada";
  const statusTone: "ready" | "error" | "idle" = !isValid
    ? "error"
    : canExport ? "ready" : "idle";
  const statusDetail = !hasPrintableGeometry
    ? "Agregá al menos una forma sólida para poder comprobar y exportar."
    : !isValid
      ? `${validation.errors.length} ${validation.errors.length === 1 ? "problema bloquea" : "problemas bloquean"} la exportación.`
      : validation.warnings.length > 0
        ? `${validation.warnings.length} ${validation.warnings.length === 1 ? "advertencia para revisar" : "advertencias para revisar"} antes de exportar.`
        : "La pieza no tiene problemas detectados.";
  const nextStepLabel = !hasPrintableGeometry
    ? "Próximo paso: agregá una forma para empezar la pieza."
    : !isValid
      ? "Próximo paso: revisá y corregí los problemas marcados."
      : showReview
        ? "Último paso: exportá el STL."
        : "Próximo paso: abrí Comprobación.";
  const statusActionLabel = !hasPrintableGeometry
    ? templateId === "free"
      ? "Agregar forma"
      : "Ajustar medidas"
    : !showReview
      ? "Comprobar"
      : !isValid
        ? "Corregir problemas"
        : "Exportar STL";
  const topbarPrimaryLabel = !hasPrintableGeometry
    ? templateId === "free"
      ? "Agregar forma"
      : "Ajustar medidas"
    : !showReview
      ? "Comprobar"
      : !isValid
        ? "Corregir problemas"
        : exporting === "stl"
          ? "Generando…"
          : "Exportar STL";

  return {
    isValid,
    canExport,
    geometryStatusLabel,
    exportStatusLabel,
    statusTone,
    statusDetail,
    nextStepLabel,
    statusActionLabel,
    topbarPrimaryLabel,
  };
}
