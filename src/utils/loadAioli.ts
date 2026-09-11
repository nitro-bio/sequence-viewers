import type { AioliConstructor } from "@biowasm/aioli";

export const loadAioli = async (): Promise<AioliConstructor> => {
  const mod = await import("@biowasm/aioli");
  return mod.default;
};
