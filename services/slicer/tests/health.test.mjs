import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";

import { createSlicerServer } from "../src/server.mjs";

async function startTestServer(options = {}) {
  const server = createSlicerServer(options);

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("No se pudo obtener el puerto del servidor.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

test("GET /health informa que el servicio está disponible", async (t) => {
  const { server, baseUrl } = await startTestServer({
    resolveSlicerVersion: async () => "PrusaSlicer 2.9.2",
  });

  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "forja-slicer");
  assert.equal(body.version, "0.1.0");
  assert.equal(body.slicer.name, "PrusaSlicer");
  assert.equal(body.slicer.version, "PrusaSlicer 2.9.2");
  assert.deepEqual(body.profiles, ["biqu-b1-0.4"]);
});

test("GET /health devuelve 503 si PrusaSlicer no está disponible", async (t) => {
  const { server, baseUrl } = await startTestServer({
    resolveSlicerVersion: async () => {
      throw new Error("PrusaSlicer no encontrado");
    },
  });

  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, "unavailable");
  assert.equal(body.slicer.available, false);
  assert.deepEqual(body.profiles, []);
});

test("una ruta desconocida devuelve 404", async (t) => {
  const { server, baseUrl } = await startTestServer();

  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/ruta-inexistente`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "Ruta no encontrada.");
});

test("POST /health devuelve 405", async (t) => {
  const { server, baseUrl } = await startTestServer();

  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/health`, {
    method: "POST",
  });

  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.equal(body.error, "Método no permitido.");
});
