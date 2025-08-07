export const loadAioli = async () => {
  const mod = await import("@biowasm/aioli");
  return mod.default;
};
