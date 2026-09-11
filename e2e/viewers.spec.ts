import { expect, test } from "@playwright/test";

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
    await expect(viewer.getByRole("status")).toContainText(
      "Some annotations were not displayed",
    );
    await expect(viewer.locator(".caller-annotation").first()).toBeVisible();
    await expect(viewer).not.toContainText("Invalid feature");
  }
  await expect(
    page.getByTestId("sequence-viewer").locator(".caller-char").first(),
  ).toBeVisible();
  const circular = page.getByTestId("circular-viewer");
  const diagnostic = await circular.getByRole("status").boundingBox();
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
