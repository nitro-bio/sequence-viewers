# Workload benchmark

```sh
pnpm install --frozen-lockfile
pnpm build:ci
pnpm exec playwright install chromium
pnpm benchmark
```

The runner packs the built library, extracts the npm artifact into an ignored
fixture, and builds a production Vite/React 18 consumer. It measures one, ten,
and one hundred rows, including a single 100 kb sequence. Each case runs three
times in a fresh headless Chromium process, with no CPU throttling and an
1100×900 viewport. `BENCHMARK_RUNS=1 pnpm benchmark` is a quicker local check.

Mount timing starts immediately before `root.render` and ends after two animation
frames following React's layout effect. Selection timing dispatches a mousedown
on the first rendered cell and waits two animation frames. The runner checks
that at least one visible cell and no more than one cell per sequence row is
selected. Virtualized cases also record the currently rendered cell count. This
synthetic interaction measures rendering work; it is not a keyboard, pointer
latency, scrolling, or accessibility audit.

Network/module startup and alignment execution are excluded. Sequences have no
annotations and mismatch highlighting is enabled. Annotation density, host CSS,
other tabs, hardware, and browser affect results. A case that cannot report
within 30 seconds is recorded as a failure, not silently omitted. This benchmark
is descriptive and does not impose a noisy timing gate on CI.

Results, hardware metadata, browser version, and failures are written to
`.packed-test/benchmark/results.json`. The checked-in report in
[results.json](results.json) is summarized in [workload guidance](../docs/limits.md).
The published 2.1.0 baseline remains in `results.json`. The superseded
hand-written virtualization candidate remains in
[results-virtualized.json](results-virtualized.json), while the current
TanStack Virtual candidate is recorded in
[results-tanstack.json](results-tanstack.json). Each report includes its source
commit and dirty-worktree status.
