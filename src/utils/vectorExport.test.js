import { getVectorOptions, prepareSvg, safeVectorFilename, svgToDxf } from './vectorExport';

const SAMPLE_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">
    <path d="M0,0L100,0L100,50L0,50Z" fill="#112233" />
  </svg>
`;

describe('vector export helpers', () => {
  test('sizes and sanitizes generated SVG output', () => {
    const result = prepareSvg(SAMPLE_SVG.replace('</svg>', '<script>alert(1)</script></svg>'), 200);
    expect(result.widthMm).toBe(200);
    expect(result.heightMm).toBe(100);
    expect(result.pathCount).toBe(1);
    expect(result.svg).toContain('viewBox="0 0 100 50"');
    expect(result.svg).not.toContain('<script');
  });

  test('exports closed millimetre contours to DXF', () => {
    const dxf = svgToDxf(SAMPLE_SVG, 200);
    expect(dxf).toContain('$INSUNITS\n70\n4');
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('COLOR_112233');
    expect(dxf).toContain('70\n1');
    expect(dxf.trim().endsWith('EOF')).toBe(true);
  });

  test('creates a monochrome white artboard with an exact physical margin', () => {
    const result = prepareSvg(SAMPLE_SVG, 120, {
      whiteBackground: true,
      monochrome: true,
      marginMm: 10,
    });

    expect(result.widthMm).toBe(120);
    expect(result.heightMm).toBe(70);
    expect(result.svg).toContain('viewBox="-10 -10 120 70"');
    expect(result.svg).toContain('data-print-background="true"');
    expect(result.svg).toContain('fill="#000000"');
  });

  test('rejects a carving margin that leaves no artwork area', () => {
    expect(() => prepareSvg(SAMPLE_SVG, 100, { marginMm: 50 })).toThrow(/smaller than half/i);
  });

  test('rejects an empty carving trace with a useful recovery message', () => {
    expect(() => prepareSvg('<svg viewBox="0 0 100 50"/>', 100, { monochrome: true })).toThrow(/faint details/i);
  });

  test('builds purpose and detail settings without mutating presets', () => {
    expect(getVectorOptions('logo', 'smooth')).toMatchObject({
      preset: 'poster',
      maxColors: 8,
      simplify: 1.25,
      filterSpeckle: 8,
      pathPrecision: 4,
      optimize: 1,
    });
    expect(getVectorOptions('nameplate', 'detailed')).toMatchObject({
      preset: 'bw',
      filterSpeckle: 0,
      pathPrecision: 6,
      optimize: 0,
    });
    expect(getVectorOptions('nameplate', 'detailed')).not.toHaveProperty('simplify');
    expect(getVectorOptions('logo', 'detailed')).toMatchObject({ maxColors: 24 });
    expect(getVectorOptions('photo', 'detailed')).toMatchObject({ maxColors: 48 });
  });

  test('creates safe, bounded download names', () => {
    expect(safeVectorFilename('My design (final) 🚀.png')).toBe('My-design-final');
    expect(safeVectorFilename('..jpg')).toBe('vector-artwork');
  });
});
