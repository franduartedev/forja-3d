"use client";

type PieceContextPreviewField = {
  key: string;
  label: string;
  value: number;
};

type PieceContextPanelProps = {
  isFreeTemplate: boolean;
  entrySummary: string;
  title: string;
  description: string;
  primaryFieldsPreview: PieceContextPreviewField[];
};

export default function PieceContextPanel({
  isFreeTemplate,
  entrySummary,
  title,
  description,
  primaryFieldsPreview,
}: PieceContextPanelProps) {
  return (
    <section className="piece-context-panel" aria-labelledby="piece-context-title">
      <span className="eyebrow">Diseño</span>
      <small>{entrySummary}</small>
      <h2 id="piece-context-title">
        {title}
      </h2>
      <p>{description}</p>
      {!isFreeTemplate && primaryFieldsPreview.length > 0 ? (
        <div className="piece-context-highlights" aria-label="Medidas principales">
          {primaryFieldsPreview.map((field) => (
            <div key={field.key}>
              <span>{field.label}</span>
              <strong>{field.value} mm</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="piece-context-tip">
          <strong>Primer paso recomendado</strong>
          <span>
            {isFreeTemplate
              ? "Abrí Biblioteca o Diseños y agregá la primera forma."
              : "Ajustá las medidas principales y después abrí Comprobación."}
          </span>
        </div>
      )}
    </section>
  );
}
