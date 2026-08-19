"use client";

type PieceStatusPanelProps = {
  statusLabel: string;
  statusTone: "ready" | "error" | "idle";
  detail: string;
  nextStep: string;
  errorCount: number;
  warningCount: number;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
};

export default function PieceStatusPanel({
  statusLabel,
  statusTone,
  detail,
  nextStep,
  errorCount,
  warningCount,
  actionLabel,
  actionDisabled = false,
  onAction,
}: PieceStatusPanelProps) {
  return (
    <section className={`piece-status-panel ${statusTone}`} aria-label="Estado de la pieza">
      <div className="piece-status-main">
        <span aria-hidden="true">{statusTone === "ready" ? "✓" : statusTone === "error" ? "!" : "+"}</span>
        <div>
          <strong>{statusLabel}</strong>
          <small>{detail}</small>
        </div>
      </div>
      <div className="piece-status-meta" aria-label="Problemas detectados">
        <span>{errorCount} errores</span>
        <span>{warningCount} advertencias</span>
      </div>
      <div className="piece-next-step">
        <span>{nextStep}</span>
        <button type="button" onClick={onAction} disabled={actionDisabled}>
          {actionLabel}
        </button>
      </div>
    </section>
  );
}
