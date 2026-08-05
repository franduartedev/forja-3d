import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  MAX_STL_BYTES,
  SliceRequestError,
  validateSliceFormData,
} from "./slice-request.mjs";

const execFileAsync = promisify(execFile);

const SERVICE_NAME = "forja-slicer";
const SERVICE_VERSION = "0.1.0";
const DEFAULT_PORT = 3001;
const MAX_MULTIPART_BYTES = MAX_STL_BYTES + 1024 * 1024;

export async function getPrusaSlicerVersion() {
  const { stdout, stderr } = await execFileAsync(
    "prusa-slicer",
    ["--help"],
    {
      timeout: 10_000,
    },
  );

  const output = `${stdout}\n${stderr}`.trim();

  if (!output) {
    throw new Error("PrusaSlicer no informó su versión.");
  }

  const firstLine = output
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("PrusaSlicer-"));

  if (!firstLine) {
    throw new Error("No se pudo identificar la versión de PrusaSlicer.");
  }

  return firstLine;
}

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });

  response.end(`${JSON.stringify(body)}\n`);
}

async function readRequestBody(request, maxBytes) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > maxBytes) {
      throw new SliceRequestError(
        "FILE_TOO_LARGE",
        "La solicitud supera el límite permitido.",
        413,
      );
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function parseMultipartFormData(request) {
  const contentType = request.headers["content-type"];

  if (
    typeof contentType !== "string" ||
    !contentType.startsWith("multipart/form-data")
  ) {
    throw new SliceRequestError(
      "UNSUPPORTED_MEDIA_TYPE",
      "La solicitud debe usar multipart/form-data.",
      415,
    );
  }

  const contentLength = Number(request.headers["content-length"]);

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_MULTIPART_BYTES
  ) {
    throw new SliceRequestError(
      "FILE_TOO_LARGE",
      "La solicitud supera el límite permitido.",
      413,
    );
  }

  const body = await readRequestBody(request, MAX_MULTIPART_BYTES);

  const webRequest = new Request("http://localhost/v1/slice", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "content-length": String(body.length),
    },
    body,
  });

  try {
    return await webRequest.formData();
  } catch {
    throw new SliceRequestError(
      "INVALID_MULTIPART",
      "No se pudo interpretar el formulario multipart.",
    );
  }
}

async function handleHealth(response, resolveSlicerVersion) {
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
}

async function handleSliceValidation(request, response) {
  try {
    const formData = await parseMultipartFormData(request);
    const validatedRequest = validateSliceFormData(formData);

    sendJson(response, 200, {
      status: "validated",
      requestId: crypto.randomUUID(),
      file: {
        name: validatedRequest.file.name,
        sizeBytes: validatedRequest.file.size,
      },
      settings: validatedRequest.settings,
      slicingStarted: false,
    });
  } catch (error) {
    if (error instanceof SliceRequestError) {
      sendJson(response, error.statusCode, {
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    console.error("Error inesperado validando el laminado:", error);

    sendJson(response, 500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Ocurrió un error inesperado.",
      },
    });
  }
}

export function createSlicerServer({
  resolveSlicerVersion = getPrusaSlicerVersion,
} = {}) {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname === "/health") {
      if (request.method !== "GET") {
        sendJson(
          response,
          405,
          {
            error: "Método no permitido.",
          },
          {
            Allow: "GET",
          },
        );
        return;
      }

      await handleHealth(response, resolveSlicerVersion);
      return;
    }

    if (url.pathname === "/v1/slice") {
      if (request.method !== "POST") {
        sendJson(
          response,
          405,
          {
            error: "Método no permitido.",
          },
          {
            Allow: "POST",
          },
        );
        return;
      }

      await handleSliceValidation(request, response);
      return;
    }

    sendJson(response, 404, {
      error: "Ruta no encontrada.",
    });
  });
}

function startServer() {
  const port = Number.parseInt(
    process.env.PORT ?? `${DEFAULT_PORT}`,
    10,
  );

  const host = process.env.HOST ?? "0.0.0.0";
  const server = createSlicerServer();

  server.listen(port, host, () => {
    console.log(`FORJA Slicer escuchando en http://${host}:${port}`);
  });
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer();
}
