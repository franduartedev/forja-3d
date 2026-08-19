import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders the public product landing and preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /<details class="landing-mobile-menu">/);
  assert.match(html, /Navegación móvil/);
  assert.match(html, /¿Qué querés crear\?/);
  assert.match(html, /Crear desde una plantilla/);
  assert.match(html, /Editor libre/);
  assert.doesNotMatch(html, /Continuar un proyecto/);
  assert.match(html, /Caja para electrónica/);
  assert.match(html, /Soporte en L/);
  assert.match(html, /Placa perforada/);
  assert.match(html, /Diseñá piezas 3D útiles/);
  assert.match(html, /Comprobación geométrica/);
  assert.match(html, /STL/);
  assert.match(html, /Preparación de impresión y G-code/);
  assert.match(html, /AGPL-3\.0/);
  assert.doesNotMatch(html, /De una medida a una pieza fabricable/);
});
