import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SERVICE_NAME = "forja-slicer";
const SERVICE_VERSION = "0.1.0";
const DEFAULT_PORT = 3001;

export async function getPrusaSlicerVersion() {
  const { stdout, stderr } = await execFileAsync("prusa-slicer", ["--version"], {
    timeout: 10_000,
  });

  const output = `${stdout}\n${stderr}`.trim();

  if (!output) {
    throw new Error("PrusaSlicer no informó su versión.");
  }

  return output.split("\n")[0];
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  response.end(`${JSON.stringify(body)}\n`);
}

export function createSlicerServer({
  resolveSlicerVersion = getPrusaSlicerVersion,
} = {}) {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname !== "/health") {
      sendJson(response, 404, {
        error: "Ruta no encontrada.",
      });
      return;
    }

    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");

      sendJson(response, 405, {
        error: "Método no permitido.",
      });
      return;
    }

    try {
      const slicerVersion = await resolveSlicerVersion();

      sendJson(response, 200, {
        status: "ok",
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        slicer: {
          name: "PrusaSlicer",
          version: slicerVersion,
        },
        profiles: ["biqu-b1-0.4"],
      });
    } catch (error) {
      console.error("No se pudo consultar PrusaSlicer:", error);

      sendJson(response, 503, {
        status: "unavailable",
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        slicer: {
          name: "PrusaSlicer",
          available: false,
        },
        profiles: [],
      });
    }
  });
}

function startServer() {
  const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);
  const host = process.env.HOST ?? "0.0.0.0";

  const server = createSlicerServer();

  server.listen(port, host, () => {
    console.log(
      `FORJA Slicer escuchando en http://${host}:${port}`,
    );
  });
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer();
}
