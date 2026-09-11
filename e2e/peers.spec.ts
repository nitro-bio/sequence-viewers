import { expect, test } from "@playwright/test";

for (const [route, major] of [
  ["/", "18."],
  ["/react19/", "19."],
] as const) {
  test(`packed viewers run with React ${major}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route);
    await page.getByTestId("sequence-output").waitFor();
    const version = await page.evaluate(
      () => (window as unknown as { reactVersion: string }).reactVersion,
    );
    expect(version).toMatch(new RegExp(`^${major.replace(".", "\\.")}`));
    await page.evaluate(() =>
      (
        window as unknown as {
          loadLibraryStyles: (order: string) => Promise<void>;
        }
      ).loadLibraryStyles("after"),
    );
    await expect(page.getByTestId("sequence-viewer")).toContainText(
      "Sequence 1",
    );
    await expect(
      page.getByTestId("linear-viewer").locator("svg"),
    ).toBeVisible();
    await expect(
      page.getByTestId("circular-viewer").locator("svg").first(),
    ).toBeVisible();
    await page.getByTestId("sequence-viewer").getByRole("combobox").click();
    await expect(
      page.getByRole("option", { name: "Sequence 2" }),
    ).toBeVisible();
    await page.getByRole("option", { name: "Sequence 2" }).click();
    await expect(
      page.getByTestId("sequence-viewer").getByRole("combobox"),
    ).toContainText("Sequence 2");
    expect(errors).toEqual([]);
  });
}
