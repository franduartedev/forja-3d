import { expect, type Locator, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;

    return {
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      documentClientWidth: documentElement.clientWidth,
      documentScrollWidth: documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });

  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(
    metrics.documentClientWidth + 1,
  );
}

async function expectWithinViewport(locator: Locator) {
  await expect(locator).toBeVisible();

  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const viewport = locator.page().viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) return;

  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
}

async function expectNoHorizontalOverlap(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (!firstBox || !secondBox) return;

  const separated =
    firstBox.x + firstBox.width <= secondBox.x ||
    secondBox.x + secondBox.width <= firstBox.x;

  expect(separated).toBe(true);
}

async function expectLandingNavigationVisible(page: Page) {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 700) {
    await expect(page.getByLabel("Abrir menú de navegación")).toBeVisible();
    return;
  }

  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
}

async function clickAndExpectWorkspace(page: Page, trigger: Locator) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(trigger).toBeVisible();
    await trigger.dispatchEvent("click");

    try {
      await expect(page.locator(".workspace")).toBeVisible({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(500);
    }
  }
}

async function clickTopbarPrimaryAction(page: Page, name: string | RegExp) {
  const action = page
    .getByLabel("Acciones del proyecto", { exact: true })
    .getByRole("button", { name });

  await expect(action).toBeVisible();
  await action.click();
}

async function expectTopbarPrimaryActionClear(page: Page, name: string | RegExp) {
  const actions = page.getByLabel("Acciones del proyecto", { exact: true });
  const projectMenu = actions.getByLabel("Más acciones del proyecto");
  const primaryAction = actions.getByRole("button", { name });

  await expect(projectMenu).toBeVisible();
  await expect(primaryAction).toBeVisible();
  await expectNoHorizontalOverlap(projectMenu, primaryAction);
}

async function startFromTemplate(page: Page, templateName: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿Qué querés crear?" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: templateName }).scrollIntoViewIfNeeded();
  const templateCard = page.locator("article.creation-template-card").filter({
    has: page.getByRole("heading", { name: templateName }),
  });
  await clickAndExpectWorkspace(
    page,
    templateCard.getByRole("button", { name: "Usar plantilla" }),
  );
}

async function startFreeEditor(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿Qué querés crear?" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await clickAndExpectWorkspace(
    page,
    page.getByRole("button", { name: /Editor libre/ }),
  );
}

test.describe("smoke visual mínimo", () => {
  test("landing: opciones principales visibles y layout estable", async ({
    page,
  }) => {
    await page.goto("/");

    await expectLandingNavigationVisible(page);
    await expect(page.getByRole("heading", { name: "¿Qué querés crear?" })).toBeVisible();
    await expect(page.getByText("Crear desde una plantilla")).toBeVisible();
    await expect(page.getByRole("button", { name: /Editor libre/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Crear pieza/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoHorizontalOverlap(
      page.getByLabel("FORJA, inicio"),
      page.getByRole("link", { name: /Crear pieza/ }),
    );

    await expect(page).toHaveScreenshot("landing.png", {
      animations: "disabled",
      caret: "hide",
      mask: [page.locator("canvas")],
    });
  });

  test("editor con plantilla caja: viewport, panel y CTA visibles", async ({
    page,
  }) => {
    await startFromTemplate(page, "Caja para electrónica");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page
        .getByLabel("Acciones del proyecto", { exact: true })
        .getByRole("button", { name: /Comprobar|Exportar STL/ }),
    ).toBeVisible();
    await expectTopbarPrimaryActionClear(page, /Comprobar|Exportar STL/);
    await expectWithinViewport(page.locator("#editor-left-panel"));
    await expectWithinViewport(page.locator(".viewport-panel"));
    await expect(page.getByRole("heading", { name: "Caja" })).toBeVisible();
    await expect(page.getByText("Motor 3D optimizado")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect(page).toHaveScreenshot("editor-caja.png", {
      animations: "disabled",
      caret: "hide",
      mask: [page.locator("canvas")],
    });
  });

  test("editor libre: herramientas, viewport e inspector visibles", async ({
    page,
  }) => {
    await startFreeEditor(page);

    await expect(page.getByRole("banner")).toBeVisible();
    await expectWithinViewport(page.locator("#editor-left-panel"));
    await expectWithinViewport(page.locator(".viewport-panel"));
    await expectWithinViewport(page.locator("#manufacturing-review"));
    await expect(
      page.getByRole("button", { name: "Biblioteca", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Herramientas del visor 3D" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sin selección" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect(page).toHaveScreenshot("editor-libre.png", {
      animations: "disabled",
      caret: "hide",
      mask: [page.locator("canvas")],
    });
  });

  test("comprobación/exportación: STL principal y G-code no productivo", async ({
    page,
  }) => {
    await startFromTemplate(page, "Caja para electrónica");
    await expectTopbarPrimaryActionClear(page, "Comprobar");
    await clickTopbarPrimaryAction(page, "Comprobar");

    await expect(page.locator("#manufacturing-review")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Listo para exportar" })).toBeVisible();
    await expect(
      page.locator(".export-zone").getByRole("button", { name: /Exportar STL/ }),
    ).toBeVisible();
    await expect(page.getByText("STL es el archivo principal")).toBeVisible();
    await expect(page.getByText("Preparar impresión")).toBeVisible();
    await expect(page.getByText("En desarrollo")).toBeVisible();
    await expect(page.getByText("Generar y descargar G-code")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await expect(page).toHaveScreenshot("comprobacion-exportacion.png", {
      animations: "disabled",
      caret: "hide",
      mask: [page.locator("canvas")],
    });
  });
});
