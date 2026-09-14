import { expect, test } from "@playwright/test";

test("packed viewer supports scoped keyboard focus, selection, copying, and annotations", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.addStyleTag({ url: "/library.css" });
  await page.locator("body").click({ position: { x: 1, y: 1 } });

  const surface = page
    .getByTestId("sequence-viewer")
    .getByRole("listbox", { name: /Sequence residues/ });
  for (let attempts = 0; attempts < 20; attempts += 1) {
    await page.keyboard.press("Tab");
    if (await surface.evaluate((node) => node === document.activeElement))
      break;
  }
  await expect(surface).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Space");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(page.getByTestId("selection-output")).toContainText(
    '"direction":"reverse"',
  );
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("a");
  await expect(
    page
      .getByTestId("sequence-viewer")
      .getByRole("status")
      .filter({ hasText: "CDS annotation, Example feature" }),
  ).toBeVisible();

  const hostInput = page.getByTestId("host-input");
  await hostInput.focus();
  await hostInput.selectText();
  await page.keyboard.press("ControlOrMeta+c");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("Host input");

  const secondary = page
    .getByTestId("secondary-sequence-viewer")
    .getByRole("listbox");
  await secondary.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ControlOrMeta+c");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("T");

  await surface.focus();
  await page.keyboard.press("ControlOrMeta+c");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("GT");
  await page.screenshot({
    path: testInfo.outputPath("keyboard-selection.png"),
  });
});

test("React 19: select, copy, edit, and empty the packed viewers", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/react19/");
  await page.addStyleTag({ url: "/library.css" });
  await expect(page.locator("html")).toHaveAttribute("data-react", /^19\./);
  const sequence = page.getByTestId("sequence-viewer");
  const linear = page.getByTestId("linear-viewer");
  const circular = page.getByTestId("circular-viewer");

  // A real drag updates the shared selection, and the portalled selector chooses
  // which sequence the clipboard action copies.
  const characters = sequence.locator(".caller-char");
  await characters.filter({ hasText: /^A$/ }).first().hover();
  await page.mouse.down();
  await characters.filter({ hasText: /^G$/ }).first().hover();
  await page.mouse.up();
  await expect(page.getByTestId("selection-output")).toContainText('"start":0');
  await expect(page.getByTestId("selection-output")).toContainText('"end":2');
  await sequence.getByRole("combobox").click();
  await page.getByRole("option", { name: "Sequence 2" }).click();
  await sequence.getByRole("button", { name: "Copy to clipboard" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("ACG");

  await page.getByLabel("Sequences", { exact: true }).fill('["ACGT"]');
  await page.getByRole("button", { name: "Apply sequences" }).click();
  await expect(sequence.getByRole("combobox")).toContainText("Sequence 1");
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(linear.locator("rect").first()).toHaveAttribute("width", "100%");
  await sequence.getByRole("button", { name: "Copy to clipboard" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("ACGT");
  await expect(circular).toContainText("4 bp");

  // Shrinking past the old selection clears copy without replaying a drag.
  await sequence.locator("div.caller-char").filter({ hasText: /^T$/ }).click();
  const selectionBeforeShrink = await page
    .getByTestId("selection-output")
    .textContent();
  await page.getByLabel("Sequences", { exact: true }).fill('["A"]');
  await page.getByRole("button", { name: "Apply sequences" }).click();
  await expect(linear.locator("line").first()).toHaveAttribute("x2", "100%");
  await expect(
    sequence.getByRole("button", { name: "Copy to clipboard" }),
  ).toBeDisabled();
  await expect(page.getByTestId("selection-output")).toHaveText(
    selectionBeforeShrink!,
  );
  for (const empty of ["[]", '[""]']) {
    await page.getByLabel("Sequences", { exact: true }).fill(empty);
    await page.getByRole("button", { name: "Apply sequences" }).click();
    await expect(sequence.getByRole("button")).toHaveCount(0);
    await expect(linear.locator("svg")).toHaveCount(0);
    await expect(circular).toContainText("0 bp");
  }
  expect(errors).toEqual([]);
});

test("malformed annotations recover locally, with strict errors handled by the host", async ({
  page,
}) => {
  await page.goto("/");
  await page.addStyleTag({ url: "/library.css" });
  await page.getByLabel("Invalid annotations").check();
  for (const name of ["sequence", "linear", "circular"]) {
    const viewer = page.getByTestId(`${name}-viewer`);
    await expect(
      viewer
        .getByRole("status")
        .filter({ hasText: "Some annotations were not displayed" }),
    ).toBeVisible();
    await expect(viewer.locator(".caller-annotation").first()).toBeVisible();
    await expect(viewer).not.toContainText("Invalid feature");
  }
  await expect(
    page.getByTestId("sequence-viewer").locator(".caller-char").first(),
  ).toBeVisible();
  const circular = page.getByTestId("circular-viewer");
  const diagnostic = await circular
    .getByRole("status")
    .filter({ hasText: "Some annotations were not displayed" })
    .boundingBox();
  const diagram = await circular.locator("svg").first().boundingBox();
  expect(diagram!.y).toBeGreaterThanOrEqual(diagnostic!.y + diagnostic!.height);

  await page.getByLabel("Strict validation").check();
  await expect(page.getByRole("alert")).toHaveCount(3);
  await expect(page.getByRole("alert").first()).toHaveText(
    "Viewer error boundary",
  );
  await expect(page.getByTestId("host-heading")).toBeVisible();
  await page.getByLabel("Invalid annotations").uncheck();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(circular).toContainText("12 bp");
});

test("large packed sequences window scrolling while preserving logical selection", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?virtual=1");
  await page.addStyleTag({ url: "/library.css" });
  const viewer = page.getByTestId("virtual-sequence-viewer");
  const virtualRoot = viewer.locator('[data-virtualized="true"]').first();
  const scrollContainer = page.getByTestId("virtual-scroll-container");
  await scrollContainer.scrollIntoViewIfNeeded();
  await expect(virtualRoot).toBeVisible();
  const totalPositions = await virtualRoot
    .locator("[data-sequence-position]")
    .count();
  expect(totalPositions).toBeGreaterThan(100);
  expect(totalPositions).toBeLessThan(2_000);

  await viewer.getByRole("button", { name: "Select offscreen range" }).click();
  await expect(page.getByTestId("virtual-selection")).toContainText(
    '"start":15000',
  );
  await expect(virtualRoot.locator(".nsv-sequence-selection")).toHaveCount(0);

  await virtualRoot.evaluate((root) => {
    const columns = Number((root as HTMLElement).dataset.columnsPerRow);
    const blocks = Number((root as HTMLElement).dataset.coordinateBlockCount);
    const blockHeight = (root as HTMLElement).offsetHeight / blocks;
    const scroller = root.closest(
      '[data-testid="virtual-scroll-container"]',
    ) as HTMLElement;
    scroller.scrollTop = Math.floor(15_000 / columns) * blockHeight;
  });
  await expect(
    virtualRoot.locator(
      '[data-sequence-row="0"][data-sequence-position="15000"]',
    ),
  ).toBeVisible();
  await expect(
    virtualRoot.locator(".nsv-sequence-selection").first(),
  ).toBeVisible();
  const deepResidue = virtualRoot.locator(
    '[data-sequence-row="0"][data-sequence-position="15000"]',
  );
  const scrollTopBeforeResidueClick = await scrollContainer.evaluate(
    (node) => node.scrollTop,
  );
  await deepResidue.click();
  await expect
    .poll(() => scrollContainer.evaluate((node) => node.scrollTop))
    .toBe(scrollTopBeforeResidueClick);
  const [firstRowBox, secondRowBox] = await virtualRoot.evaluate((root) =>
    Array.from(root.querySelectorAll('[data-line-kind="sequence"]'), (row) => {
      const rect = row.getBoundingClientRect();
      return { y: rect.y, height: rect.height };
    }).slice(0, 2),
  );
  expect(firstRowBox.y + firstRowBox.height).toBeLessThanOrEqual(
    secondRowBox.y,
  );
  const visibleAnnotation = virtualRoot.locator(".caller-annotation").first();
  await visibleAnnotation.hover();
  await expect(viewer.getByText("Virtual feature")).toBeVisible();
  await visibleAnnotation.click();
  await expect(page.getByTestId("virtual-annotation-clicks")).toHaveText("1");

  const positionBeforeResize = await virtualRoot.evaluate((root) =>
    Number(
      root
        .querySelector('[data-line-kind="sequence"] [data-sequence-position]')
        ?.getAttribute("data-sequence-position"),
    ),
  );
  await viewer.getByRole("button", { name: "Resize viewer" }).click();
  await expect
    .poll(() => scrollContainer.evaluate((node) => node.clientWidth))
    .toBe(520);
  const positionAfterResize = await virtualRoot.evaluate((root) =>
    Number(
      root
        .querySelector('[data-line-kind="sequence"] [data-sequence-position]')
        ?.getAttribute("data-sequence-position"),
    ),
  );
  expect(Math.abs(positionAfterResize - positionBeforeResize)).toBeLessThan(
    500,
  );

  const manyRowScroller = page.getByTestId("many-row-scroll-container");
  const manyRowRoot = manyRowScroller.locator('[data-virtualized="true"]');
  await expect(manyRowRoot).toBeVisible();
  expect(
    await manyRowRoot.locator('[data-line-kind="sequence"]').count(),
  ).toBeLessThan(500);
  await manyRowScroller.evaluate((node) => {
    node.scrollTop = node.scrollHeight / 2;
  });
  await expect
    .poll(() =>
      manyRowRoot.evaluate((root) =>
        Math.max(
          ...Array.from(
            root.querySelectorAll('[data-line-kind="sequence"]'),
            (line) => Number(line.getAttribute("data-sequence-index")),
          ),
        ),
      ),
    )
    .toBeGreaterThan(1_000);
  await page.screenshot({ path: testInfo.outputPath("virtualized.png") });
  await scrollContainer.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(viewer.getByText("Virtual feature")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("React 19 windows a large viewer against page scrolling", async ({
  page,
}) => {
  await page.goto("/react19/?virtual=window");
  await page.addStyleTag({ url: "/library.css" });
  await expect(page.locator("html")).toHaveAttribute("data-react", /^19\./);
  const viewer = page.getByTestId("window-virtual-sequence-viewer");
  const virtualRoot = viewer.locator('[data-virtualized="true"]');
  await expect(virtualRoot).toBeVisible();
  const initialCount = await virtualRoot
    .locator('[data-line-kind="sequence"] [data-sequence-position]')
    .count();
  expect(initialCount).toBeGreaterThan(0);
  expect(initialCount).toBeLessThan(2_000);
  const initialPosition = await virtualRoot.evaluate((root) =>
    Math.max(
      ...Array.from(
        root.querySelectorAll(
          '[data-line-kind="sequence"] [data-sequence-position]',
        ),
        (residue) => Number(residue.getAttribute("data-sequence-position")),
      ),
    ),
  );
  await virtualRoot.evaluate((root) => {
    const blocks = Number((root as HTMLElement).dataset.coordinateBlockCount);
    window.scrollTo(
      0,
      root.getBoundingClientRect().top + window.scrollY + root.clientHeight / 2,
    );
    if (blocks < 2) throw new Error("fixture did not wrap");
  });
  await expect
    .poll(() =>
      virtualRoot.evaluate((root) =>
        Math.max(
          ...Array.from(
            root.querySelectorAll(
              '[data-line-kind="sequence"] [data-sequence-position]',
            ),
            (residue) => Number(residue.getAttribute("data-sequence-position")),
          ),
        ),
      ),
    )
    .toBeGreaterThan(initialPosition + 1_000);
  expect(
    await virtualRoot
      .locator('[data-line-kind="sequence"] [data-sequence-position]')
      .count(),
  ).toBeLessThan(2_000);
});
