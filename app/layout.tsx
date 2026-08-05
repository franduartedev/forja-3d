import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://forja-3d.frn81.chatgpt.site"),
  title: "FORJA — Diseñá piezas para impresión 3D online",
  description:
    "Creá piezas imprimibles en 3D desde el navegador. Usá plantillas editables o diseñá libremente y exportá en STL, 3MF o STEP.",
  keywords: [
    "diseño 3D online",
    "crear STL",
    "impresión 3D",
    "modelado 3D fácil",
    "editor 3D",
    "FORJA",
  ],
  alternates: { canonical: "/" },
  applicationName: "FORJA",
  creator: "FORJA",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "FORJA",
    title: "FORJA — Diseñá piezas para impresión 3D online",
    description:
      "Convertí medidas e ideas en modelos editables y exportá en STL, 3MF o STEP desde el navegador.",
  },
  twitter: {
    card: "summary",
    title: "FORJA — Diseño 3D asistido",
    description: "Diseñá piezas 3D útiles sin dominar un CAD.",
  },
  robots: { index: true, follow: true },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport = {
  themeColor: "#061018",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
