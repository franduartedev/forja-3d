import type { TemplateId } from "../../lib/models";
import DesignGeometryPreview from "./DesignGeometryPreview";

type LandingPageProps = {
  recoveryDraftName?: string;
  projectCount: number;
  onStart: (template: TemplateId) => void;
  onTutorial: () => void;
  onLibrary: () => void;
  onImport: () => void;
  onRecover: () => void;
};

export default function LandingPage({
  recoveryDraftName,
  projectCount,
  onStart,
  onLibrary,
  onImport,
  onRecover,
}: LandingPageProps) {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FORJA",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    inLanguage: "es-AR",
    description:
      "Aplicación web para diseñar piezas imprimibles en 3D y exportarlas en STL, 3MF o STEP.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
  };

  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">
        Saltar al contenido
      </a>

      <header className="landing-header">
        <a className="landing-logo" href="#inicio" aria-label="FORJA, inicio" />
        <nav className="landing-desktop-nav" aria-label="Navegación principal">
          <a href="#producto">Producto</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#codigo-abierto">Código abierto</a>
        </nav>
        <details className="landing-mobile-menu">
          <summary aria-label="Abrir menú de navegación">
            <span>Menú</span>
            <i aria-hidden="true" />
          </summary>
          <nav aria-label="Navegación móvil">
            <a href="#producto">Producto</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#codigo-abierto">Código abierto</a>
          </nav>
        </details>
        <button className="landing-header-cta" onClick={() => onStart("box")}>
          Abrir editor
          <span aria-hidden="true">→</span>
        </button>
      </header>

      <main id="landing-main">
        <section className="landing-hero" id="inicio" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              Editor 3D en el navegador · Open source
            </span>
            <h1 id="landing-title">
              Creá piezas 3D a medida <em>sin aprender un CAD complejo.</em>
            </h1>
            <p>
              Partí de una plantilla o combiná formas, ajustá medidas reales,
              comprobá el modelo y descargá un STL para abrir en tu laminador.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-primary" onClick={() => onStart("box")}>
                Crear desde una plantilla
              </button>
              <button className="landing-secondary" onClick={() => onStart("free")}>
                Abrir editor libre
              </button>
              <a className="landing-tertiary" href="#como-funciona">
                Ver cómo funciona <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <figure className="landing-product-stage" id="producto">
            <div className="landing-product-heading">
              <span>MODELO GENERADO POR FORJA</span>
              <strong>Organizador de escritorio</strong>
            </div>
            <div className="landing-real-preview-stage">
              <DesignGeometryPreview
                designId="desk-organizer"
                name="Organizador de escritorio"
              />
            </div>
            <figcaption>
              <span><i aria-hidden="true" /> Medidas editables</span>
              <span><i aria-hidden="true" /> Modelo comprobado</span>
              <span><i aria-hidden="true" /> Exportar STL</span>
            </figcaption>
          </figure>
        </section>

        {recoveryDraftName && (
          <section className="landing-return" aria-label="Continuar trabajo reciente">
            <div><i aria-hidden="true">↻</i><span><small>Tu último borrador</small><strong>{recoveryDraftName}</strong></span></div>
            <button onClick={onRecover}>Continuar diseñando <span aria-hidden="true">→</span></button>
          </section>
        )}

        <ul className="landing-proof" aria-label="Características de FORJA">
          <li>Funciona en el navegador</li>
          <li>Proyectos guardados localmente</li>
          <li>Exportación STL</li>
          <li>Código abierto</li>
        </ul>

        <section className="landing-section landing-how" id="como-funciona" aria-labelledby="how-title">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">Cómo funciona</span>
            <h2 id="how-title">De una idea a un STL, en cuatro pasos.</h2>
            <p>FORJA organiza las decisiones de modelado en un recorrido visual y directo.</p>
          </div>
          <ol className="landing-process">
            <li><span>01</span><div><strong>Elegí un punto de partida</strong><p>Usá una plantilla o un diseño inicial editable.</p></div></li>
            <li><span>02</span><div><strong>Personalizá la pieza</strong><p>Ajustá medidas, formas y recortes.</p></div></li>
            <li><span>03</span><div><strong>Comprobá el modelo</strong><p>Revisá la geometría antes de exportar.</p></div></li>
            <li><span>04</span><div><strong>Descargá el STL</strong><p>Abrilo en OrcaSlicer, Cura o PrusaSlicer.</p></div></li>
          </ol>
        </section>

        <section className="landing-section landing-capabilities" id="posibilidades" aria-labelledby="capabilities-title">
          <div className="landing-capabilities-copy">
            <div className="landing-section-heading">
              <span className="landing-eyebrow">Capacidades actuales</span>
              <h2 id="capabilities-title">Herramientas concretas para construir y ajustar.</h2>
              <p>Empezá con estructura o construí libremente. Todo sigue siendo editable.</p>
            </div>
            <div className="landing-capability-columns">
              <ul>
                <li><strong>Plantillas paramétricas</strong><span>Cajas, soportes y placas con controles dedicados.</span></li>
                <li><strong>Editor libre</strong><span>Combiná sólidos y aplicá recortes.</span></li>
                <li><strong>Texto y formas básicas</strong><span>Agregá geometría y personalizá cada objeto.</span></li>
                <li><strong>Medidas en milímetros</strong><span>Definí dimensiones y posiciones numéricas.</span></li>
              </ul>
              <ul>
                <li><strong>Guardado local</strong><span>Conservá proyectos y archivos editables .forja.</span></li>
                <li><strong>Comprobación geométrica</strong><span>Revisá el modelo antes de descargarlo.</span></li>
                <li><strong>Exportación STL</strong><span>Continuá la preparación en tu laminador.</span></li>
              </ul>
            </div>
            <div className="landing-capability-actions">
              <button className="landing-primary single-line" onClick={() => onStart("box")}>Usar una plantilla <span aria-hidden="true">→</span></button>
              <button className="landing-secondary" onClick={() => onStart("free")}>Abrir editor libre</button>
            </div>
          </div>
          <figure className="landing-capability-preview">
            <div className="landing-capability-preview-stage">
              <DesignGeometryPreview designId="phone-stand" name="Soporte para celular" />
            </div>
            <figcaption><span>DISEÑO INICIAL EDITABLE</span><strong>Soporte para celular</strong><p>Geometría generada por el mismo pipeline que usa el editor.</p></figcaption>
          </figure>
        </section>

        <section className="landing-open" id="codigo-abierto" aria-labelledby="open-title">
          <div className="landing-open-heading">
            <span className="landing-eyebrow">Proyecto abierto y verificable</span>
            <h2 id="open-title">FORJA muestra con claridad qué hace hoy.</h2>
            <p>Una herramienta web desarrollada en Argentina, con código público y un alcance de producto explícito.</p>
            <a className="landing-source-link" href="https://github.com/franduartedev/forja-3d" target="_blank" rel="noreferrer">Ver repositorio en GitHub <span aria-hidden="true">↗</span></a>
          </div>
          <div className="landing-trust-facts">
            <ul>
              <li><span>Licencia</span><strong>AGPL-3.0</strong></li>
              <li><span>Código fuente</span><strong>Repositorio público en GitHub</strong></li>
              <li><span>Origen</span><strong>Desarrollado en Argentina</strong></li>
              <li><span>Proyectos</span><strong>Guardados localmente</strong></li>
              <li><span>Disponible</span><strong>Comprobación y exportación STL</strong></li>
              <li><span>En desarrollo</span><strong>Preparación de impresión y G-code</strong></li>
            </ul>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-title">
          <span className="landing-cta-grid" aria-hidden="true" />
          <div>
            <span className="landing-eyebrow">Tu próxima pieza empieza con una medida</span>
            <h2 id="final-title">Abrí FORJA y convertí esa idea en algo real.</h2>
            <p>Gratis, desde el navegador y sin tener que aprender un CAD complejo.</p>
          </div>
          <button className="landing-primary single-line" onClick={() => onStart("box")}>Crear un diseño <span aria-hidden="true">→</span></button>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-logo" href="#inicio" aria-label="FORJA, volver al inicio" />
        <p>Diseñá · validá · exportá. Hecho con curiosidad en Argentina.</p>
        <div>
          <button onClick={onLibrary}>Mis proyectos ({projectCount})</button>
          <button onClick={onImport}>Importar .forja</button>
          <a href="https://github.com/franduartedev/forja-3d" target="_blank" rel="noreferrer">Código fuente</a>
          <span>AGPL-3.0</span>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </div>
  );
}
