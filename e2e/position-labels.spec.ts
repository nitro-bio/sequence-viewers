import { expect, test, type Locator } from "@playwright/test";

async function expectRulerGeometry(scroller: Locator, virtual: boolean) {
  await expect(scroller.locator(".nsv-position-label").first()).toHaveCSS(
    "position",
    "absolute",
  );
  await expect
    .poll(() =>
      scroller.evaluate((root) => {
        const columns = [
          ...root.querySelectorAll<HTMLElement>("[data-sequence-column]"),
        ];
        const issues: string[] = [];
        for (const column of columns) {
          const index = column.dataset.sequenceColumn;
          const residue = root.querySelector<HTMLElement>(
            `[data-sequence-position="${index}"] [data-sequence-row="0"], [data-sequence-position="${index}"][data-sequence-row="0"]`,
          );
          if (!residue) {
            issues.push(`missing residue ${index}`);
            continue;
          }
          const columnRect = column.getBoundingClientRect();
          const residueRect = residue.getBoundingClientRect();
          if (Math.abs(columnRect.left - residueRect.left) > 1)
            issues.push(`anchor ${index}`);
          const label = column.querySelector<HTMLElement>(
            ".nsv-position-label",
          );
          if (label) {
            const rect = label.getBoundingClientRect();
            const bounds = root.getBoundingClientRect();
            if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
              issues.push(`edge ${index}`);
            if (rect.bottom > residueRect.top + 1)
              issues.push(`height ${index}`);
          }
        }
        const lines = [
          ...root.querySelectorAll<HTMLElement>("[data-virtual-line]"),
        ];
        for (let i = 1; i < lines.length; i++) {
          if (
            lines[i - 1].getBoundingClientRect().bottom >
            lines[i].getBoundingClientRect().top + 1
          )
            issues.push("overlapping virtual lines");
        }
        return columns.length ? issues : ["no columns"];
      }),
    )
    .toEqual([]);
  if (virtual) {
    expect(
      await scroller.locator("[data-sequence-column]").count(),
    ).toBeLessThan(1000);
  }
}

for (const react of ["/", "/react19/"]) {
  for (const variant of [
    { renderer: "default", length: 120, rows: 3, dense: 0 },
    { renderer: "adaptive", length: 120, rows: 3, dense: 1 },
    { renderer: "default", length: 6000, rows: 2, dense: 0 },
    { renderer: "adaptive", length: 6000, rows: 2, dense: 1 },
    { renderer: "adaptive", length: 8, rows: 800, dense: 1 },
  ]) {
    test(`packed labels ${react} ${variant.renderer} ${variant.rows}x${variant.length}`, async ({
      page,
    }) => {
      const query = new URLSearchParams(
        Object.entries(variant).map(([key, value]) => [key, String(value)]),
      );
      await page.goto(`${react}?labels&width=320&${query}`);
      await page.addStyleTag({ url: "/library.css" });
      const scroller = page.getByTestId("label-scroller");
      const virtual = variant.length * variant.rows > 5000;
      if (virtual)
        await expect(scroller.locator("[data-virtualized]")).toHaveCount(1);
      await expectRulerGeometry(scroller, virtual);
      await expect(
        scroller.locator(".nsv-position-label").first(),
      ).toContainText("35a");
      const residue = scroller.locator(
        '[data-sequence-position="0"] [data-sequence-row="0"], [data-sequence-position="0"][data-sequence-row="0"]',
      );
      await residue.click();
      await expect(page.getByTestId("label-selection")).toContainText(
        '"start":0',
      );
      for (const width of [960, 280]) {
        await page
          .getByRole("spinbutton", { name: "Viewer width" })
          .fill(String(width));
        await expectRulerGeometry(scroller, virtual);
      }
      if (virtual && variant.length > 1000) {
        await scroller.evaluate((node) => {
          node.scrollTop = 4000;
        });
        await expect
          .poll(() =>
            scroller
              .locator("[data-sequence-column]")
              .first()
              .getAttribute("data-sequence-column"),
          )
          .not.toBe("0");
        await expectRulerGeometry(scroller, true);
        const firstColumn = scroller.locator("[data-sequence-column]").first();
        const index = Number(
          await firstColumn.getAttribute("data-sequence-column"),
        );
        const firstLabel = scroller.locator(".nsv-position-label").first();
        expect(await firstLabel.textContent()).toContain(
          `${(variant.dense ? index : Math.ceil(index / 10) * 10) + 35}a`,
        );
      }
    });
  }
}

test("custom virtual labels resize with local state and preserve coordinate context", async ({
  page,
}) => {
  await page.goto(
    "/?labels&renderer=custom&length=6000&rows=2&width=640&dense=1",
  );
  await page.addStyleTag({ url: "/library.css" });
  const scroller = page.getByTestId("label-scroller");
  await expectRulerGeometry(scroller, true);
  const label = scroller.locator('[data-label-column="0"]');
  const ruler = scroller.locator("[data-virtual-line]").first();
  const before = (await ruler.boundingBox())!.height;
  await label.click();
  await expect(label).toHaveText("Residue position 35a");
  await expect(page.getByTestId("label-selection")).toHaveText("null");
  await expect
    .poll(async () => (await ruler.boundingBox())!.height)
    .toBeGreaterThan(before);
  await expectRulerGeometry(scroller, true);
  const residue = scroller.locator(
    '[data-sequence-position="0"][data-sequence-row="0"]',
  );
  await residue.hover();
  await expect(label).toHaveAttribute("data-hovered", "true");
  await residue.click();
  await expect(label).toHaveAttribute("data-selected", "true");
  await expect(label).toHaveText("Residue position 35a");
  await page
    .getByRole("combobox", { name: "Label renderer" })
    .selectOption("minimal");
  await expect(
    scroller.locator(".nsv-position-minimal-marker").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle supplied labels" }).click();
  await expect(scroller.locator(".nsv-position-label").first()).toHaveText(
    "| 0",
  );
  await page
    .getByRole("combobox", { name: "Label renderer" })
    .selectOption("default");
  await expect(scroller.locator(".nsv-position-slot")).toHaveCount(0);
  await expect(scroller.getByText("| 0", { exact: true })).toBeVisible();
});

test("adaptive labels remain aligned during window scrolling", async ({
  page,
}) => {
  await page.goto(
    "/react19/?labels&renderer=adaptive&length=6000&rows=2&width=640&dense=1&window",
  );
  await page.addStyleTag({ url: "/library.css" });
  const scroller = page.getByTestId("label-scroller");
  await expectRulerGeometry(scroller, true);
  await page.evaluate(() => window.scrollTo(0, 4000));
  await expect
    .poll(() =>
      scroller
        .locator("[data-sequence-column]")
        .first()
        .getAttribute("data-sequence-column"),
    )
    .not.toBe("0");
  await expectRulerGeometry(scroller, true);
});
