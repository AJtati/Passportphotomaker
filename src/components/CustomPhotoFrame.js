import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Row, Col, Card, Form, Button } from 'react-bootstrap';
import FormatDownloadDropdown from './FormatDownloadDropdown';
import { saveCanvasDocument } from '../utils/canvasExport';
import { convertToPixels } from '../utils/dimensions';

const DPI = 300;
const PREVIEW_IMAGE_MAX_DIMENSION = 1600;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;
const SAFE_MARGIN_MM = 0;

const PAPER_PRESETS = {
  a4: { width: 210, height: 297, unit: 'mm', name: 'A4 Portrait' },
  a5: { width: 148, height: 210, unit: 'mm', name: 'A5 Portrait' },
  letter: { width: 8.5, height: 11, unit: 'in', name: 'Letter' },
  '4x6': { width: 4, height: 6, unit: 'in', name: '4x6 Inch' },
  '5x7': { width: 5, height: 7, unit: 'in', name: '5x7 Inch' },
};

const FRAME_PRESETS = {
  passport_india: { width: 35, height: 45, unit: 'mm', name: 'Passport 35x45 mm' },
  passport_us: { width: 2, height: 2, unit: 'in', name: 'Passport 2x2 in' },
  wallet: { width: 2.5, height: 3.5, unit: 'in', name: 'Wallet 2.5x3.5 in' },
  '4x6': { width: 4, height: 6, unit: 'in', name: '4x6 Print' },
  '5x7': { width: 5, height: 7, unit: 'in', name: '5x7 Print' },
  '8x10': { width: 8, height: 10, unit: 'in', name: '8x10 Print' },
  '8x12': { width: 8, height: 12, unit: 'in', name: '8x12 Print' },
  '10x12': { width: 10, height: 12, unit: 'in', name: '10x12 Print' },
  '11x14': { width: 11, height: 14, unit: 'in', name: '11x14 Print' },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const convertFromPixels = (pixels, unit, dpi) => {
  if (unit === 'in') return pixels / dpi;
  if (unit === 'mm') return (pixels / dpi) * 25.4;
  return pixels;
};

const createPreviewImage = (sourceImage) =>
  new Promise((resolve) => {
    const maxDimension = Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight);
    if (maxDimension <= PREVIEW_IMAGE_MAX_DIMENSION) {
      resolve(sourceImage);
      return;
    }

    const scale = PREVIEW_IMAGE_MAX_DIMENSION / maxDimension;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(sourceImage);
      return;
    }

    canvas.width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

    const previewImage = new Image();
    previewImage.onload = () => resolve(previewImage);
    previewImage.onerror = () => resolve(sourceImage);
    previewImage.src = canvas.toDataURL('image/jpeg', 0.92);
  });

const loadPhotoFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const previewImage = await createPreviewImage(img);
        resolve({
          src: event.target.result,
          image: img,
          previewImage,
          name: file.name,
          rotation: 0,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        });
      };
      img.onerror = () => reject(new Error(`Could not load ${file.name}`));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

const getFramePlacement = (paper, frame) => {
  const paperWidthPx = convertToPixels(paper.width, paper.unit, DPI);
  const paperHeightPx = convertToPixels(paper.height, paper.unit, DPI);
  const frameWidthPx = convertToPixels(frame.width, frame.unit, DPI);
  const frameHeightPx = convertToPixels(frame.height, frame.unit, DPI);
  const safeMarginPx = convertToPixels(SAFE_MARGIN_MM, 'mm', DPI);

  if (paperWidthPx <= 0 || paperHeightPx <= 0 || frameWidthPx <= 0 || frameHeightPx <= 0) {
    return {
      paperWidthPx: Math.max(1, Math.round(paperWidthPx || 1)),
      paperHeightPx: Math.max(1, Math.round(paperHeightPx || 1)),
      frameWidthPx,
      frameHeightPx,
      error: 'Enter valid positive paper and frame dimensions.',
    };
  }

  if (frameWidthPx > paperWidthPx - safeMarginPx * 2 || frameHeightPx > paperHeightPx - safeMarginPx * 2) {
    return {
      paperWidthPx,
      paperHeightPx,
      frameWidthPx,
      frameHeightPx,
      error: 'Frame size is too large for the selected paper.',
    };
  }

  return {
    paperWidthPx,
    paperHeightPx,
    frameWidthPx,
    frameHeightPx,
    frameX: (paperWidthPx - frameWidthPx) / 2,
    frameY: (paperHeightPx - frameHeightPx) / 2,
    error: null,
  };
};

const getPhotoRenderMetrics = (image, frameWidth, frameHeight, rotation, zoom = 1) => {
  const imgAspectRatio = image.naturalWidth / image.naturalHeight;
  const isSideways = rotation === 90 || rotation === 270;
  const effectiveFrameWidth = isSideways ? frameHeight : frameWidth;
  const effectiveFrameHeight = isSideways ? frameWidth : frameHeight;
  const frameAspectRatio = effectiveFrameWidth / effectiveFrameHeight;

  let baseWidth;
  let baseHeight;

  if (imgAspectRatio > frameAspectRatio) {
    baseHeight = effectiveFrameHeight;
    baseWidth = effectiveFrameHeight * imgAspectRatio;
  } else {
    baseWidth = effectiveFrameWidth;
    baseHeight = effectiveFrameWidth / imgAspectRatio;
  }

  const drawWidth = Math.max(1, baseWidth * zoom);
  const drawHeight = Math.max(1, baseHeight * zoom);

  return {
    viewportWidth: effectiveFrameWidth,
    viewportHeight: effectiveFrameHeight,
    viewportX: -effectiveFrameWidth / 2,
    viewportY: -effectiveFrameHeight / 2,
    drawWidth,
    drawHeight,
    maxOffsetX: Math.max(0, (drawWidth - effectiveFrameWidth) / 2),
    maxOffsetY: Math.max(0, (drawHeight - effectiveFrameHeight) / 2),
  };
};

const clampPhotoTransform = (photo, frame) => {
  if (!photo?.image) {
    return photo;
  }

  const frameWidthPx = convertToPixels(frame.width, frame.unit, DPI);
  const frameHeightPx = convertToPixels(frame.height, frame.unit, DPI);
  const zoom = clamp(photo.zoom ?? 1, MIN_ZOOM, MAX_ZOOM);
  const metrics = getPhotoRenderMetrics(photo.image, frameWidthPx, frameHeightPx, photo.rotation, zoom);

  return {
    ...photo,
    zoom,
    offsetX: clamp(photo.offsetX ?? 0, -metrics.maxOffsetX, metrics.maxOffsetX),
    offsetY: clamp(photo.offsetY ?? 0, -metrics.maxOffsetY, metrics.maxOffsetY),
  };
};

const getDistance = (pointA, pointB) => Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);

const getMidpoint = (pointA, pointB) => ({
  x: (pointA.x + pointB.x) / 2,
  y: (pointA.y + pointB.y) / 2,
});

const toLocalDelta = (dx, dy, rotation) => {
  const radians = (-rotation * Math.PI) / 180;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians),
  };
};

const drawAlignmentGrid = (ctx, frameX, frameY, frameWidth, frameHeight) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(13, 110, 253, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);

  for (let index = 1; index <= 2; index += 1) {
    const verticalX = frameX + (frameWidth / 3) * index;
    const horizontalY = frameY + (frameHeight / 3) * index;

    ctx.beginPath();
    ctx.moveTo(verticalX, frameY);
    ctx.lineTo(verticalX, frameY + frameHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(frameX, horizontalY);
    ctx.lineTo(frameX + frameWidth, horizontalY);
    ctx.stroke();
  }

  ctx.restore();
};

const drawCutMarks = (ctx, frameX, frameY, frameWidth, frameHeight, paperWidth, paperHeight) => {
  const markLength = Math.max(18, Math.round(Math.min(paperWidth, paperHeight) * 0.015));

  ctx.save();
  ctx.strokeStyle = '#5c6773';
  ctx.lineWidth = 2;

  [
    [frameX, frameY],
    [frameX + frameWidth, frameY],
    [frameX, frameY + frameHeight],
    [frameX + frameWidth, frameY + frameHeight],
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(Math.max(0, x - markLength), y);
    ctx.lineTo(Math.min(paperWidth, x + markLength), y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, Math.max(0, y - markLength));
    ctx.lineTo(x, Math.min(paperHeight, y + markLength));
    ctx.stroke();
  });

  ctx.restore();
};

const drawCroppedPhoto = (ctx, photo, frameWidthPx, frameHeightPx, usePreviewImage = true) => {
  if (!photo?.image?.complete) {
    return;
  }

  const sourceImage = usePreviewImage ? photo.previewImage || photo.image : photo.image;
  const metrics = getPhotoRenderMetrics(sourceImage, frameWidthPx, frameHeightPx, photo.rotation, photo.zoom ?? 1);
  const offsetX = clamp(photo.offsetX ?? 0, -metrics.maxOffsetX, metrics.maxOffsetX);
  const offsetY = clamp(photo.offsetY ?? 0, -metrics.maxOffsetY, metrics.maxOffsetY);

  ctx.save();
  ctx.translate(frameWidthPx / 2, frameHeightPx / 2);
  ctx.rotate((photo.rotation * Math.PI) / 180);
  ctx.beginPath();
  ctx.rect(metrics.viewportX, metrics.viewportY, metrics.viewportWidth, metrics.viewportHeight);
  ctx.clip();
  ctx.drawImage(
    sourceImage,
    -metrics.drawWidth / 2 + offsetX,
    -metrics.drawHeight / 2 + offsetY,
    metrics.drawWidth,
    metrics.drawHeight
  );
  ctx.restore();
};

const drawResizeHandles = (ctx, frameX, frameY, frameWidth, frameHeight, paperWidth, paperHeight) => {
  const handleRadius = Math.max(12, Math.round(Math.min(paperWidth, paperHeight) * 0.01));
  const strokeWidth = Math.max(2, Math.round(handleRadius * 0.2));

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0d6efd';
  ctx.lineWidth = strokeWidth;

  const positions = [
    { x: frameX, y: frameY }, // TL
    { x: frameX + frameWidth, y: frameY }, // TR
    { x: frameX, y: frameY + frameHeight }, // BL
    { x: frameX + frameWidth, y: frameY + frameHeight }, // BR
    { x: frameX + frameWidth / 2, y: frameY }, // T
    { x: frameX + frameWidth / 2, y: frameY + frameHeight }, // B
    { x: frameX, y: frameY + frameHeight / 2 }, // L
    { x: frameX + frameWidth, y: frameY + frameHeight / 2 }, // R
  ];

  positions.forEach((pos) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, handleRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
};

const getHandleAtPoint = (point, frameX, frameY, frameWidthPx, frameHeightPx, paperWidthPx, paperHeightPx) => {
  if (!point) return null;
  const handleRadius = Math.max(12, Math.round(Math.min(paperWidthPx, paperHeightPx) * 0.01));
  const hitRadius = Math.max(handleRadius * 5, 80);

  const handles = [
    { name: 'tl', x: frameX, y: frameY, cursor: 'nwse-resize' },
    { name: 'tr', x: frameX + frameWidthPx, y: frameY, cursor: 'nesw-resize' },
    { name: 'bl', x: frameX, y: frameY + frameHeightPx, cursor: 'nesw-resize' },
    { name: 'br', x: frameX + frameWidthPx, y: frameY + frameHeightPx, cursor: 'nwse-resize' },
    { name: 't', x: frameX + frameWidthPx / 2, y: frameY, cursor: 'ns-resize' },
    { name: 'b', x: frameX + frameWidthPx / 2, y: frameY + frameHeightPx, cursor: 'ns-resize' },
    { name: 'l', x: frameX, y: frameY + frameHeightPx / 2, cursor: 'ew-resize' },
    { name: 'r', x: frameX + frameWidthPx, y: frameY + frameHeightPx / 2, cursor: 'ew-resize' },
  ];

  for (const h of handles) {
    const dist = Math.hypot(point.x - h.x, point.y - h.y);
    if (dist <= hitRadius) {
      return h;
    }
  }

  return null;
};

const CustomPhotoFrame = () => {
  const [paperPreset, setPaperPreset] = useState('a4');
  const [paper, setPaper] = useState(PAPER_PRESETS.a4);
  const [paperDraft, setPaperDraft] = useState({
    width: String(PAPER_PRESETS.a4.width),
    height: String(PAPER_PRESETS.a4.height),
  });
  const [framePreset, setFramePreset] = useState('4x6');
  const [frame, setFrame] = useState(FRAME_PRESETS['4x6']);
  const [frameDraft, setFrameDraft] = useState({
    width: String(FRAME_PRESETS['4x6'].width),
    height: String(FRAME_PRESETS['4x6'].height),
  });
  const [photo, setPhoto] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Upload a photo and drag it into place on the preview.');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoRef = useRef(null);
  const interactionRef = useRef(null);
  const framePlacementRef = useRef(null);

  useEffect(() => {
    setPaperDraft({
      width: String(paper.width),
      height: String(paper.height),
    });
  }, [paper.width, paper.height]);

  useEffect(() => {
    setFrameDraft({
      width: String(frame.width),
      height: String(frame.height),
    });
  }, [frame.width, frame.height]);

  const drawCanvas = useCallback((
    currentPhoto = photoRef.current,
    targetCanvas = canvasRef.current,
    usePreviewImage = true,
    options = {}
  ) => {
    const canvas = targetCanvas;
    if (!canvas) {
      return;
    }

    const { showGridOverlay = showGrid, showCutMarks = true, showFrameOutline = true } = options;

    const placement = getFramePlacement(paper, frame);
    framePlacementRef.current = placement;

    canvas.width = Math.max(1, Math.round(placement.paperWidthPx || 1));
    canvas.height = Math.max(1, Math.round(placement.paperHeightPx || 1));

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = usePreviewImage ? 'high' : 'high';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (placement.error) {
      ctx.fillStyle = '#dc3545';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.min(30, canvas.width / 14)}px Arial`;
      ctx.fillText(placement.error, canvas.width / 2, canvas.height / 2);
      return;
    }

    const { frameX, frameY, frameWidthPx, frameHeightPx } = placement;

    if (showFrameOutline) {
      ctx.strokeStyle = '#adb5bd';
      ctx.lineWidth = 2;
      ctx.strokeRect(frameX, frameY, frameWidthPx, frameHeightPx);
      drawResizeHandles(ctx, frameX, frameY, frameWidthPx, frameHeightPx, canvas.width, canvas.height);
    }

    if (currentPhoto?.image?.complete) {
      ctx.save();
      ctx.translate(frameX, frameY);
      drawCroppedPhoto(ctx, currentPhoto, frameWidthPx, frameHeightPx, usePreviewImage);
      ctx.restore();
    } else {
      ctx.fillStyle = '#6c757d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.min(28, frameWidthPx / 8)}px Arial`;
      ctx.fillText('Upload a photo', frameX + frameWidthPx / 2, frameY + frameHeightPx / 2);
    }

    if (showGridOverlay) {
      drawAlignmentGrid(ctx, frameX, frameY, frameWidthPx, frameHeightPx);
    }

    if (showCutMarks) {
      drawCutMarks(ctx, frameX, frameY, frameWidthPx, frameHeightPx, canvas.width, canvas.height);
    }
  }, [frame, paper, showGrid]);

  useEffect(() => {
    photoRef.current = photo;
    drawCanvas(photo);
  }, [photo, drawCanvas]);

  useEffect(() => {
    if (photoRef.current) {
      const nextPhoto = clampPhotoTransform(photoRef.current, frame);
      photoRef.current = nextPhoto;
      setPhoto(nextPhoto);
      return;
    }

    drawCanvas(null);
  }, [frame, drawCanvas]);

  useEffect(() => {
    drawCanvas(photoRef.current);
  }, [paper, showGrid, drawCanvas]);

  const updatePhotoLive = useCallback((updater) => {
    if (!photoRef.current) {
      return;
    }

    photoRef.current = clampPhotoTransform(updater(photoRef.current), frame);
    drawCanvas(photoRef.current);
  }, [drawCanvas, frame]);

  const commitPhotoChanges = useCallback(() => {
    setPhoto(photoRef.current ? { ...photoRef.current } : null);
  }, []);

  const getCanvasPointFromClient = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const hitFrame = useCallback((point) => {
    const placement = framePlacementRef.current;
    if (!point || !placement || placement.error) {
      return false;
    }

    return (
      point.x >= placement.frameX &&
      point.x <= placement.frameX + placement.frameWidthPx &&
      point.y >= placement.frameY &&
      point.y <= placement.frameY + placement.frameHeightPx
    );
  }, []);

  const getLocalPointInFrame = useCallback((point, rotation) => {
    const placement = framePlacementRef.current;
    if (!placement) {
      return { x: 0, y: 0 };
    }

    const centerX = placement.frameX + placement.frameWidthPx / 2;
    const centerY = placement.frameY + placement.frameHeightPx / 2;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const radians = (-rotation * Math.PI) / 180;

    return {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians),
    };
  }, []);

  const handleFileUpload = async (fileList) => {
    const file = Array.from(fileList || []).find((entry) => entry.type.startsWith('image/'));
    if (!file) {
      return;
    }

    try {
      const loadedPhoto = await loadPhotoFile(file);
      const normalizedPhoto = clampPhotoTransform(loadedPhoto, frame);
      photoRef.current = normalizedPhoto;
      setPhoto(normalizedPhoto);
      setStatusMessage('Drag the photo to reframe it. Use mouse wheel or pinch to zoom.');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSizePresetChange = (setter, valueSetter, presets, presetKey) => {
    setter(presetKey);
    if (presets[presetKey]) {
      valueSetter(presets[presetKey]);
    }
  };

  const handleDimensionChange = (type, e) => {
    const { name, value } = e.target;

    if (type === 'paper') {
      if (name === 'unit') {
        setPaperPreset('custom');
        setPaper((current) => ({ ...current, unit: value }));
        return;
      }

      setPaperDraft((current) => ({ ...current, [name]: value }));
      if (value.trim() === '') {
        setPaperPreset('custom');
        return;
      }

      const numericValue = parseFloat(value);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        setPaperPreset('custom');
        setPaper((current) => ({ ...current, [name]: numericValue }));
      }
      return;
    }

    if (name === 'unit') {
      setFramePreset('custom');
      setFrame((current) => ({ ...current, unit: value }));
      return;
    }

    setFrameDraft((current) => ({ ...current, [name]: value }));
    if (value.trim() === '') {
      setFramePreset('custom');
      return;
    }

    const numericValue = parseFloat(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      setFramePreset('custom');
      setFrame((current) => ({ ...current, [name]: numericValue }));
    }
  };

  const handleDimensionBlur = (type, e) => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value);

    if (type === 'paper') {
      if (Number.isFinite(numericValue) && numericValue > 0) {
        const normalizedValue = String(numericValue);
        setPaperDraft((current) => ({ ...current, [name]: normalizedValue }));
        setPaper((current) => ({ ...current, [name]: numericValue }));
        return;
      }

      setPaperDraft((current) => ({ ...current, [name]: String(paper[name]) }));
      return;
    }

    if (Number.isFinite(numericValue) && numericValue > 0) {
      const normalizedValue = String(numericValue);
      setFrameDraft((current) => ({ ...current, [name]: normalizedValue }));
      setFrame((current) => ({ ...current, [name]: numericValue }));
      return;
    }

    setFrameDraft((current) => ({ ...current, [name]: String(frame[name]) }));
  };

  const handleMouseDown = (event) => {
    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    const placement = framePlacementRef.current;
    if (!point || !placement || placement.error) {
      return;
    }

    const { frameX, frameY, frameWidthPx, frameHeightPx, paperWidthPx, paperHeightPx } = placement;
    const handle = getHandleAtPoint(point, frameX, frameY, frameWidthPx, frameHeightPx, paperWidthPx, paperHeightPx);
    if (handle) {
      interactionRef.current = {
        mode: 'resize',
        handle: handle.name,
        startFrameWidth: frame.width,
        startFrameHeight: frame.height,
        startPoint: point,
      };
      return;
    }

    if (photoRef.current && hitFrame(point)) {
      interactionRef.current = {
        mode: 'pan',
        lastPoint: point,
      };
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (event) => {
    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    if (!point) return;

    const canvas = canvasRef.current;
    const placement = framePlacementRef.current;

    if (interactionRef.current) {
      event.preventDefault();
      if (interactionRef.current.mode === 'pan' && photoRef.current) {
        const dx = point.x - interactionRef.current.lastPoint.x;
        const dy = point.y - interactionRef.current.lastPoint.y;
        interactionRef.current.lastPoint = point;
        const localDelta = toLocalDelta(dx, dy, photoRef.current.rotation);

        updatePhotoLive((currentPhoto) => ({
          ...currentPhoto,
          offsetX: (currentPhoto.offsetX ?? 0) + localDelta.x,
          offsetY: (currentPhoto.offsetY ?? 0) + localDelta.y,
        }));
      } else if (interactionRef.current.mode === 'resize' && placement && !placement.error) {
        const startW = interactionRef.current.startFrameWidth;
        const startH = interactionRef.current.startFrameHeight;
        const dxPx = point.x - interactionRef.current.startPoint.x;
        const dyPx = point.y - interactionRef.current.startPoint.y;

        const dx = convertFromPixels(dxPx, frame.unit, DPI);
        const dy = convertFromPixels(dyPx, frame.unit, DPI);

        const paperWidthPx = convertToPixels(paper.width, paper.unit, DPI);
        const paperHeightPx = convertToPixels(paper.height, paper.unit, DPI);
        const safeMarginPx = convertToPixels(SAFE_MARGIN_MM, 'mm', DPI);
        const maxAvailableWidthPx = Math.max(1, paperWidthPx - safeMarginPx * 2);
        const maxAvailableHeightPx = Math.max(1, paperHeightPx - safeMarginPx * 2);

        const maxW = convertFromPixels(maxAvailableWidthPx, frame.unit, DPI);
        const maxH = convertFromPixels(maxAvailableHeightPx, frame.unit, DPI);
        const minSize = frame.unit === 'in' ? 0.5 : 10;

        const handleName = interactionRef.current.handle;
        let newW = startW;
        let newH = startH;

        if (['tl', 'tr', 'bl', 'br'].includes(handleName)) {
          let scaleFactor = 1;
          if (handleName === 'br') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW + dx) / startW;
            } else {
              scaleFactor = (startH + dy) / startH;
            }
          } else if (handleName === 'tl') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW - dx) / startW;
            } else {
              scaleFactor = (startH - dy) / startH;
            }
          } else if (handleName === 'tr') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW + dx) / startW;
            } else {
              scaleFactor = (startH - dy) / startH;
            }
          } else if (handleName === 'bl') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW - dx) / startW;
            } else {
              scaleFactor = (startH + dy) / startH;
            }
          }

          newW = startW * scaleFactor;
          newH = startH * scaleFactor;

          if (newW < minSize || newH < minSize) {
            const minScale = Math.max(minSize / startW, minSize / startH);
            newW = startW * minScale;
            newH = startH * minScale;
          }
          if (newW > maxW || newH > maxH) {
            const maxScale = Math.min(maxW / startW, maxH / startH);
            newW = startW * maxScale;
            newH = startH * maxScale;
          }
        } else {
          if (handleName === 'l') {
            newW = clamp(startW - dx, minSize, maxW);
          } else if (handleName === 'r') {
            newW = clamp(startW + dx, minSize, maxW);
          } else if (handleName === 't') {
            newH = clamp(startH - dy, minSize, maxH);
          } else if (handleName === 'b') {
            newH = clamp(startH + dy, minSize, maxH);
          }
        }

        newW = parseFloat(newW.toFixed(3));
        newH = parseFloat(newH.toFixed(3));

        setFramePreset('custom');
        setFrame((current) => ({
          ...current,
          width: newW,
          height: newH,
        }));
      }
      return;
    }

    if (canvas && placement && !placement.error) {
      const { frameX, frameY, frameWidthPx, frameHeightPx, paperWidthPx, paperHeightPx } = placement;
      const hoverHandle = getHandleAtPoint(point, frameX, frameY, frameWidthPx, frameHeightPx, paperWidthPx, paperHeightPx);
      if (hoverHandle) {
        canvas.style.cursor = hoverHandle.cursor;
      } else if (hitFrame(point)) {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const finishInteraction = () => {
    if (!interactionRef.current) {
      return;
    }

    interactionRef.current = null;
    commitPhotoChanges();
  };

  const handleWheel = (event) => {
    if (!photoRef.current) {
      return;
    }

    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    if (!hitFrame(point)) {
      return;
    }

    event.preventDefault();

    const placement = framePlacementRef.current;
    const currentPhoto = photoRef.current;
    const localPoint = getLocalPointInFrame(point, currentPhoto.rotation);
    const currentMetrics = getPhotoRenderMetrics(
      currentPhoto.image,
      placement.frameWidthPx,
      placement.frameHeightPx,
      currentPhoto.rotation,
      currentPhoto.zoom ?? 1
    );
    const nextZoom = clamp(
      (currentPhoto.zoom ?? 1) + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP),
      MIN_ZOOM,
      MAX_ZOOM
    );

    if (nextZoom === (currentPhoto.zoom ?? 1)) {
      return;
    }

    const nextMetrics = getPhotoRenderMetrics(
      currentPhoto.image,
      placement.frameWidthPx,
      placement.frameHeightPx,
      currentPhoto.rotation,
      nextZoom
    );
    const currentOffsetX = currentPhoto.offsetX ?? 0;
    const currentOffsetY = currentPhoto.offsetY ?? 0;
    const relativeX = (localPoint.x + currentMetrics.drawWidth / 2 - currentOffsetX) / currentMetrics.drawWidth;
    const relativeY = (localPoint.y + currentMetrics.drawHeight / 2 - currentOffsetY) / currentMetrics.drawHeight;
    const nextOffsetX = localPoint.x + nextMetrics.drawWidth / 2 - (relativeX * nextMetrics.drawWidth);
    const nextOffsetY = localPoint.y + nextMetrics.drawHeight / 2 - (relativeY * nextMetrics.drawHeight);

    photoRef.current = clampPhotoTransform({
      ...currentPhoto,
      zoom: nextZoom,
      offsetX: nextOffsetX,
      offsetY: nextOffsetY,
    }, frame);
    drawCanvas(photoRef.current);
    commitPhotoChanges();
  };

  const handleTouchStart = (event) => {
    const placement = framePlacementRef.current;
    if (!placement || placement.error) {
      return;
    }

    event.preventDefault();

    if (event.touches.length === 1) {
      const point = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      if (!point) return;

      const { frameX, frameY, frameWidthPx, frameHeightPx, paperWidthPx, paperHeightPx } = placement;
      const handle = getHandleAtPoint(point, frameX, frameY, frameWidthPx, frameHeightPx, paperWidthPx, paperHeightPx);
      if (handle) {
        interactionRef.current = {
          mode: 'resize',
          handle: handle.name,
          startFrameWidth: frame.width,
          startFrameHeight: frame.height,
          startPoint: point,
        };
        return;
      }

      if (photoRef.current && hitFrame(point)) {
        interactionRef.current = {
          mode: 'pan',
          lastPoint: point,
        };
      } else {
        interactionRef.current = null;
      }
      return;
    }

    if (event.touches.length >= 2 && photoRef.current) {
      const pointA = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      const pointB = getCanvasPointFromClient(event.touches[1].clientX, event.touches[1].clientY);
      if (!pointA || !pointB) {
        interactionRef.current = null;
        return;
      }
      const midpoint = getMidpoint(pointA, pointB);
      if (!hitFrame(midpoint)) {
        interactionRef.current = null;
        return;
      }

      interactionRef.current = {
        mode: 'pinch',
        startDistance: Math.max(1, getDistance(pointA, pointB)),
        startZoom: photoRef.current.zoom ?? 1,
        startOffsetX: photoRef.current.offsetX ?? 0,
        startOffsetY: photoRef.current.offsetY ?? 0,
        startMidpoint: midpoint,
      };
    }
  };

  const handleTouchMove = (event) => {
    if (!interactionRef.current) {
      return;
    }

    event.preventDefault();
    const placement = framePlacementRef.current;

    if (event.touches.length === 1) {
      const point = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      if (!point) {
        return;
      }

      if (interactionRef.current.mode === 'pan' && photoRef.current) {
        const dx = point.x - interactionRef.current.lastPoint.x;
        const dy = point.y - interactionRef.current.lastPoint.y;
        interactionRef.current.lastPoint = point;
        const localDelta = toLocalDelta(dx, dy, photoRef.current.rotation);

        updatePhotoLive((currentPhoto) => ({
          ...currentPhoto,
          offsetX: (currentPhoto.offsetX ?? 0) + localDelta.x,
          offsetY: (currentPhoto.offsetY ?? 0) + localDelta.y,
        }));
      } else if (interactionRef.current.mode === 'resize' && placement && !placement.error) {
        const startW = interactionRef.current.startFrameWidth;
        const startH = interactionRef.current.startFrameHeight;
        const dxPx = point.x - interactionRef.current.startPoint.x;
        const dyPx = point.y - interactionRef.current.startPoint.y;

        const dx = convertFromPixels(dxPx, frame.unit, DPI);
        const dy = convertFromPixels(dyPx, frame.unit, DPI);

        const paperWidthPx = convertToPixels(paper.width, paper.unit, DPI);
        const paperHeightPx = convertToPixels(paper.height, paper.unit, DPI);
        const safeMarginPx = convertToPixels(SAFE_MARGIN_MM, 'mm', DPI);
        const maxAvailableWidthPx = Math.max(1, paperWidthPx - safeMarginPx * 2);
        const maxAvailableHeightPx = Math.max(1, paperHeightPx - safeMarginPx * 2);

        const maxW = convertFromPixels(maxAvailableWidthPx, frame.unit, DPI);
        const maxH = convertFromPixels(maxAvailableHeightPx, frame.unit, DPI);
        const minSize = frame.unit === 'in' ? 0.5 : 10;

        const handleName = interactionRef.current.handle;
        let newW = startW;
        let newH = startH;

        if (['tl', 'tr', 'bl', 'br'].includes(handleName)) {
          let scaleFactor = 1;
          if (handleName === 'br') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW + dx) / startW;
            } else {
              scaleFactor = (startH + dy) / startH;
            }
          } else if (handleName === 'tl') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW - dx) / startW;
            } else {
              scaleFactor = (startH - dy) / startH;
            }
          } else if (handleName === 'tr') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW + dx) / startW;
            } else {
              scaleFactor = (startH - dy) / startH;
            }
          } else if (handleName === 'bl') {
            if (Math.abs(dx / startW) > Math.abs(dy / startH)) {
              scaleFactor = (startW - dx) / startW;
            } else {
              scaleFactor = (startH + dy) / startH;
            }
          }

          newW = startW * scaleFactor;
          newH = startH * scaleFactor;

          if (newW < minSize || newH < minSize) {
            const minScale = Math.max(minSize / startW, minSize / startH);
            newW = startW * minScale;
            newH = startH * minScale;
          }
          if (newW > maxW || newH > maxH) {
            const maxScale = Math.min(maxW / startW, maxH / startH);
            newW = startW * maxScale;
            newH = startH * maxScale;
          }
        } else {
          if (handleName === 'l') {
            newW = clamp(startW - dx, minSize, maxW);
          } else if (handleName === 'r') {
            newW = clamp(startW + dx, minSize, maxW);
          } else if (handleName === 't') {
            newH = clamp(startH - dy, minSize, maxH);
          } else if (handleName === 'b') {
            newH = clamp(startH + dy, minSize, maxH);
          }
        }

        newW = parseFloat(newW.toFixed(3));
        newH = parseFloat(newH.toFixed(3));

        setFramePreset('custom');
        setFrame((current) => ({
          ...current,
          width: newW,
          height: newH,
        }));
      }
      return;
    }

    if (event.touches.length >= 2 && interactionRef.current.mode === 'pinch' && photoRef.current) {
      const pointA = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      const pointB = getCanvasPointFromClient(event.touches[1].clientX, event.touches[1].clientY);
      if (!pointA || !pointB) {
        return;
      }

      const currentDistance = Math.max(1, getDistance(pointA, pointB));
      const currentMidpoint = getMidpoint(pointA, pointB);
      const scaleFactor = currentDistance / interactionRef.current.startDistance;
      const midpointDelta = toLocalDelta(
        currentMidpoint.x - interactionRef.current.startMidpoint.x,
        currentMidpoint.y - interactionRef.current.startMidpoint.y,
        photoRef.current.rotation
      );

      updatePhotoLive((currentPhoto) => ({
        ...currentPhoto,
        zoom: interactionRef.current.startZoom * scaleFactor,
        offsetX: interactionRef.current.startOffsetX + midpointDelta.x,
        offsetY: interactionRef.current.startOffsetY + midpointDelta.y,
      }));
    }
  };

  const handleTouchEnd = (event) => {
    if (!interactionRef.current) {
      return;
    }

    if (event.touches.length === 1 && interactionRef.current.mode === 'pinch') {
      const point = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      if (!point) {
        finishInteraction();
        return;
      }
      interactionRef.current = {
        mode: 'pan',
        lastPoint: point,
      };
      commitPhotoChanges();
      return;
    }

    if (event.touches.length === 0) {
      finishInteraction();
    }
  };

  const handleRotate = () => {
    if (!photoRef.current) {
      return;
    }

    photoRef.current = clampPhotoTransform({
      ...photoRef.current,
      rotation: (photoRef.current.rotation + 90) % 360,
    }, frame);
    setPhoto({ ...photoRef.current });
  };

  const handleZoomButton = (delta) => {
    if (!photoRef.current) {
      return;
    }

    photoRef.current = clampPhotoTransform({
      ...photoRef.current,
      zoom: (photoRef.current.zoom ?? 1) + delta,
    }, frame);
    setPhoto({ ...photoRef.current });
  };

  const handleReset = () => {
    if (!photoRef.current) {
      return;
    }

    photoRef.current = clampPhotoTransform({
      ...photoRef.current,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    }, frame);
    setPhoto({ ...photoRef.current });
  };

  const handleDownload = async (format) => {
    const placement = getFramePlacement(paper, frame);
    if (placement.error) {
      alert(placement.error);
      return;
    }

    const exportCanvas = document.createElement('canvas');
    drawCanvas(photoRef.current, exportCanvas, false, {
      showGridOverlay: false,
      showCutMarks: false,
      showFrameOutline: false,
    });

    try {
      await saveCanvasDocument(exportCanvas, format, {
        filename: `print-ready-photo.${format.toLowerCase()}`,
        quality: 1.0,
        pdfOptions: {
          filename: 'print-ready-photo.pdf',
          unit: paper.unit,
          width: paper.width,
          height: paper.height,
          orientation: paper.width > paper.height ? 'l' : 'p',
        },
      });
    } catch (error) {
      alert(`Download failed: ${error.message}`);
    }
  };

  const getCurrentScale = useCallback(() => {
    const paperWidthPx = convertToPixels(paper.width, paper.unit, DPI);
    const paperHeightPx = convertToPixels(paper.height, paper.unit, DPI);
    const frameWidthPx = convertToPixels(frame.width, frame.unit, DPI);
    const frameHeightPx = convertToPixels(frame.height, frame.unit, DPI);
    const safeMarginPx = convertToPixels(SAFE_MARGIN_MM, 'mm', DPI);

    const maxAvailableWidthPx = Math.max(1, paperWidthPx - safeMarginPx * 2);
    const maxAvailableHeightPx = Math.max(1, paperHeightPx - safeMarginPx * 2);

    const r = frameWidthPx / frameHeightPx;
    let maxWidthPx, maxHeightPx;
    if (maxAvailableWidthPx / maxAvailableHeightPx > r) {
      maxWidthPx = maxAvailableHeightPx * r;
      maxHeightPx = maxAvailableHeightPx;
    } else {
      maxWidthPx = maxAvailableWidthPx;
      maxHeightPx = maxAvailableWidthPx / r;
    }

    const scale = clamp((frameWidthPx / maxWidthPx) * 100, 10, 100);
    return scale;
  }, [paper, frame]);

  const handleSliderChange = (newScalePercent) => {
    const paperWidthPx = convertToPixels(paper.width, paper.unit, DPI);
    const paperHeightPx = convertToPixels(paper.height, paper.unit, DPI);
    const frameWidthPx = convertToPixels(frame.width, frame.unit, DPI);
    const frameHeightPx = convertToPixels(frame.height, frame.unit, DPI);
    const safeMarginPx = convertToPixels(SAFE_MARGIN_MM, 'mm', DPI);

    const maxAvailableWidthPx = Math.max(1, paperWidthPx - safeMarginPx * 2);
    const maxAvailableHeightPx = Math.max(1, paperHeightPx - safeMarginPx * 2);

    const r = frameWidthPx / frameHeightPx;
    let maxWidthPx, maxHeightPx;
    if (maxAvailableWidthPx / maxAvailableHeightPx > r) {
      maxWidthPx = maxAvailableHeightPx * r;
      maxHeightPx = maxAvailableHeightPx;
    } else {
      maxWidthPx = maxAvailableWidthPx;
      maxHeightPx = maxAvailableWidthPx / r;
    }

    const targetWidthPx = maxWidthPx * (newScalePercent / 100);
    const targetHeightPx = maxHeightPx * (newScalePercent / 100);

    const newWidth = parseFloat(convertFromPixels(targetWidthPx, frame.unit, DPI).toFixed(3));
    const newHeight = parseFloat(convertFromPixels(targetHeightPx, frame.unit, DPI).toFixed(3));

    setFramePreset('custom');
    setFrame({
      ...frame,
      width: newWidth,
      height: newHeight,
    });
  };

  const placement = getFramePlacement(paper, frame);

  return (
    <Row>
      <Col md={5}>
        <Card>
          <Card.Body>
            <Card.Title>Custom Photo Frame</Card.Title>
            <p className="mb-3">Pick your paper, choose a common frame size or enter a custom one, then drag and zoom your photo into the crop area before exporting.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(event) => {
                handleFileUpload(event.target.files);
                event.target.value = '';
              }}
            />

            <div className="d-grid gap-2 mb-3">
              <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                {photo ? 'Choose Another Photo' : 'Upload Photo'}
              </Button>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Paper Size</Form.Label>
              <Form.Select value={paperPreset} onChange={(event) => handleSizePresetChange(setPaperPreset, setPaper, PAPER_PRESETS, event.target.value)}>
                {Object.entries(PAPER_PRESETS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {`${value.name} - ${value.width}x${value.height} ${value.unit}`}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </Form.Select>
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col xs={5}>
                <Form.Control
                  type="text"
                  name="width"
                  inputMode="decimal"
                  value={paperDraft.width}
                  onChange={(event) => handleDimensionChange('paper', event)}
                  onBlur={(event) => handleDimensionBlur('paper', event)}
                />
              </Col>
              <Col xs={5}>
                <Form.Control
                  type="text"
                  name="height"
                  inputMode="decimal"
                  value={paperDraft.height}
                  onChange={(event) => handleDimensionChange('paper', event)}
                  onBlur={(event) => handleDimensionBlur('paper', event)}
                />
              </Col>
              <Col xs={2}>
                <Form.Select name="unit" value={paper.unit} onChange={(event) => handleDimensionChange('paper', event)}>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </Form.Select>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Frame Size</Form.Label>
              <Form.Select value={framePreset} onChange={(event) => handleSizePresetChange(setFramePreset, setFrame, FRAME_PRESETS, event.target.value)}>
                {Object.entries(FRAME_PRESETS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {`${value.name} - ${value.width}x${value.height} ${value.unit}`}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </Form.Select>
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col xs={5}>
                <Form.Control
                  type="text"
                  name="width"
                  inputMode="decimal"
                  value={frameDraft.width}
                  onChange={(event) => handleDimensionChange('frame', event)}
                  onBlur={(event) => handleDimensionBlur('frame', event)}
                />
              </Col>
              <Col xs={5}>
                <Form.Control
                  type="text"
                  name="height"
                  inputMode="decimal"
                  value={frameDraft.height}
                  onChange={(event) => handleDimensionChange('frame', event)}
                  onBlur={(event) => handleDimensionBlur('frame', event)}
                />
              </Col>
              <Col xs={2}>
                <Form.Select name="unit" value={frame.unit} onChange={(event) => handleDimensionChange('frame', event)}>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </Form.Select>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="mb-0">Frame Scale (relative to paper)</Form.Label>
                <span className="fw-semibold text-primary">{Math.round(getCurrentScale())}%</span>
              </div>
              <Form.Range
                min={10}
                max={100}
                step={1}
                value={Math.round(getCurrentScale())}
                onChange={(event) => handleSliderChange(Number(event.target.value))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="frame-grid-toggle"
                label="Show alignment grid"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.target.checked)}
              />
            </Form.Group>

            <div className="custom-frame-toolbar mb-3">
              <Button variant="outline-secondary" size="sm" onClick={() => handleZoomButton(-ZOOM_STEP)} disabled={!photo}>
                Zoom -
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={() => handleZoomButton(ZOOM_STEP)} disabled={!photo}>
                Zoom +
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={handleRotate} disabled={!photo}>
                Rotate
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={handleReset} disabled={!photo}>
                Reset
              </Button>
            </div>

            <div className="small text-muted">
              {statusMessage}
            </div>
            <div className="small text-muted mt-2">
              {placement.error
                ? placement.error
                : `Frame is centered on ${paper.width}x${paper.height} ${paper.unit} paper with high-resolution export at ${DPI} DPI.`}
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col md={7} className="pb-5">
        <Card>
          <Card.Body>
            <Card.Title>Live Frame Preview</Card.Title>
            <p className="small text-muted mb-3">Drag on desktop or mobile to reposition. Use the mouse wheel or pinch gesture to zoom while preserving export quality.</p>
            <div className="text-center themed-canvas-wrap custom-frame-canvas-wrap">
              <div
                className="custom-frame-stage"
                style={{ aspectRatio: `${Math.max(1, Math.round(placement.paperWidthPx || 1))} / ${Math.max(1, Math.round(placement.paperHeightPx || 1))}` }}
              >
                <canvas
                  ref={canvasRef}
                  className="custom-frame-canvas"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={finishInteraction}
                  onMouseLeave={finishInteraction}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={finishInteraction}
                  style={{ backgroundColor: 'white' }}
                />
              </div>
            </div>
          </Card.Body>
        </Card>

        <div className="d-grid gap-2 mt-3">
          <FormatDownloadDropdown
            id="dropdown-download-custom-frame-button"
            title="Download Print-Ready Page"
            size="lg"
            variant="primary"
            disabled={!photo || Boolean(placement.error)}
            formats={['PDF', 'JPG', 'PNG']}
            onSelect={handleDownload}
          />
        </div>
      </Col>
    </Row>
  );
};

export default CustomPhotoFrame;
