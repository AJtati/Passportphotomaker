export const convertToPixels = (value, unit, dpi) => {
  if (unit === 'in') return value * dpi;
  if (unit === 'mm') return (value / 25.4) * dpi;
  return value;
};
