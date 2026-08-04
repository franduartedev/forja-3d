"use client";

import { useEffect, useRef, useState } from "react";
import type { FreeDesignId } from "../../lib/shape-library";

type PreviewController = {
  reset: () => void;
  setView: (view: "iso" | "front" | "top") => void;
  zoom: (direction: "in" | "out") => void;
};

export default function DesignGeometryPreview({
  designId,
  name,
}: {
  designId: FreeDesignId;
  name: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PreviewController | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let cleanup = () => {};
    setState("loading");

    const renderPreview = async () => {
      try {
        const [THREE, { createModelGeometries }, { createStarterDesign }] =
          await Promise.all([
            import("three"),
            import("../../lib/model-geometry"),
            import("../../lib/shape-library"),
          ]);
        if (cancelled) return;

        let nextId = 0;
        const objects = createStarterDesign(
          designId,
          0,
          { x: 0, z: 0 },
          (prefix) => `${prefix}-preview-${nextId += 1}`,
        );
        const geometries = createModelGeometries(
          "free",
          { width: 180, depth: 180 },
          { objects },
        );
        const scene = new THREE.Scene();
        const model = new THREE.Group();
        const material = new THREE.MeshPhysicalMaterial({
          color: 0x38c6ee,
          roughness: 0.34,
          metalness: 0.08,
          clearcoat: 0.42,
          clearcoatRoughness: 0.3,
          side: THREE.FrontSide,
        });
        geometries.forEach((geometry) => {
          geometry.computeVertexNormals();
          model.add(new THREE.Mesh(geometry, material));
        });

        scene.add(new THREE.HemisphereLight(0xeafaff, 0x07131a, 2.55));
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
        keyLight.position.set(5, 7, 6);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0x5bd7ff, 1.35);
        fillLight.position.set(-5, 3, -4);
        scene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(0x1677ff, 0.8);
        rimLight.position.set(2, 1, -6);
        scene.add(rimLight);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.length() * 0.5, 18);
        const pivot = new THREE.Group();
        model.position.copy(center).multiplyScalar(-1);
        pivot.add(model);
        scene.add(pivot);

        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 2000);
        const cameraDirection = new THREE.Vector3(1, 0.72, 1.1).normalize();
        const baseDistance = Math.max(radius / Math.sin(THREE.MathUtils.degToRad(16)) * 1.08, 90);
        let zoom = 1;

        const positionCamera = () => {
          camera.position.copy(cameraDirection).multiplyScalar(baseDistance * zoom);
          camera.lookAt(0, 0, 0);
        };
        positionCamera();

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x07151e, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.14;
        renderer.domElement.setAttribute("focusable", "false");
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.classList.add("design-geometry-canvas");
        mount.replaceChildren(renderer.domElement);

        const draw = () => {
          const width = Math.max(280, mount.clientWidth);
          const height = Math.max(220, mount.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          renderer.render(scene, camera);
        };

        const setView = (view: "iso" | "front" | "top") => {
          if (view === "front") pivot.rotation.set(0, 0, 0);
          if (view === "top") pivot.rotation.set(-Math.PI / 2, 0, 0);
          if (view === "iso") pivot.rotation.set(-0.12, -0.18, 0);
          draw();
        };

        controllerRef.current = {
          reset: () => {
            zoom = 1;
            positionCamera();
            setView("iso");
          },
          setView,
          zoom: (direction) => {
            zoom = THREE.MathUtils.clamp(zoom + (direction === "out" ? 0.14 : -0.14), 0.58, 1.7);
            positionCamera();
            draw();
          },
        };

        let pointerId: number | null = null;
        let previousX = 0;
        let previousY = 0;
        const onPointerDown = (event: PointerEvent) => {
          if (event.button !== 0) return;
          pointerId = event.pointerId;
          previousX = event.clientX;
          previousY = event.clientY;
          mount.setPointerCapture(event.pointerId);
          setDragging(true);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (pointerId !== event.pointerId) return;
          const deltaX = event.clientX - previousX;
          const deltaY = event.clientY - previousY;
          previousX = event.clientX;
          previousY = event.clientY;
          pivot.rotation.y += deltaX * 0.012;
          pivot.rotation.x = THREE.MathUtils.clamp(
            pivot.rotation.x + deltaY * 0.01,
            -Math.PI * 0.72,
            Math.PI * 0.72,
          );
          draw();
        };
        const endDrag = (event: PointerEvent) => {
          if (pointerId !== event.pointerId) return;
          pointerId = null;
          if (mount.hasPointerCapture(event.pointerId)) mount.releasePointerCapture(event.pointerId);
          setDragging(false);
        };

        mount.addEventListener("pointerdown", onPointerDown);
        mount.addEventListener("pointermove", onPointerMove);
        mount.addEventListener("pointerup", endDrag);
        mount.addEventListener("pointercancel", endDrag);
        setView("iso");
        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(mount);
        setState("ready");
        cleanup = () => {
          observer.disconnect();
          mount.removeEventListener("pointerdown", onPointerDown);
          mount.removeEventListener("pointermove", onPointerMove);
          mount.removeEventListener("pointerup", endDrag);
          mount.removeEventListener("pointercancel", endDrag);
          controllerRef.current = null;
          geometries.forEach((geometry) => geometry.dispose());
          material.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!cancelled) setState("error");
      }
    };

    void renderPreview();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [designId]);

  return (
    <div className={`design-geometry-preview ${state}${dragging ? " dragging" : ""}`}>
      <div
        className="design-geometry-mount"
        ref={mountRef}
        role="img"
        aria-label={`Vista previa 3D interactiva de ${name}. Arrastrá para rotarla.`}
      />
      {state === "loading" && <span>Generando vista previa…</span>}
      {state === "error" && <span>No pudimos mostrar la vista previa.</span>}
      {state === "ready" && (
        <>
          <div className="design-preview-view-controls" aria-label="Vistas del diseño">
            <button onClick={() => controllerRef.current?.setView("iso")} title="Vista isométrica">3D</button>
            <button onClick={() => controllerRef.current?.setView("front")} title="Vista frontal">Frente</button>
            <button onClick={() => controllerRef.current?.setView("top")} title="Vista superior">Arriba</button>
          </div>
          <div className="design-preview-zoom-controls" aria-label="Zoom de la vista previa">
            <button onClick={() => controllerRef.current?.zoom("out")} aria-label="Alejar vista">−</button>
            <button onClick={() => controllerRef.current?.reset()} aria-label="Restablecer vista" title="Restablecer vista">↺</button>
            <button onClick={() => controllerRef.current?.zoom("in")} aria-label="Acercar vista">+</button>
          </div>
          <p className="design-preview-drag-hint" aria-hidden="true">
            <i /> Arrastrá para rotar
          </p>
        </>
      )}
    </div>
  );
}
