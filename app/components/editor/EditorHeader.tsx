"use client";

type AutoSaveState = "waiting" | "saving" | "saved";

type EditorHeaderProps = {
  modalOpen: boolean;
  showReview: boolean;
  canExport: boolean;
  autoSaveState: AutoSaveState;
  tutorialCompleted: boolean;
  savedProjectCount: number;
  topbarPrimaryLabel: string;
  primaryActionDisabled: boolean;
  onHome: () => void;
  onSave: () => void;
  onTutorial: () => void;
  onLibrary: () => void;
  onDesignGallery: () => void;
  onFeedback: () => void;
  onPrimaryAction: () => void;
};

function closeContainingMenu(target: HTMLElement) {
  target.closest("details")?.removeAttribute("open");
}

export default function EditorHeader({
  modalOpen,
  showReview,
  canExport,
  autoSaveState,
  tutorialCompleted,
  savedProjectCount,
  topbarPrimaryLabel,
  primaryActionDisabled,
  onHome,
  onSave,
  onTutorial,
  onLibrary,
  onDesignGallery,
  onFeedback,
  onPrimaryAction,
}: EditorHeaderProps) {
  return (
    <header
      className="topbar"
      aria-hidden={modalOpen || undefined}
      inert={modalOpen ? true : undefined}
    >
      <a
        className="brand"
        href="#"
        aria-label="FORJA, inicio"
        onClick={(event) => {
          event.preventDefault();
          onHome();
        }}
      >
        <span className="brand-logo" aria-hidden="true" />
        <small className="brand-tagline">Diseñá · validá · fabricá</small>
      </a>
      <nav className="top-actions" aria-label="Acciones del proyecto">
        <div className="workflow-steps" aria-label="Flujo de creación">
          <span className="active">Diseño</span>
          <span className={showReview ? "active" : ""}>Comprobación</span>
          <span className={canExport ? "active" : ""}>Exportación</span>
        </div>
        <div className="topbar-utility">
          <span className={`autosave-status ${autoSaveState}`} aria-live="polite">
            {autoSaveState === "saving" ? "Guardando" : autoSaveState === "saved" ? "Guardado" : "Auto"}
          </span>
          <button
            className="button ghost save-trigger"
            onClick={onSave}
          >
            Guardar
          </button>

          <details className="project-actions-menu">
            <summary
              aria-label="Más acciones del proyecto"
              title="Más acciones"
            >
              <span className="project-actions-label">
                Más
              </span>

              <span
                className="project-actions-chevron"
                aria-hidden="true"
              >
                ⌄
              </span>
            </summary>

            <div className="project-actions-popover">
              <button
                type="button"
                onClick={(event) => {
                  onTutorial();
                  closeContainingMenu(event.currentTarget);
                }}
              >
                <i aria-hidden="true">
                  {tutorialCompleted ? "✓" : "?"}
                </i>

                <span>
                  <strong>Aprender</strong>
                  <small>Volver a ver el tutorial</small>
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  onLibrary();
                  closeContainingMenu(event.currentTarget);
                }}
              >
                <i aria-hidden="true">▣</i>

                <span>
                  <strong>Mis proyectos</strong>
                  <small>
                    {savedProjectCount > 0
                      ? `${savedProjectCount} guardados`
                      : "Abrir biblioteca personal"}
                  </small>
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  onDesignGallery();
                  closeContainingMenu(event.currentTarget);
                }}
              >
                <i aria-hidden="true">◆</i>

                <span>
                  <strong>Diseños</strong>
                  <small>Explorar modelos de la biblioteca</small>
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  onFeedback();
                  closeContainingMenu(event.currentTarget);
                }}
              >
                <i aria-hidden="true">!</i>

                <span>
                  <strong>Reportar</strong>
                  <small>Contarnos un problema o sugerencia</small>
                </span>
              </button>
            </div>
          </details>
        </div>
        <button
          className="button primary compact"
          onClick={onPrimaryAction}
          disabled={primaryActionDisabled}
        >
          {topbarPrimaryLabel}
        </button>
      </nav>
    </header>
  );
}
