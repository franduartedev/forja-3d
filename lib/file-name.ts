export function safeFileName(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .replace(/\.(stl|3mf|step|stp|forja)$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned || fallback;
}
