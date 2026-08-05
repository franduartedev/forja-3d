export type SliceMaterial =
  | "pla"
  | "pla-plus"
  | "petg";

export type SliceLayerHeight =
  | 0.12
  | 0.2
  | 0.28;

export type SliceRequest = {
  file: File;
  printerProfileId: "biqu-b1-0.4";
  layerHeightMm: SliceLayerHeight;
  infillPercent: number;
  supports: boolean;
  material: SliceMaterial;
};

export type SliceResult = {
  gcode: Blob;
  fileName: string;
  requestId: string | null;
};

type SliceErrorBody = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

const DEFAULT_SLICER_URL =
  "http://localhost:3001";

function getSlicerUrl() {
  return (
    process.env.NEXT_PUBLIC_SLICER_URL ??
    DEFAULT_SLICER_URL
  );
}

function getDownloadFileName(
  contentDisposition: string | null,
) {
  if (!contentDisposition) {
    return "forja-modelo.gcode";
  }

  const match = contentDisposition.match(
    /filename="([^"]+)"/,
  );

  return match?.[1] ?? "forja-modelo.gcode";
}

async function readSliceError(
  response: Response,
) {
  let body: SliceErrorBody | null = null;

  try {
    body = (await response.json()) as SliceErrorBody;
  } catch {
    body = null;
  }

  const message =
    body?.error?.message ??
    `El laminador respondió con estado ${response.status}.`;

  const error = new Error(message);

  error.name =
    body?.error?.code ?? "SLICING_FAILED";

  return error;
}

export async function sliceModel({
  file,
  printerProfileId,
  layerHeightMm,
  infillPercent,
  supports,
  material,
}: SliceRequest): Promise<SliceResult> {
  const formData = new FormData();

  formData.set("file", file);
  formData.set(
    "printerProfileId",
    printerProfileId,
  );
  formData.set(
    "layerHeightMm",
    String(layerHeightMm),
  );
  formData.set(
    "infillPercent",
    String(infillPercent),
  );
  formData.set(
    "supports",
    String(supports),
  );
  formData.set("material", material);

  const response = await fetch(
    `${getSlicerUrl()}/v1/slice`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw await readSliceError(response);
  }

  const gcode = await response.blob();

  return {
    gcode,
    fileName: getDownloadFileName(
      response.headers.get(
        "content-disposition",
      ),
    ),
    requestId: response.headers.get(
      "x-request-id",
    ),
  };
}

export function downloadGcode(
  result: SliceResult,
) {
  const objectUrl = URL.createObjectURL(
    result.gcode,
  );

  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}
