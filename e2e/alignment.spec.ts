import { expect, test } from "@playwright/test";

const selfHostedInput = ["ACGTACGTACGT", "ACGTTCGTACG"];

const isAlignmentAsset = (url: string) => {
  const parsed = new URL(url);
  return (
    parsed.hostname === "biowasm.com" ||
    parsed.pathname.startsWith("/assets/coreutils/") ||
    parsed.pathname.startsWith("/assets/mafft/")
  );
};

test("disabled alignment has no action, runtime shim, or asset request", async ({
  page,
}) => {
  const alignmentRequests: string[] = [];
  page.on("request", (request) => {
    if (isAlignmentAsset(request.url())) {
      alignmentRequests.push(request.url());
    }
  });

  await page.goto("/?alignment=disabled");
  await expect(page.getByRole("button", { name: "Align" })).toHaveCount(0);
  expect(await page.evaluate(() => "process" in window)).toBe(false);
  await page.waitForTimeout(250);
  expect(alignmentRequests).toEqual([]);
});

test("failed worker initialization requires a remount without another request", async ({
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
  await expect(page.getByRole("alert")).toContainText(
    "Alignment worker could not initialize",
    { timeout: 90_000 },
  );
  const firstAttemptRequests = failedAssetRequests.length;
  expect(firstAttemptRequests).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Align" })).toBeDisabled();

  await page
    .getByRole("button", { name: "Align" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await page.waitForTimeout(500);
  expect(failedAssetRequests).toHaveLength(firstAttemptRequests);
});

test("a transient MAFFT tool failure retries on the retained worker", async ({
  page,
}) => {
  let tbfastRequests = 0;
  await page.route("**/assets/mafft/7.520/tbfast.js", async (route) => {
    tbfastRequests += 1;
    if (tbfastRequests === 1) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await page.route("https://biowasm.com/**", async (route) => {
    await route.abort();
  });

  await page.goto("/?alignment=self-hosted");
  await page.getByRole("button", { name: "Align" }).click();
  await expect(page.getByRole("alert")).toContainText("Alignment failed", {
    timeout: 90_000,
  });
  expect(tbfastRequests).toBe(1);

  await page.getByRole("button", { name: "Retry alignment" }).click();
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
  expect(tbfastRequests).toBe(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
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
    if (
      url.pathname.startsWith("/assets/coreutils/") ||
      url.pathname.startsWith("/assets/mafft/")
    ) {
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

test("self-hosted alignment runs under a restrictive CSP", async ({ page }) => {
  const csp = [
    "default-src 'none'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src blob:",
    "connect-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join("; ");
  const publicCdnRequests: string[] = [];

  await page.route("**/*", async (route) => {
    if (!route.request().isNavigationRequest()) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": csp,
      },
    });
  });
  await page.route("https://biowasm.com/**", async (route) => {
    publicCdnRequests.push(route.request().url());
    await route.abort();
  });

  await page.goto("/?alignment=self-hosted");
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
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(publicCdnRequests).toEqual([]);
});
