import { expect, test, type Page } from "@playwright/test";

type Framework = "plain" | "tailwind3" | "tailwind4";
type LoadOrder = "before" | "after";

const frameworks: Framework[] = ["plain", "tailwind3", "tailwind4"];
const loadOrders: LoadOrder[] = ["before", "after"];

const hostSnapshot = (page: Page) =>
  page.evaluate(() => {
    const styles = (testId: string, properties: string[]) => {
      const element = document.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );
      if (!element) throw new Error(`Missing host fixture: ${testId}`);
      const computed = getComputedStyle(element);
      return Object.fromEntries(
        properties.map((property) => [
          property,
          computed.getPropertyValue(property),
        ]),
      );
    };

    return {
      heading: styles("host-heading", [
        "display",
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "margin-block-start",
        "margin-block-end",
      ]),
      list: styles("host-list", [
        "display",
        "list-style-position",
        "list-style-type",
        "margin-block-start",
        "margin-block-end",
        "padding-inline-start",
      ]),
      button: styles("host-button", [
        "appearance",
        "background-color",
        "border-top-style",
        "border-top-width",
        "color",
        "font-family",
        "font-size",
        "padding-block-start",
        "padding-inline-start",
      ]),
      input: styles("host-input", [
        "appearance",
        "background-color",
        "border-top-style",
        "border-top-width",
        "color",
        "font-family",
        "font-size",
        "padding-block-start",
        "padding-inline-start",
      ]),
      theme: styles("host-theme", [
        "color",
        "font-family",
        "padding-top",
        "--color-emerald-700",
        "--color-zinc-800",
        "--font-mono",
        "--spacing",
        "--nsv-color-sequences-primary",
        "--tw-border-style",
        "--tw-font-weight",
        "--tw-translate-x",
      ]),
      utility: styles("host-utility", [
        "display",
        "border-top-left-radius",
        "border-top-style",
        "border-top-width",
        "font-size",
      ]),
    };
  });

async function loadLibraryStyles(page: Page, order: LoadOrder) {
  await page.evaluate(async (requestedOrder) => {
    const load = (
      window as typeof window & {
        loadLibraryStyles: (order: LoadOrder) => Promise<void>;
      }
    ).loadLibraryStyles;
    await load(requestedOrder);
  }, order);
}

async function expectViewerStyles(page: Page) {
  const sequence = page.getByTestId("sequence-viewer");
  const linear = page.getByTestId("linear-viewer");
  const circular = page.getByTestId("circular-viewer");

  await expect(sequence.locator(".nsv-root.caller-container")).toBeVisible();
  await expect(linear.locator(".nsv-root.caller-linear")).toBeVisible();
  await expect(circular.locator(".nsv-root.caller-circular")).toBeVisible();

  const character = sequence.locator("div.caller-char").first();
  await expect(character).toHaveCSS("color", "rgb(15, 118, 110)");
  await expect(sequence.locator(".caller-selection").first()).toBeVisible();

  for (const viewer of [sequence, linear, circular]) {
    const annotation = viewer.locator(".caller-annotation").first();
    await expect(annotation).toBeAttached();
    await expect(annotation).toHaveCSS("fill", "rgb(251, 191, 36)");
  }

  const sequenceRoot = sequence.locator(".nsv-root");
  await expect(sequenceRoot).toHaveCSS("display", "flex");
  await expect(sequenceRoot).toHaveCSS("position", "relative");
  await expect(sequence.locator("button").first()).toHaveCSS("display", "flex");
  await expect(sequence.locator("button").first()).toHaveCSS("height", "16px");

  const linearSvg = linear.locator("svg").first();
  await expect(linearSvg).toBeVisible();
  await expect(linearSvg.locator("rect").first()).toBeAttached();
  expect((await linearSvg.boundingBox())?.width).toBeGreaterThan(0);

  const circularSvg = circular.locator("svg").first();
  await expect(circularSvg).toBeVisible();
  await expect(circularSvg.locator("path").first()).toBeAttached();
  expect((await circularSvg.boundingBox())?.width).toBeGreaterThan(0);

  const hostThemeColor = "rgb(111, 22, 33)";
  expect(
    await circular
      .locator(".nsv-root")
      .evaluate((element) => getComputedStyle(element).color),
  ).not.toBe(hostThemeColor);

  const ticks = page.getByTestId("standalone-ticks");
  await expect(ticks.locator(":scope > .nsv-root")).toHaveCSS(
    "box-sizing",
    "border-box",
  );
  await expect(ticks.locator("p").first()).toHaveCSS("margin-top", "0px");
  await expect(ticks.locator("p").first()).toHaveCSS("margin-bottom", "0px");
  await expect(ticks.locator(":scope > div > div").first()).toHaveCSS(
    "height",
    "48px",
  );
  await expect(
    page.getByTestId("standalone-gutter").locator(":scope > .nsv-root"),
  ).toHaveCSS("box-sizing", "border-box");

  await page.getByRole("combobox").click();
  const portal = page.locator(".nsv-portal");
  await expect(portal).toBeVisible();
  await expect(portal).toHaveCSS("position", "relative");
  await expect(portal).toHaveCSS("z-index", "50");
  await expect(portal).toHaveCSS("border-top-style", "solid");
  await expect(portal).toHaveCSS("border-top-width", "1px");
  await expect(portal).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(portal.getByRole("option").first()).toHaveCSS(
    "font-size",
    "14px",
  );
}

for (const framework of frameworks) {
  for (const order of loadOrders) {
    test(`${framework}: library ${order} host CSS is isolated`, async ({
      page,
    }) => {
      await page.goto(`/?framework=${framework}`);
      await expect(page.getByTestId("host-heading")).toBeVisible();
      await page.waitForFunction(() =>
        Boolean(
          document.querySelector<HTMLLinkElement>('link[href*="host-"]')?.sheet,
        ),
      );
      const before = await hostSnapshot(page);

      await loadLibraryStyles(page, order);

      expect(await hostSnapshot(page)).toEqual(before);
      await expectViewerStyles(page);
    });
  }
}

test("packed stylesheet contains only prefixed, scoped library rules", async ({
  request,
}) => {
  const response = await request.get("/library.css");
  expect(response.ok()).toBe(true);
  const css = await response.text();

  expect(css).toContain(".nsv\\:flex");
  expect(css).toContain(".nsv-root");
  expect(css).toContain(".nsv-portal");
  expect(css).toContain("--nsv-color-sequences-primary");
  expect(css).not.toMatch(/(^|})\.flex\{/);
  expect(css).not.toContain("--tw-");
  expect(css).not.toMatch(/(^|[^\w-])--color-/);
  expect(css).not.toMatch(
    /(^|})\s*(?:\*|html|body|h1|ol\s*,\s*ul|button\s*,\s*input)[,{]/,
  );
});
