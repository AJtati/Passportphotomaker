export const MM_PER_INCH = 25.4;
export const MAX_EDITOR_IMAGE_DIMENSION = 1400;
export const IMAGE_NAME_PATTERN = /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i;

export const toPixels = (mm, dpi) => Math.round((mm / MM_PER_INCH) * dpi);

export const autoArrangeImages = (items, paperSize) => {
  if (!items.length) return items;

  const count = items.length;
  const paperAspect = paperSize.width / paperSize.height;
  let cols;
  let rows;

  if (count === 1) {
    cols = 1;
    rows = 1;
  } else if (count === 2) {
    cols = 2;
    rows = 1;
  } else {
    cols = Math.max(1, Math.ceil(Math.sqrt(count * paperAspect)));
    rows = Math.max(1, Math.ceil(count / cols));
  }

  const margin = Math.max(24, Math.min(paperSize.width, paperSize.height) * 0.06);
  const gap = Math.max(12, Math.min(paperSize.width, paperSize.height) * 0.02);
  const usableWidth = paperSize.width - margin * 2;
  const usableHeight = paperSize.height - margin * 2;
  const slotWidth = (usableWidth - gap * (cols - 1)) / cols;
  const slotHeight = (usableHeight - gap * (rows - 1)) / rows;
  const gridWidth = cols * slotWidth + (cols - 1) * gap;
  const gridHeight = rows * slotHeight + (rows - 1) * gap;
  const startX = (paperSize.width - gridWidth) / 2;
  const startY = (paperSize.height - gridHeight) / 2;

  return items.map((img, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const slotX = startX + col * (slotWidth + gap);
    const slotY = startY + row * (slotHeight + gap);
    const imageAspect = img.imageObj.naturalWidth / img.imageObj.naturalHeight;
    const rad = (img.rotation * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));

    const denominatorW = imageAspect * absCos + absSin;
    const denominatorH = imageAspect * absSin + absCos;
    const heightFromWidthLimit = slotWidth / Math.max(denominatorW, 0.0001);
    const heightFromHeightLimit = slotHeight / Math.max(denominatorH, 0.0001);
    const height = Math.max(20, Math.min(heightFromWidthLimit, heightFromHeightLimit));
    const width = imageAspect * height;

    const centerX = slotX + slotWidth / 2;
    const centerY = slotY + slotHeight / 2;

    return {
      ...img,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    };
  });
};

export const createEditorPreviewImage = (sourceImage) =>
  new Promise((resolve) => {
    const maxDim = Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight);
    if (maxDim <= MAX_EDITOR_IMAGE_DIMENSION) {
      resolve(sourceImage);
      return;
    }

    const scale = MAX_EDITOR_IMAGE_DIMENSION / maxDim;
    const targetWidth = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      resolve(sourceImage);
      return;
    }
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    tempCtx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

    const previewImage = new Image();
    previewImage.onload = () => resolve(previewImage);
    previewImage.onerror = () => resolve(sourceImage);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
    if (!dataUrl || dataUrl === 'data:,') {
      resolve(sourceImage);
      return;
    }
    previewImage.src = dataUrl;
  });

export const isLikelyImageFile = (file) =>
  (typeof file?.type === 'string' && file.type.startsWith('image/')) ||
  IMAGE_NAME_PATTERN.test(file?.name || '');

export const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const imageObj = new Image();
    imageObj.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(imageObj);
    };
    imageObj.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image.'));
    };
    imageObj.src = objectUrl;
  });

export const getEventCoords = (event) => {
  if (event.touches && event.touches.length) {
    return { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY };
  }
  return { clientX: event.clientX, clientY: event.clientY };
};

export const isPointInCircle = (px, py, cx, cy, radius) => {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
};

export const localToWorld = (img, lx, ly) => {
  const cx = img.x + img.width / 2;
  const cy = img.y + img.height / 2;
  const rad = (img.rotation * Math.PI) / 180;
  const wx = cx + lx * Math.cos(rad) - ly * Math.sin(rad);
  const wy = cy + lx * Math.sin(rad) + ly * Math.cos(rad);
  return { x: wx, y: wy };
};

export const pointInRotatedRect = (px, py, img) => {
  const cx = img.x + img.width / 2;
  const cy = img.y + img.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const rad = (-img.rotation * Math.PI) / 180;
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  return rx >= -img.width / 2 && rx <= img.width / 2 && ry >= -img.height / 2 && ry <= img.height / 2;
};

export const getDrawRotateOffset = (handleSize) => Math.max(40, (handleSize / 2) * 2.2);

export const getHitRotateOffset = (handleSize) => Math.max(40, handleSize / 2.2);
