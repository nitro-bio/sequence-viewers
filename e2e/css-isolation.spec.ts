import { expect, test, type Page } from "@playwright/test";

const hostSnapshot = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#host [data-testid]")].map((element) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(
        [...style].map((property) => [
          property,
          style.getPropertyValue(property),
        ]),
      );
    }),
  );

for (const framework of ["plain", "tailwind3", "tailwind4"]) {
  for (const order of ["before", "after"] as const) {
    test(`${framework}: viewers and portals coexist with library CSS ${order} host CSS`, async ({
      page,
    }) => {
      await page.goto(`/?framework=${framework}`);
      await page.waitForFunction(
        () =>
          document.querySelector<HTMLLinkElement>('link[href*="host-"]')?.sheet,
      );
      const before = await hostSnapshot(page);
      await page.evaluate(async (order) => {
        const host = document.querySelector('link[href*="host-"]')!;
        const library = document.createElement("link");
        library.rel = "stylesheet";
        library.href = "/library.css";
        await new Promise<void>((resolve, reject) => {
          library.onload = () => resolve();
          library.onerror = reject;
          host[order](library);
        });
      }, order);
      expect(await hostSnapshot(page)).toEqual(before);

      const sequence = page.getByTestId("sequence-viewer");
      await expect(sequence.locator(".caller-container")).toHaveCSS(
        "display",
        "flex",
      );
      await expect(sequence.locator("div.caller-char").first()).toHaveCSS(
        "color",
        "rgb(15, 118, 110)",
      );
      await expect(sequence.locator(".caller-selection").first()).toBeVisible();
      for (const name of ["sequence", "linear", "circular"]) {
        await expect(
          page
            .getByTestId(`${name}-viewer`)
            .locator(".caller-annotation")
            .first(),
        ).toHaveCSS("fill", "rgb(251, 191, 36)");
      }
      await expect(
        page.getByTestId("linear-viewer").locator("svg"),
      ).toBeVisible();
      await expect(
        page.getByTestId("circular-viewer").locator("svg").first(),
      ).toBeVisible();
      await expect(
        page.getByTestId("standalone-ticks").locator("p").first(),
      ).toHaveCSS("margin-top", "0px");
      await expect(
        page.getByTestId("standalone-gutter").locator(".nsv-root"),
      ).toHaveCSS("box-sizing", "border-box");

      await sequence.getByRole("combobox").click();
      const portal = page.locator(".nsv-portal");
      await expect(portal).toBeVisible();
      await expect(portal).toHaveCSS("border-top-width", "1px");
      await expect(portal).not.toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await page.getByRole("option", { name: "Sequence 2" }).click();
      await expect(sequence.getByRole("combobox")).toContainText("Sequence 2");
    });
  }
}
