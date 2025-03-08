export function getRndInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function binNumbers(
  values: (number | null | undefined)[],
  bins: number,
) {
  const filteredValues = values.filter(
    (value) => value !== null && value !== undefined,
  );
  const min = Math.min(...filteredValues);
  const max = Math.max(...filteredValues);
  const binWidth = (max - min) / bins;
  return values.map((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const bin = Math.floor((value - min) / binWidth);
    return bin;
  });
}
