import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Row, Col, Card, Form, Button, Badge } from 'react-bootstrap';
import FormatDownloadDropdown from './FormatDownloadDropdown';
import { saveCanvasDocument } from '../utils/canvasExport';
import { convertToPixels } from '../utils/dimensions';

const DPI = 300;
const PREVIEW_IMAGE_MAX_DIMENSION = 1400;
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const PHOTO_WIDTH_IN = 6;
const PHOTO_HEIGHT_IN = 4;
const MAX_PHOTOS = 4;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;
const PREVIEW_ROTATION_STEP = 90;

const BORDER_STYLES = [
  { value: 'none', label: 'No Border' },
  { value: 'single', label: 'Single Line' },
  { value: 'thick', label: 'Thick Line' },
  { value: 'double', label: 'Double Line' },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
    previewImage.src = canvas.toDataURL('image/jpeg', 0.9);
  });

const getSheetMetrics = () => {
  const paperWidthPx = convertToPixels(A4_WIDTH_MM, 'mm', DPI);
  const paperHeightPx = convertToPixels(A4_HEIGHT_MM, 'mm', DPI);
  const photoWidthPx = convertToPixels(PHOTO_WIDTH_IN, 'in', DPI);
  const photoHeightPx = convertToPixels(PHOTO_HEIGHT_IN, 'in', DPI);

  return {
    paperWidthPx,
    paperHeightPx,
    photoWidthPx,
    photoHeightPx,
  };
};

const getPhotoPositions = (photoCount) => {
  const { paperWidthPx, paperHeightPx, photoWidthPx, photoHeightPx } = getSheetMetrics();

  if (photoCount === 2) {
    const marginX = (paperWidthPx - 2 * photoWidthPx) / 3;
    const marginY = (paperHeightPx - photoHeightPx) / 2;
    return [
      { x: marginX, y: marginY, w: photoWidthPx, h: photoHeightPx },
      { x: marginX * 2 + photoWidthPx, y: marginY, w: photoWidthPx, h: photoHeightPx },
    ];
  }

  const marginX = (paperWidthPx - 2 * photoWidthPx) / 3;
  const marginY = (paperHeightPx - 2 * photoHeightPx) / 3;
  return [
    { x: marginX, y: marginY, w: photoWidthPx, h: photoHeightPx },
    { x: marginX * 2 + photoWidthPx, y: marginY, w: photoWidthPx, h: photoHeightPx },
    { x: marginX, y: marginY * 2 + photoHeightPx, w: photoWidthPx, h: photoHeightPx },
    { x: marginX * 2 + photoWidthPx, y: marginY * 2 + photoHeightPx, w: photoWidthPx, h: photoHeightPx },
  ];
};

function drawPhotoFrame(ctx, frameX, frameY, frameWidth, frameHeight, style) {
  const drawRect = (inset, lineWidth, color = '#2f3e4d') => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(
      frameX + inset + lineWidth / 2,
      frameY + inset + lineWidth / 2,
      frameWidth - ((inset + lineWidth / 2) * 2),
      frameHeight - ((inset + lineWidth / 2) * 2)
    );
  };

  if (style === 'single') {
    drawRect(0, 3);
    return;
  }

  if (style === 'thick') {
    drawRect(0, 8);
    return;
  }

  if (style === 'double') {
    drawRect(0, 2);
    drawRect(9, 2);
  }
}

const getPhotoRenderMetrics = (image, slotWidth, slotHeight, rotation, borderStyle, zoom = 1) => {
  const imgAspectRatio = image.naturalWidth / image.naturalHeight;
  const isSideways = rotation === 90 || rotation === 270;
  const effectiveSlotWidth = isSideways ? slotHeight : slotWidth;
  const effectiveSlotHeight = isSideways ? slotWidth : slotHeight;

  const hasFrame = borderStyle !== 'none';
  const outerInset = hasFrame ? 14 : 0;
  const imageMatPadding = hasFrame ? 10 : 0;
  const frameWidth = Math.max(1, effectiveSlotWidth - outerInset * 2);
  const frameHeight = Math.max(1, effectiveSlotHeight - outerInset * 2);
  const viewportWidth = Math.max(1, frameWidth - imageMatPadding * 2);
  const viewportHeight = Math.max(1, frameHeight - imageMatPadding * 2);
  const limitedSlotAspectRatio = viewportWidth / viewportHeight;

  let baseWidth;
  let baseHeight;

  if (imgAspectRatio > limitedSlotAspectRatio) {
    baseWidth = viewportWidth;
    baseHeight = viewportWidth / imgAspectRatio;
  } else {
    baseHeight = viewportHeight;
    baseWidth = viewportHeight * imgAspectRatio;
  }

  const drawWidth = Math.max(1, baseWidth * zoom);
  const drawHeight = Math.max(1, baseHeight * zoom);

  return {
    hasFrame,
    frameWidth,
    frameHeight,
    frameX: -frameWidth / 2,
    frameY: -frameHeight / 2,
    viewportWidth,
    viewportHeight,
    viewportX: -viewportWidth / 2,
    viewportY: -viewportHeight / 2,
    drawWidth,
    drawHeight,
    maxOffsetX: Math.max(0, (drawWidth - viewportWidth) / 2),
    maxOffsetY: Math.max(0, (drawHeight - viewportHeight) / 2),
  };
};

const clampPhotoTransform = (photo, borderStyle) => {
  if (!photo?.image) {
    return photo;
  }

  const { photoWidthPx, photoHeightPx } = getSheetMetrics();
  const zoom = clamp(photo.zoom ?? 1, MIN_ZOOM, MAX_ZOOM);
  const metrics = getPhotoRenderMetrics(photo.image, photoWidthPx, photoHeightPx, photo.rotation, borderStyle, zoom);

  return {
    ...photo,
    zoom,
    offsetX: clamp(photo.offsetX ?? 0, -metrics.maxOffsetX, metrics.maxOffsetX),
    offsetY: clamp(photo.offsetY ?? 0, -metrics.maxOffsetY, metrics.maxOffsetY),
  };
};

function drawContainedImage(ctx, photo, slotX, slotY, slotWidth, slotHeight, borderStyle, sourceImage = photo.image) {
  ctx.save();
  ctx.translate(slotX + slotWidth / 2, slotY + slotHeight / 2);
  ctx.rotate(photo.rotation * Math.PI / 180);

  const metrics = getPhotoRenderMetrics(
    sourceImage,
    slotWidth,
    slotHeight,
    photo.rotation,
    borderStyle,
    photo.zoom ?? 1
  );
  const offsetX = clamp(photo.offsetX ?? 0, -metrics.maxOffsetX, metrics.maxOffsetX);
  const offsetY = clamp(photo.offsetY ?? 0, -metrics.maxOffsetY, metrics.maxOffsetY);

  if (metrics.hasFrame) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(metrics.frameX, metrics.frameY, metrics.frameWidth, metrics.frameHeight);
    drawPhotoFrame(ctx, metrics.frameX, metrics.frameY, metrics.frameWidth, metrics.frameHeight, borderStyle);
  }

  ctx.save();
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

  ctx.restore();
}

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

const loadPhotoFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const previewImage = await createPreviewImage(img);
        resolve({
          id: `${Date.now()}-${Math.random()}`,
          src: event.target.result,
          image: img,
          previewImage,
          rotation: 0,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
          name: file.name,
        });
      };
      img.onerror = () => reject(new Error(`Could not load ${file.name}`));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

const MultiPhoto = () => {
  const [photos, setPhotos] = useState([]);
  const [borderStyle, setBorderStyle] = useState('single');
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [previewRotation, setPreviewRotation] = useState(0);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const photosRef = useRef([]);
  const borderStyleRef = useRef(borderStyle);
  const selectedPhotoIdRef = useRef(selectedPhotoId);
  const layoutRef = useRef([]);
  const interactionRef = useRef(null);
  const drawFrameRef = useRef(null);
  const pendingPreviewRef = useRef(null);

  const drawCanvas = useCallback((currentPhotos, currentSelectedPhotoId = null, targetCanvas = canvasRef.current, shouldUpdateLayout = true) => {
    const canvas = targetCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { paperWidthPx, paperHeightPx } = getSheetMetrics();
    const positions = getPhotoPositions(currentPhotos.length);

    canvas.width = paperWidthPx;
    canvas.height = paperHeightPx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = targetCanvas === canvasRef.current && interactionRef.current ? 'medium' : 'high';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (shouldUpdateLayout) {
      layoutRef.current = positions.map((position, index) => ({
        ...position,
        photoId: currentPhotos[index]?.id || null,
      }));
    }

    positions.forEach((position, index) => {
      const photo = currentPhotos[index];
      const isSelected = photo?.id === currentSelectedPhotoId;

      ctx.strokeStyle = isSelected ? '#0d6efd' : '#ced4da';
      ctx.lineWidth = isSelected ? 5 : 2;
      ctx.strokeRect(position.x, position.y, position.w, position.h);

      if (photo?.image?.complete) {
        drawContainedImage(
          ctx,
          photo,
          position.x,
          position.y,
          position.w,
          position.h,
          borderStyleRef.current,
          targetCanvas === canvasRef.current ? photo.previewImage || photo.image : photo.image
        );
      } else {
        ctx.fillStyle = '#6c757d';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '40px Arial';
        ctx.fillText(`Photo ${index + 1}`, position.x + position.w / 2, position.y + position.h / 2);
      }
    });
  }, []);

  const schedulePreviewDraw = useCallback((currentPhotos = photosRef.current, currentSelectedPhotoId = selectedPhotoIdRef.current) => {
    pendingPreviewRef.current = { currentPhotos, currentSelectedPhotoId };

    if (drawFrameRef.current !== null) {
      return;
    }

    drawFrameRef.current = window.requestAnimationFrame(() => {
      drawFrameRef.current = null;
      const pending = pendingPreviewRef.current;
      pendingPreviewRef.current = null;
      drawCanvas(pending.currentPhotos, pending.currentSelectedPhotoId);
    });
  }, [drawCanvas]);

  useEffect(() => {
    photosRef.current = photos;
    schedulePreviewDraw(photos, selectedPhotoIdRef.current);
  }, [photos, schedulePreviewDraw]);

  useEffect(() => {
    borderStyleRef.current = borderStyle;
    photosRef.current = photosRef.current.map((photo) => clampPhotoTransform(photo, borderStyle));
    setPhotos([...photosRef.current]);
  }, [borderStyle]);

  useEffect(() => {
    selectedPhotoIdRef.current = selectedPhotoId;
    schedulePreviewDraw(photosRef.current, selectedPhotoId);
  }, [selectedPhotoId, schedulePreviewDraw]);

  useEffect(() => () => {
    if (drawFrameRef.current !== null) {
      window.cancelAnimationFrame(drawFrameRef.current);
    }
  }, []);

  const triggerFilePicker = () => {
    if (photos.length >= MAX_PHOTOS) return;
    fileInputRef.current?.click();
  };

  const rotatePreview = (delta) => {
    setPreviewRotation((current) => (current + delta + 360) % 360);
  };

  const handleImageUpload = async (fileList) => {
    const remainingSlots = MAX_PHOTOS - photosRef.current.length;
    if (remainingSlots <= 0) return;

    const files = Array.from(fileList || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (files.length === 0) return;

    try {
      const loadedPhotos = await Promise.all(files.map(loadPhotoFile));
      setPhotos((currentPhotos) => [...currentPhotos, ...loadedPhotos].slice(0, MAX_PHOTOS));
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRotate = (id) => {
    setSelectedPhotoId(id);
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === id
          ? clampPhotoTransform({ ...photo, rotation: (photo.rotation + 90) % 360 }, borderStyleRef.current)
          : photo
      )
    );
  };

  const handleZoom = (id, delta) => {
    setSelectedPhotoId(id);
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === id
          ? clampPhotoTransform({ ...photo, zoom: (photo.zoom ?? 1) + delta }, borderStyleRef.current)
          : photo
      )
    );
  };

  const handleResetTransform = (id) => {
    setSelectedPhotoId(id);
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === id
          ? clampPhotoTransform({ ...photo, zoom: 1, offsetX: 0, offsetY: 0 }, borderStyleRef.current)
          : photo
      )
    );
  };

  const handleRemove = (id) => {
    setPhotos((currentPhotos) => currentPhotos.filter((photo) => photo.id !== id));
    if (selectedPhotoIdRef.current === id) {
      setSelectedPhotoId(null);
    }
  };

  const getCanvasPointFromClient = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotationRadians = (-previewRotation * Math.PI) / 180;
    const rotatedX = clientX - centerX;
    const rotatedY = clientY - centerY;
    const localX = rotatedX * Math.cos(rotationRadians) - rotatedY * Math.sin(rotationRadians);
    const localY = rotatedX * Math.sin(rotationRadians) + rotatedY * Math.cos(rotationRadians);
    const displayWidth = previewRotation % 180 === 0 ? rect.width : rect.height;
    const displayHeight = previewRotation % 180 === 0 ? rect.height : rect.width;
    const normalizedX = (localX + displayWidth / 2) / displayWidth;
    const normalizedY = (localY + displayHeight / 2) / displayHeight;

    if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
      return null;
    }

    return {
      x: normalizedX * canvas.width,
      y: normalizedY * canvas.height,
    };
  }, [previewRotation]);

  const getPhotoHit = useCallback((point) => {
    if (!point) return null;

    for (let index = layoutRef.current.length - 1; index >= 0; index -= 1) {
      const slot = layoutRef.current[index];
      if (!slot.photoId) continue;

      if (
        point.x >= slot.x &&
        point.x <= slot.x + slot.w &&
        point.y >= slot.y &&
        point.y <= slot.y + slot.h
      ) {
        const photo = photosRef.current.find((item) => item.id === slot.photoId);
        if (photo) {
          return { photo, slot };
        }
      }
    }

    return null;
  }, []);

  const getLocalPointInSlot = useCallback((point, slot, rotation) => {
    const centerX = slot.x + slot.w / 2;
    const centerY = slot.y + slot.h / 2;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const radians = (-rotation * Math.PI) / 180;

    return {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians),
    };
  }, []);

  const applyLivePhotoUpdate = useCallback((photoId, updater, nextSelectedPhotoId = selectedPhotoIdRef.current) => {
    let changed = false;
    const nextPhotos = photosRef.current.map((photo) => {
      if (photo.id !== photoId) {
        return photo;
      }

      changed = true;
      return clampPhotoTransform(updater(photo), borderStyleRef.current);
    });

    if (!changed) return;

    photosRef.current = nextPhotos;
    schedulePreviewDraw(nextPhotos, nextSelectedPhotoId);
  }, [schedulePreviewDraw]);

  const commitLiveChanges = useCallback(() => {
    setPhotos([...photosRef.current]);
  }, []);

  const finishInteraction = useCallback((commit = true) => {
    interactionRef.current = null;
    if (commit) {
      commitLiveChanges();
    }
  }, [commitLiveChanges]);

  const handlePan = useCallback((point) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.mode !== 'pan') return;

    const photo = photosRef.current.find((item) => item.id === interaction.photoId);
    if (!photo) return;

    const dx = point.x - interaction.lastPoint.x;
    const dy = point.y - interaction.lastPoint.y;
    const localDelta = toLocalDelta(dx, dy, photo.rotation);

    interaction.lastPoint = point;
    applyLivePhotoUpdate(interaction.photoId, (currentPhoto) => ({
      ...currentPhoto,
      offsetX: (currentPhoto.offsetX ?? 0) + localDelta.x,
      offsetY: (currentPhoto.offsetY ?? 0) + localDelta.y,
    }), interaction.photoId);
  }, [applyLivePhotoUpdate]);

  const handlePinch = useCallback((pointA, pointB) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.mode !== 'pinch') return;

    const photo = photosRef.current.find((item) => item.id === interaction.photoId);
    if (!photo) return;

    const currentDistance = Math.max(1, getDistance(pointA, pointB));
    const currentMidpoint = getMidpoint(pointA, pointB);
    const scaleFactor = currentDistance / interaction.startDistance;
    const midpointDelta = toLocalDelta(
      currentMidpoint.x - interaction.startMidpoint.x,
      currentMidpoint.y - interaction.startMidpoint.y,
      photo.rotation
    );

    applyLivePhotoUpdate(interaction.photoId, (currentPhoto) => ({
      ...currentPhoto,
      zoom: interaction.startZoom * scaleFactor,
      offsetX: interaction.startOffsetX + midpointDelta.x,
      offsetY: interaction.startOffsetY + midpointDelta.y,
    }), interaction.photoId);
  }, [applyLivePhotoUpdate]);

  const handleCanvasMouseDown = (event) => {
    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    const hit = getPhotoHit(point);

    if (!hit) {
      setSelectedPhotoId(null);
      return;
    }

    setSelectedPhotoId(hit.photo.id);
    interactionRef.current = {
      mode: 'pan',
      photoId: hit.photo.id,
      lastPoint: point,
    };
  };

  const handleCanvasMouseMove = (event) => {
    if (!interactionRef.current) return;
    event.preventDefault();

    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    if (point) {
      handlePan(point);
    }
  };

  const handleCanvasMouseUp = () => {
    if (interactionRef.current) {
      finishInteraction(true);
    }
  };

  const handleCanvasWheel = useCallback((event) => {
    const point = getCanvasPointFromClient(event.clientX, event.clientY);
    const hit = getPhotoHit(point);
    if (!hit) {
      return;
    }

    event.preventDefault();
    setSelectedPhotoId(hit.photo.id);

    const localPoint = getLocalPointInSlot(point, hit.slot, hit.photo.rotation);
    const currentMetrics = getPhotoRenderMetrics(
      hit.photo.image,
      hit.slot.w,
      hit.slot.h,
      hit.photo.rotation,
      borderStyleRef.current,
      hit.photo.zoom ?? 1
    );
    const currentZoom = hit.photo.zoom ?? 1;
    const nextZoom = clamp(
      currentZoom + (event.deltaY < 0 ? ZOOM_STEP / 1.5 : -ZOOM_STEP / 1.5),
      MIN_ZOOM,
      MAX_ZOOM
    );

    if (nextZoom === currentZoom) {
      return;
    }

    const nextMetrics = getPhotoRenderMetrics(
      hit.photo.image,
      hit.slot.w,
      hit.slot.h,
      hit.photo.rotation,
      borderStyleRef.current,
      nextZoom
    );
    const currentOffsetX = hit.photo.offsetX ?? 0;
    const currentOffsetY = hit.photo.offsetY ?? 0;
    const relativeX = (localPoint.x + currentMetrics.drawWidth / 2 - currentOffsetX) / currentMetrics.drawWidth;
    const relativeY = (localPoint.y + currentMetrics.drawHeight / 2 - currentOffsetY) / currentMetrics.drawHeight;
    const nextOffsetX = localPoint.x + nextMetrics.drawWidth / 2 - (relativeX * nextMetrics.drawWidth);
    const nextOffsetY = localPoint.y + nextMetrics.drawHeight / 2 - (relativeY * nextMetrics.drawHeight);

    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === hit.photo.id
          ? clampPhotoTransform(
              {
                ...photo,
                zoom: nextZoom,
                offsetX: nextOffsetX,
                offsetY: nextOffsetY,
              },
              borderStyleRef.current
            )
          : photo
      )
    );
  }, [getCanvasPointFromClient, getLocalPointInSlot, getPhotoHit]);

  const handleCanvasTouchStart = (event) => {
    event.preventDefault();

    if (event.touches.length === 1) {
      const point = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      const hit = getPhotoHit(point);

      if (!hit) {
        setSelectedPhotoId(null);
        interactionRef.current = null;
        return;
      }

      setSelectedPhotoId(hit.photo.id);
      interactionRef.current = {
        mode: 'pan',
        photoId: hit.photo.id,
        lastPoint: point,
      };
      return;
    }

    if (event.touches.length >= 2) {
      const pointA = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      const pointB = getCanvasPointFromClient(event.touches[1].clientX, event.touches[1].clientY);
      const midpoint = getMidpoint(pointA, pointB);
      const hit = getPhotoHit(midpoint);

      if (!hit) {
        interactionRef.current = null;
        return;
      }

      setSelectedPhotoId(hit.photo.id);
      interactionRef.current = {
        mode: 'pinch',
        photoId: hit.photo.id,
        startDistance: Math.max(1, getDistance(pointA, pointB)),
        startZoom: hit.photo.zoom ?? 1,
        startOffsetX: hit.photo.offsetX ?? 0,
        startOffsetY: hit.photo.offsetY ?? 0,
        startMidpoint: midpoint,
      };
    }
  };

  const handleCanvasTouchMove = (event) => {
    if (!interactionRef.current) return;
    event.preventDefault();

    if (event.touches.length === 1 && interactionRef.current.mode === 'pan') {
      const point = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      if (point) {
        handlePan(point);
      }
      return;
    }

    if (event.touches.length >= 2) {
      const pointA = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      const pointB = getCanvasPointFromClient(event.touches[1].clientX, event.touches[1].clientY);
      if (pointA && pointB) {
        handlePinch(pointA, pointB);
      }
    }
  };

  const handleCanvasTouchEnd = (event) => {
    if (!interactionRef.current) return;

    if (event.touches.length === 1 && interactionRef.current.mode === 'pinch') {
      const point = getCanvasPointFromClient(event.touches[0].clientX, event.touches[0].clientY);
      interactionRef.current = {
        mode: 'pan',
        photoId: interactionRef.current.photoId,
        lastPoint: point,
      };
      commitLiveChanges();
      return;
    }

    if (event.touches.length === 0) {
      finishInteraction(true);
    }
  };

  const handleDownload = async (format) => {
    const exportCanvas = document.createElement('canvas');
    drawCanvas(photosRef.current, null, exportCanvas, false);

    try {
      await saveCanvasDocument(exportCanvas, format, {
        filename: `multi-photo_A4_landscape.${format.toLowerCase()}`,
        quality: 1.0,
        pdfOptions: {
          filename: 'multi-photo_A4_landscape.pdf',
          unit: 'mm',
          width: A4_WIDTH_MM,
          height: A4_HEIGHT_MM,
          orientation: 'l',
        },
      });
    } catch (error) {
      alert(`Download failed: ${error.message}`);
    }
  };

  const { paperWidthPx, paperHeightPx } = getSheetMetrics();
  const isPreviewRotatedSideways = previewRotation % 180 !== 0;
  const previewAspectRatio = isPreviewRotatedSideways
    ? `${paperHeightPx} / ${paperWidthPx}`
    : `${paperWidthPx} / ${paperHeightPx}`;
  const previewCanvasStyle = isPreviewRotatedSideways
    ? {
        width: `${(paperWidthPx / paperHeightPx) * 100}%`,
        height: `${(paperHeightPx / paperWidthPx) * 100}%`,
      }
    : {
        width: '100%',
        height: '100%',
      };

  return (
    <Row>
      <Col md={5}>
        <Card>
          <Card.Body>
            <Card.Title>Upload Your Photos</Card.Title>
            <p className="mb-3">Select one or multiple photos, then fine-tune each 6x4 slot with zoom buttons or drag and pinch directly on the preview.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                handleImageUpload(event.target.files);
                event.target.value = '';
              }}
            />
            <div className="d-flex align-items-center justify-content-between mb-3">
              <Badge bg="secondary">{photos.length}/{MAX_PHOTOS} added</Badge>
              <Button variant="primary" onClick={triggerFilePicker} disabled={photos.length >= MAX_PHOTOS}>
                {photos.length === 0 ? 'Choose Photo(s)' : 'Choose Photo(s) Again'}
              </Button>
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Photo Border</Form.Label>
              <Form.Select value={borderStyle} onChange={(event) => setBorderStyle(event.target.value)}>
                {BORDER_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <div className="multi-photo-sidebar">
              {[...Array(MAX_PHOTOS)].map((_, index) => {
                const photo = photos[index];
                const isSelected = photo?.id === selectedPhotoId;

                return (
                  <div
                    key={photo?.id || `empty-${index}`}
                    className={`multi-photo-item ${photo ? 'has-image' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => photo && setSelectedPhotoId(photo.id)}
                  >
                    <div className="multi-photo-preview-wrap">
                      {photo ? (
                        <img src={photo.src} alt={`Photo ${index + 1}`} className="multi-photo-preview-img" />
                      ) : (
                        <span className="multi-photo-empty-text">Photo {index + 1}</span>
                      )}
                    </div>
                    <div className="multi-photo-meta">
                      <div className="small multi-photo-file-name" title={photo?.name || ''}>
                        {photo?.name || `Empty slot ${index + 1}`}
                      </div>
                      {photo && (
                        <>
                          <div className="small text-muted mt-1">Zoom {Math.round((photo.zoom ?? 1) * 100)}%</div>
                          <div className="multi-photo-actions mt-2">
                            <Button variant="outline-secondary" size="sm" onClick={() => handleZoom(photo.id, -ZOOM_STEP)}>
                              Zoom -
                            </Button>
                            <Button variant="outline-secondary" size="sm" onClick={() => handleZoom(photo.id, ZOOM_STEP)}>
                              Zoom +
                            </Button>
                            <Button variant="outline-secondary" size="sm" onClick={() => handleRotate(photo.id)}>
                              Rotate ({photo.rotation}deg)
                            </Button>
                            <Button variant="outline-secondary" size="sm" onClick={() => handleResetTransform(photo.id)}>
                              Reset
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleRemove(photo.id)}>
                              Remove
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={7} className="pb-5">
        <Card>
          <Card.Body>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <Card.Title className="mb-0">A4 Landscape Preview</Card.Title>
              <div className="d-flex flex-wrap gap-2">
                <Button variant="outline-secondary" size="sm" onClick={() => rotatePreview(-PREVIEW_ROTATION_STEP)}>
                  Rotate View Left
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={() => rotatePreview(PREVIEW_ROTATION_STEP)}>
                  Rotate View Right
                </Button>
                <Button variant="outline-secondary" size="sm" disabled={previewRotation === 0} onClick={() => setPreviewRotation(0)}>
                  Reset View
                </Button>
              </div>
            </div>
            <p className="small text-muted mb-3">On desktop, click a photo and use the mouse wheel to zoom, then drag to reposition. On mobile, drag with one finger or pinch to zoom.</p>
            <div className="text-center themed-canvas-wrap multi-photo-canvas-wrap" style={{ padding: '1rem', overflowX: 'auto' }}>
              <div className="multi-photo-preview-stage" style={{ aspectRatio: previewAspectRatio }}>
                <canvas
                  ref={canvasRef}
                  className="multi-photo-canvas"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onWheel={handleCanvasWheel}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  onTouchCancel={() => finishInteraction(true)}
                  style={{
                    ...previewCanvasStyle,
                    backgroundColor: 'white',
                    transform: `translate(-50%, -50%) rotate(${previewRotation}deg)`,
                  }}
                />
              </div>
            </div>
          </Card.Body>
        </Card>
        <div className="d-grid gap-2 mt-3">
          <FormatDownloadDropdown
            id="dropdown-download-multi-button"
            title="Download A4 Sheet"
            size="lg"
            variant="primary"
            disabled={photos.length === 0}
            formats={['PDF', 'JPG', 'PNG']}
            onSelect={handleDownload}
          />
        </div>
      </Col>
    </Row>
  );
};

export default MultiPhoto;
