import { expect, test } from "@playwright/test";

const selfHostedInput = ["ACGTACGTACGT", "ACGTTCGTACG"];

test("disabled alignment has no action, runtime shim, or asset request", async ({
  page,
}) => {
  const alignmentRequests: string[] = [];
  page.on("request", (request) => {
    if (/biowasm|\/assets\//.test(request.url())) {
      alignmentRequests.push(request.url());
    }
  });

  await page.goto("/?alignment=disabled");
  await expect(page.getByRole("button", { name: "Align" })).toHaveCount(0);
  expect(await page.evaluate(() => "process" in window)).toBe(false);
  await page.waitForTimeout(250);
  expect(alignmentRequests).toEqual([]);
});

test("failed asset loading is announced and can be retried", async ({
  page,
}) => {
  const failedAssetRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/missing-assets/")) {
      failedAssetRequests.push(request.url());
    }
  });

  await page.goto("/?alignment=failure");
  await page.getByRole("button", { name: "Align" }).click();
  await expect(page.getByRole("alert")).toContainText("Alignment failed", {
    timeout: 90_000,
  });
  const firstAttemptRequests = failedAssetRequests.length;
  expect(firstAttemptRequests).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Retry alignment" }).click();
  await expect
    .poll(() => failedAssetRequests.length, { timeout: 90_000 })
    .toBeGreaterThan(firstAttemptRequests);
  await expect(page.getByRole("alert")).toContainText("Alignment failed", {
    timeout: 90_000,
  });
});

test("self-hosted assets run a real alignment with public CDN blocked", async ({
  page,
}) => {
  const publicCdnRequests: string[] = [];
  const selfHostedRequests = new Set<string>();
  await page.route("https://biowasm.com/**", async (route) => {
    publicCdnRequests.push(route.request().url());
    await route.abort();
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/assets/")) {
      selfHostedRequests.add(url.pathname);
    }
  });

  await page.goto("/?alignment=self-hosted");
  expect(await page.evaluate(() => "process" in window)).toBe(false);
  await page.getByRole("button", { name: "Align" }).click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { alignmentUpdates: string[][] })
              .alignmentUpdates.length,
        ),
      { timeout: 90_000 },
    )
    .toBe(1);

  const [aligned] = await page.evaluate(
    () =>
      (window as unknown as { alignmentUpdates: string[][] }).alignmentUpdates,
  );
  expect(aligned).toHaveLength(selfHostedInput.length);
  expect(new Set(aligned.map((sequence) => sequence.length)).size).toBe(1);
  aligned.forEach((sequence, index) => {
    expect(sequence.replaceAll("-", "")).toBe(selfHostedInput[index]);
  });
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { alignmentUpdates: string[][] }).alignmentUpdates
          .length,
    ),
  ).toBe(1);
  expect(publicCdnRequests).toEqual([]);
  expect([...selfHostedRequests].sort()).toEqual(
    [
      "/assets/coreutils/8.32/cat.js",
      "/assets/coreutils/8.32/cat.wasm",
      "/assets/mafft/7.520/dvtditr.js",
      "/assets/mafft/7.520/dvtditr.wasm",
      "/assets/mafft/7.520/tbfast.js",
      "/assets/mafft/7.520/tbfast.wasm",
    ].sort(),
  );
});
