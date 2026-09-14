import { expect, test } from "@playwright/test";

for (const example of [
  {
    name: "Vite with React 18",
    url: "http://127.0.0.1:4174",
    heading: "Protein sequence comparison",
  },
  {
    name: "Next.js App Router with React 19",
    url: "http://127.0.0.1:4175",
    heading: "Inspect and align DNA sequences",
  },
]) {
  test(`${example.name} runs from the packed package`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto(example.url);
    await expect(
      page.getByRole("heading", { name: example.heading }),
    ).toBeVisible();
    const viewer = page.getByTestId("viewer-example");
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText("Sequence 1", { exact: true })).toBeVisible();

    const residues = viewer
      .locator("div.nsv\\:font-mono")
      .filter({ hasText: /^[A-Z-]$/ });
    await expect(residues.first()).toBeVisible();
    const copy = viewer.getByRole("button", { name: "Copy to clipboard" });
    await expect(copy).toBeDisabled();
    await residues.nth(0).hover();
    await page.mouse.down();
    await residues.nth(2).hover();
    await page.mouse.up();
    await expect(copy).toBeEnabled();

    if (example.name.startsWith("Vite")) {
      await expect(residues.first()).toHaveClass(/nsv:text-sequences-primary/);
    } else {
      await expect(page.getByTestId("selection-output")).toContainText(
        "Selected residues 1–",
      );
    }
    expect(errors).toEqual([]);
  });
}

test("Next.js serves the pinned self-hosted alignment tree", async ({
  request,
}) => {
  const loader = await request.get(
    "http://127.0.0.1:4175/biowasm/mafft/7.520/tbfast.js",
  );
  expect(loader.ok()).toBe(true);
  expect(await loader.body()).not.toHaveLength(0);

  const wasm = await request.get(
    "http://127.0.0.1:4175/biowasm/mafft/7.520/tbfast.wasm",
  );
  expect(wasm.ok()).toBe(true);
  expect(wasm.headers()["content-type"]).toContain("application/wasm");
  expect([...(await wasm.body()).subarray(0, 4)]).toEqual([0, 97, 115, 109]);
});

test("Next.js completes alignment from its self-hosted assets", async ({
  page,
}) => {
  const publicRequests: string[] = [];
  await page.route("https://biowasm.com/**", async (route) => {
    publicRequests.push(route.request().url());
    await route.abort();
  });

  await page.goto("http://127.0.0.1:4175");
  const align = page.getByRole("button", { name: "Align", exact: true });
  await expect(align).toBeEnabled();
  await align.click();
  await expect(page.getByTestId("alignment-completions")).toHaveText("1", {
    timeout: 90_000,
  });

  const aligned: string[] = JSON.parse(
    (await page.getByTestId("sequence-output").textContent())!,
  );
  expect(new Set(aligned.map((sequence) => sequence.length)).size).toBe(1);
  expect(aligned.map((sequence) => sequence.replaceAll("-", ""))).toEqual([
    "ACGTTGCAACGT",
    "ACGTAGCAACGT",
  ]);
  expect(publicRequests).toEqual([]);
});
