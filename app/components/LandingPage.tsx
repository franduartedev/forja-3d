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

const quickStarts: Array<{
  id: TemplateId;
  icon: string;
  name: string;
  detail: string;
}> = [
  { id: "box", icon: "▣", name: "Caja", detail: "Carcasas y gabinetes" },
  { id: "bracket", icon: "⌞", name: "Soporte L", detail: "Uniones y refuerzos" },
  { id: "plate", icon: "⊙", name: "Placa", detail: "Bases y perforaciones" },
  { id: "free", icon: "✦", name: "Diseño libre", detail: "Construí sin plantilla" },
];

const possibilities = [
  { icon: "▣", title: "Cajas técnicas", copy: "Ajustá paredes, tapa, soportes y recortes con medidas reales." },
  { icon: "⌞", title: "Soportes", copy: "Creá uniones resistentes y modificá espesores y agujeros." },
  { icon: "⊙", title: "Placas", copy: "Prepará bases perforadas listas para adaptar a tu proyecto." },
  { icon: "T", title: "Texto 3D", copy: "Sumá nombres, etiquetas, relieve o grabado a tus piezas." },
  { icon: "◉", title: "Formas combinadas", copy: "Uní sólidos y aplicá recortes sin aprender operaciones complejas." },
  { icon: "◇", title: "Diseños propios", copy: "Guardá, duplicá e intercambiá proyectos en formato .forja." },
];

const faqs = [
  [
    "¿Necesito saber diseño 3D?",
    "No. FORJA traduce medidas y decisiones simples a geometría 3D. Podés comenzar con una plantilla y avanzar hacia el editor libre cuando quieras.",
  ],
  [
    "¿El archivo sale listo para la impresora?",
    "FORJA genera el modelo y comprueba su geometría. Después debés abrir el STL o 3MF en Cura, OrcaSlicer u otro laminador para elegir material, calidad y generar el G-code de tu impresora.",
  ],
  [
    "¿Dónde se guardan mis diseños?",
    "En esta versión se guardan localmente en tu dispositivo. También podés exportar un proyecto .forja para moverlo a otro equipo o conservar una copia.",
  ],
  [
    "¿FORJA es gratis y open source?",
    "Sí. El proyecto utiliza la licencia AGPL-3.0 y está pensado para que aprender y crear piezas útiles sea más accesible.",
  ],
];

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
            <span className="landing-eyebrow">De la idea al archivo 3D</span>
            <h2 id="how-title">Un proceso claro, incluso si nunca diseñaste.</h2>
            <p>FORJA esconde la complejidad técnica sin quitarte el control de las medidas.</p>
          </div>
          <div className="landing-step-grid">
            <article><span>01</span><i aria-hidden="true">▦</i><h3>Elegí cómo empezar</h3><p>Usá una plantilla paramétrica o abrí un lienzo completamente libre.</p></article>
            <article><span>02</span><i aria-hidden="true">↔</i><h3>Ajustá y construí</h3><p>Escribí medidas, agregá sólidos, textos y recortes donde los necesites.</p></article>
            <article><span>03</span><i aria-hidden="true">✓</i><h3>Comprobá y exportá</h3><p>Revisá la geometría y descargá el formato adecuado para continuar.</p></article>
          </div>
        </section>

        <section className="landing-section" id="posibilidades" aria-labelledby="possibilities-title">
          <div className="landing-section-heading centered">
            <span className="landing-eyebrow">Más posibilidades para crear</span>
            <h2 id="possibilities-title">Empezá rápido. Personalizá todo.</h2>
            <p>Cada diseño inicial es un punto de partida, no una pieza cerrada.</p>
          </div>
          <div className="landing-possibility-grid">
            {possibilities.map((item, index) => (
              <article key={item.title}>
                <div className={`landing-piece piece-${index + 1}`}><i>{item.icon}</i></div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
          <div className="landing-quick-start">
            <div><span className="landing-eyebrow">Crear ahora</span><h3>¿Qué querés diseñar?</h3></div>
            <div>
              {quickStarts.map((item) => (
                <button key={item.id} onClick={() => onStart(item.id)}>
                  <i aria-hidden="true">{item.icon}</i>
                  <span><strong>{item.name}</strong><small>{item.detail}</small></span>
                  <b aria-hidden="true">→</b>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-free" id="editor-libre" aria-labelledby="free-title">
          <div className="landing-free-demo" aria-hidden="true">
            <div className="landing-layers">
              <span>CAPAS</span>
              <div><i className="solid" />Cubo base <b>●</b></div>
              <div><i className="hole" />Recorte circular <b>●</b></div>
              <div><i className="solid" />Texto FORJA <b>●</b></div>
            </div>
            <div className="landing-free-canvas"><span /><i className="shape-one"/><i className="shape-two"/><b>FORJA</b></div>
            <div className="landing-transform"><span>MOVER</span><strong>X&nbsp; 12.0</strong><strong>Y&nbsp; 0.0</strong><strong>Z&nbsp; −8.0</strong></div>
          </div>
          <div className="landing-free-copy">
            <span className="landing-eyebrow">Editor libre</span>
            <h2 id="free-title">Tu idea no tiene que entrar en una plantilla.</h2>
            <p>Combiná formas y transformá cada elemento con controles visuales o medidas exactas.</p>
            <ul>
              <li><i aria-hidden="true">+</i><span><strong>Sólidos y recortes</strong><small>Construí agregando material o quitándolo.</small></span></li>
              <li><i aria-hidden="true">T</i><span><strong>Texto personalizable</strong><small>Creá etiquetas, marcas y carteles.</small></span></li>
              <li><i aria-hidden="true">↔</i><span><strong>Mover, rotar y escalar</strong><small>Usá el gizmo 3D o escribí valores precisos.</small></span></li>
              <li><i aria-hidden="true">↶</i><span><strong>Historial de cambios</strong><small>Deshacé y rehacé mientras explorás.</small></span></li>
            </ul>
            <button className="landing-primary single-line" onClick={() => onStart("free")}>Abrir un lienzo libre <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section className="landing-section landing-manufacture" aria-labelledby="manufacture-title">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">Fabricación sin falsas promesas</span>
            <h2 id="manufacture-title">FORJA prepara el modelo. Tu laminador prepara la impresión.</h2>
            <p>Te mostramos con claridad dónde termina el diseño y dónde comienza la configuración de tu impresora.</p>
          </div>
          <div className="landing-manufacture-flow">
            <article><i>1</i><span><strong>Diseñá en FORJA</strong><small>Medidas, formas y recortes</small></span></article>
            <b aria-hidden="true">→</b>
            <article><i>2</i><span><strong>Exportá el modelo</strong><small>STL, 3MF o STEP</small></span></article>
            <b aria-hidden="true">→</b>
            <article><i>3</i><span><strong>Laminá para tu impresora</strong><small>Cura, OrcaSlicer u otro</small></span></article>
          </div>
        </section>

        <section className="landing-open" id="codigo-abierto" aria-labelledby="open-title">
          <div>
            <span className="landing-eyebrow">Código abierto · AGPL-3.0</span>
            <h2 id="open-title">Una herramienta argentina para que más personas puedan crear.</h2>
            <p>FORJA nace para acercar el diseño 3D a estudiantes, makers, técnicos, docentes y cualquiera que tenga una idea útil.</p>
            <a
              className="landing-source-link"
              href="https://github.com/franduartedev/forja-3d"
              target="_blank"
              rel="noreferrer"
            >
              Ver el código fuente en GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="landing-open-values">
            <article><i aria-hidden="true">◇</i><span><strong>Accesible</strong><small>Menos barreras para empezar</small></span></article>
            <article><i aria-hidden="true">{"{}"}</i><span><strong>Abierto</strong><small>Auditable y mejorable por la comunidad</small></span></article>
            <article><i aria-hidden="true">AR</i><span><strong>Local</strong><small>Pensado desde Argentina para el mundo</small></span></article>
          </div>
        </section>

        <section className="landing-section landing-faq" aria-labelledby="faq-title">
          <div className="landing-section-heading centered">
            <span className="landing-eyebrow">Preguntas frecuentes</span>
            <h2 id="faq-title">Lo importante antes de empezar.</h2>
          </div>
          <div className="landing-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
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
