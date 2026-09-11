import { expect, test } from "@playwright/test";

test("opt in to self-hosted MAFFT, recover from failure, and discard obsolete results", async ({
  page,
}) => {
  let workerCount = 0;
  let toolRequests = 0;
  let holdNextLoad = false;
  let releaseLoad = () => {};
  let loadStarted = () => {};
  const publicRequests: string[] = [];
  page.on("worker", () => workerCount++);
  await page.route("https://biowasm.com/**", async (route) => {
    publicRequests.push(route.request().url());
    await route.abort();
  });
  await page.route("**/assets/mafft/7.520/tbfast.js", async (route) => {
    if (++toolRequests === 1) return route.abort("failed");
    if (holdNextLoad) {
      holdNextLoad = false;
      await new Promise<void>((resolve) => {
        releaseLoad = resolve;
        loadStarted();
      });
    }
    await route.continue();
  });
  await page.route("http://127.0.0.1:4173/", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy":
          "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; object-src 'none'",
      },
    });
  });
  await page.goto("/");
  await page.addStyleTag({ url: "/library.css" });
  expect(await page.evaluate(() => "process" in window)).toBe(false);
  await expect(
    page.getByRole("button", { name: "Align", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Enable alignment").check();
  const align = page.getByRole("button", { name: "Align", exact: true });
  await expect(align).toBeEnabled();
  expect(workerCount).toBe(0);
  expect(toolRequests).toBe(0);

  await align.click();
  await expect(page.getByRole("alert")).toContainText("Alignment failed", {
    timeout: 90_000,
  });
  await page.getByRole("button", { name: "Retry alignment" }).click();
  await expect(page.getByTestId("alignment-updates")).toHaveText("1", {
    timeout: 90_000,
  });
  const aligned: string[] = JSON.parse(
    (await page.getByTestId("sequence-output").textContent())!,
  );
  expect(new Set(aligned.map((sequence) => sequence.length)).size).toBe(1);
  expect(aligned.map((sequence) => sequence.replaceAll("-", ""))).toEqual([
    "ACGTACGTACGT",
    "ACGTTCGTACG",
  ]);
  await expect(page.getByRole("alert")).toHaveCount(0);

  // Pause a real tool load so a host edit deterministically overtakes alignment.
  holdNextLoad = true;
  const loading = new Promise<void>((resolve) => {
    loadStarted = resolve;
  });
  await align.click();
  await loading;
  try {
    await page.getByLabel("Sequences", { exact: true }).fill('["ACGT","AGT"]');
    await page.getByRole("button", { name: "Apply sequences" }).click();
  } finally {
    releaseLoad();
  }
  await expect(align).toBeEnabled({ timeout: 90_000 });
  await expect(page.getByTestId("alignment-updates")).toHaveText("1");
  await expect(page.getByTestId("sequence-output")).toHaveText(
    '["ACGT","AGT"]',
  );

  await align.click();
  await expect(page.getByTestId("alignment-updates")).toHaveText("2", {
    timeout: 90_000,
  });
  const updated: string[] = JSON.parse(
    (await page.getByTestId("sequence-output").textContent())!,
  );
  expect(new Set(updated.map((sequence) => sequence.length)).size).toBe(1);
  expect(updated.map((sequence) => sequence.replaceAll("-", ""))).toEqual([
    "ACGT",
    "AGT",
  ]);
  expect(workerCount).toBe(1);
  expect(publicRequests).toEqual([]);
});
