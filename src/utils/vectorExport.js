import { svgPathProperties } from 'svg-path-properties';

export const VECTOR_PRESETS = {
  nameplate: {
    label: 'Nameplate / carving',
    help: 'Clean black carving artwork on a white, print-ready artboard.',
    carving: true,
    options: { preset: 'bw', mode: 'spline' },
  },
  engraving: {
    label: 'General engraving / cutting',
    help: 'Single-colour closed paths for carving, CNC and laser work.',
    options: { preset: 'bw', mode: 'spline' },
  },
  logo: {
    label: 'Logo / illustration',
    help: 'A compact colour trace with clean, seam-free regions.',
    options: {
      preset: 'poster',
      hierarchical: 'cutout',
      mode: 'spline',
    },
    maxColors: { smooth: 8, balanced: 16, detailed: 24 },
  },
  photo: {
    label: 'Detailed artwork',
    help: 'More colour regions for artwork and photographic references.',
    options: {
      preset: 'photo',
      hierarchical: 'stacked',
      mode: 'spline',
    },
    maxColors: { smooth: 16, balanced: 32, detailed: 48 },
  },
};

export const VECTOR_DETAIL = {
  smooth: {
    label: 'Smooth', simplify: 1.25, filterSpeckle: 8, pathPrecision: 4, optimize: 1,
  },
  balanced: {
    label: 'Balanced', simplify: 0.4, filterSpeckle: 2, pathPrecision: 5, optimize: 0,
  },
  detailed: {
    label: 'Detailed', simplify: null, filterSpeckle: 0, pathPrecision: 6, optimize: 0,
  },
};

export const CARVING_SENSITIVITY = {
  bold: { label: 'Strong marks only', threshold: 130 },
  balanced: { label: 'Balanced', threshold: 175 },
  fine: { label: 'Include faint details', threshold: 210 },
};

const parseLength = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseSvg = (svgText) => {
  const document = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const parseError = document.querySelector('parsererror');
  const root = document.documentElement;
  if (parseError || root?.localName !== 'svg') {
    throw new Error('The vector engine returned an invalid SVG. Please try another image.');
  }
  return { document, root };
};

const getGeometry = (root) => {
  const values = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (values?.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
    return { minX: values[0], minY: values[1], width: values[2], height: values[3] };
  }

  const width = parseLength(root.getAttribute('width'));
  const height = parseLength(root.getAttribute('height'));
  if (!width || !height) throw new Error('The generated SVG has invalid dimensions.');
  return { minX: 0, minY: 0, width, height };
};

const removeUnsafeSvgContent = (root) => {
  root.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((node) => node.remove());
  root.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name.endsWith(':href')) && !value.startsWith('#'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
};

export const getVectorOptions = (presetKey, detailKey) => {
  const detail = VECTOR_DETAIL[detailKey];
  const options = {
    ...VECTOR_PRESETS[presetKey].options,
    filterSpeckle: detail.filterSpeckle,
    pathPrecision: detail.pathPrecision,
    optimize: detail.optimize,
  };

  const maxColors = VECTOR_PRESETS[presetKey].maxColors?.[detailKey];
  if (maxColors) options.maxColors = maxColors;

  // Omitting simplify disables VTracer's additional curve re-fit. A zero value
  // is not equivalent in every engine build, so do not send the field at all.
  if (detail.simplify !== null) options.simplify = detail.simplify;
  return options;
};

export const prepareSvg = (svgText, widthMm, {
  whiteBackground = false,
  monochrome = false,
  marginMm = 0,
} = {}) => {
  const physicalWidth = Number(widthMm);
  if (!Number.isFinite(physicalWidth) || physicalWidth < 1 || physicalWidth > 2000) {
    throw new Error('Output width must be between 1 and 2,000 mm.');
  }

  const physicalMargin = Number(marginMm);
  if (!Number.isFinite(physicalMargin) || physicalMargin < 0 || physicalMargin * 2 >= physicalWidth) {
    throw new Error('White margin must be smaller than half of the finished width.');
  }

  const { document, root } = parseSvg(svgText);
  removeUnsafeSvgContent(root);
  const geometry = getGeometry(root);

  if (monochrome) {
    root.querySelectorAll('path').forEach((path) => {
      path.setAttribute('fill', '#000000');
      path.setAttribute('stroke', 'none');
    });
    if (!root.querySelector('path')) {
      throw new Error('No carving detail was found. Choose “Include faint details” or reverse light artwork.');
    }
  }

  const contentWidthMm = physicalWidth - (physicalMargin * 2);
  const marginUnits = physicalMargin > 0
    ? (physicalMargin * geometry.width) / contentWidthMm
    : 0;
  const outputGeometry = {
    minX: geometry.minX - marginUnits,
    minY: geometry.minY - marginUnits,
    width: geometry.width + (marginUnits * 2),
    height: geometry.height + (marginUnits * 2),
  };
  const heightMm = physicalWidth * (outputGeometry.height / outputGeometry.width);

  if (whiteBackground) {
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', outputGeometry.minX);
    background.setAttribute('y', outputGeometry.minY);
    background.setAttribute('width', outputGeometry.width);
    background.setAttribute('height', outputGeometry.height);
    background.setAttribute('fill', '#ffffff');
    background.setAttribute('data-print-background', 'true');
    root.insertBefore(background, root.firstChild);
  }

  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  root.setAttribute('viewBox', `${outputGeometry.minX} ${outputGeometry.minY} ${outputGeometry.width} ${outputGeometry.height}`);
  root.setAttribute('width', `${physicalWidth}mm`);
  root.setAttribute('height', `${heightMm}mm`);
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(root)}`;
  return {
    svg,
    widthMm: physicalWidth,
    heightMm,
    pathCount: root.querySelectorAll('path').length,
    byteSize: new Blob([svg]).size,
  };
};

export const safeVectorFilename = (filename) => {
  const withoutExtension = String(filename || 'vector-artwork').replace(/\.[^.]+$/, '');
  const safe = withoutExtension.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return (safe || 'vector-artwork').slice(0, 80);
};

const splitSubpaths = (pathData) => {
  const starts = [];
  const matcher = /[Mm](?=\s*[-+.0-9])/g;
  let match;
  while ((match = matcher.exec(pathData))) starts.push(match.index);
  return starts.map((start, index) => pathData.slice(start, starts[index + 1] ?? pathData.length).trim());
};

const layerFromPath = (path, index) => {
  const fill = path.getAttribute('fill') || path.parentElement?.getAttribute('fill') || '';
  const hex = fill.match(/^#([0-9a-f]{6})$/i)?.[1]?.toUpperCase();
  return hex ? `COLOR_${hex}` : `VECTOR_${index + 1}`;
};

const dxfPair = (code, value) => `${code}\n${value}\n`;

export const svgToDxf = (svgText, widthMm) => {
  const { root } = parseSvg(svgText);
  const geometry = getGeometry(root);
  const scale = Number(widthMm) / geometry.width;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('DXF output dimensions are invalid.');

  const polylines = [];
  root.querySelectorAll('path[d]').forEach((path, pathIndex) => {
    splitSubpaths(path.getAttribute('d')).forEach((pathData) => {
      const properties = new svgPathProperties(pathData);
      const length = properties.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return;

      const closed = /[Zz]\s*$/.test(pathData);
      const segments = Math.min(4000, Math.max(4, Math.ceil((length * scale) / 0.25)));
      const points = [];
      const lastIndex = closed ? segments - 1 : segments;
      for (let index = 0; index <= lastIndex; index += 1) {
        const point = properties.getPointAtLength((length * index) / segments);
        points.push({
          x: (point.x - geometry.minX) * scale,
          y: (geometry.height - (point.y - geometry.minY)) * scale,
        });
      }
      if (points.length > 1) polylines.push({ points, closed, layer: layerFromPath(path, pathIndex) });
    });
  });

  if (!polylines.length) throw new Error('No usable vector contours were found for DXF export.');

  const layers = [...new Set(polylines.map(({ layer }) => layer))];
  let dxf = '';
  dxf += dxfPair(0, 'SECTION') + dxfPair(2, 'HEADER');
  dxf += dxfPair(9, '$ACADVER') + dxfPair(1, 'AC1015');
  dxf += dxfPair(9, '$INSUNITS') + dxfPair(70, 4);
  dxf += dxfPair(0, 'ENDSEC');
  dxf += dxfPair(0, 'SECTION') + dxfPair(2, 'TABLES');
  dxf += dxfPair(0, 'TABLE') + dxfPair(2, 'LAYER') + dxfPair(70, layers.length);
  layers.forEach((layer) => {
    dxf += dxfPair(0, 'LAYER') + dxfPair(2, layer) + dxfPair(70, 0) + dxfPair(62, 7) + dxfPair(6, 'CONTINUOUS');
  });
  dxf += dxfPair(0, 'ENDTAB') + dxfPair(0, 'ENDSEC');
  dxf += dxfPair(0, 'SECTION') + dxfPair(2, 'ENTITIES');
  polylines.forEach(({ points, closed, layer }) => {
    dxf += dxfPair(0, 'LWPOLYLINE') + dxfPair(100, 'AcDbEntity') + dxfPair(8, layer);
    dxf += dxfPair(100, 'AcDbPolyline') + dxfPair(90, points.length) + dxfPair(70, closed ? 1 : 0);
    points.forEach(({ x, y }) => {
      dxf += dxfPair(10, x.toFixed(4)) + dxfPair(20, y.toFixed(4));
    });
  });
  dxf += dxfPair(0, 'ENDSEC') + dxfPair(0, 'EOF');
  return dxf;
};
