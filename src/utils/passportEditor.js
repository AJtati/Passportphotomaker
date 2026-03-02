export const MAX_ROTATION_DEGREES = 15;
export const ROTATION_STEP = 0.1;
export const PREVIEW_MAX_DIMENSION = 1600;

export const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });

export const getRotatedBounds = (width, height, radians) => {
  const absCos = Math.abs(Math.cos(radians));
  const absSin = Math.abs(Math.sin(radians));

  return {
    width: Math.max(1, Math.round(width * absCos + height * absSin)),
    height: Math.max(1, Math.round(width * absSin + height * absCos)),
  };
};

export const renderAdjustedCanvas = (image, rotation, maxDimension = null) => {
  const scaleToFitPreview = maxDimension
    ? Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    : 1;
  const canvasWidth = Math.max(1, Math.round(image.naturalWidth * scaleToFitPreview));
  const canvasHeight = Math.max(1, Math.round(image.naturalHeight * scaleToFitPreview));
  const radians = rotation * (Math.PI / 180);
  const bounds = getRotatedBounds(canvasWidth, canvasHeight, radians);
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const fitScale = Math.min(canvasWidth / bounds.width, canvasHeight / bounds.height);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(
    image,
    -canvasWidth * fitScale / 2,
    -canvasHeight * fitScale / 2,
    canvasWidth * fitScale,
    canvasHeight * fitScale
  );

  return canvas;
};

export const getActualCropDimensions = (displayWidth, displayHeight, sourceWidth, sourceHeight, crop) => {
  const scaleX = sourceWidth / displayWidth;
  const scaleY = sourceHeight / displayHeight;

  const actualCropX = Math.round(crop.x * scaleX);
  const actualCropY = Math.round(crop.y * scaleY);
  const actualCropWidth = Math.max(1, Math.round(crop.width * scaleX));
  const actualCropHeight = Math.max(1, Math.round(crop.height * scaleY));

  return {
    actualCropX,
    actualCropY,
    actualCropWidth,
    actualCropHeight,
  };
};

export const renderCroppedCanvas = (source, crop, outputWidth, outputHeight, addBorder, dpi) => {
  const canvas = document.createElement('canvas');
  const {
    actualCropX,
    actualCropY,
    actualCropWidth,
    actualCropHeight,
  } = crop;

  canvas.width = Math.max(1, Math.round(outputWidth || actualCropWidth));
  canvas.height = Math.max(1, Math.round(outputHeight || actualCropHeight));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    source,
    actualCropX,
    actualCropY,
    actualCropWidth,
    actualCropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (addBorder) {
    const borderWidth = Math.max(2, Math.round(dpi / 150));
    const offset = borderWidth / 2;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(offset, offset, canvas.width - borderWidth, canvas.height - borderWidth);
  }

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
    width: actualCropWidth,
    height: actualCropHeight,
  };
};
