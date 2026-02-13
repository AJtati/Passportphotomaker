import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Form, DropdownButton, Dropdown } from 'react-bootstrap';
import { jsPDF } from 'jspdf';

const EDITOR_DPI = 150;
const EXPORT_DPI = 300;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_PER_INCH = 25.4;

const toPixels = (mm, dpi) => Math.round((mm / MM_PER_INCH) * dpi);
const MAX_EDITOR_IMAGE_DIMENSION = 1400;

const A4_PIXELS_EDITOR = {
  portrait: {
    width: toPixels(A4_WIDTH_MM, EDITOR_DPI),
    height: toPixels(A4_HEIGHT_MM, EDITOR_DPI),
  },
  landscape: {
    width: toPixels(A4_HEIGHT_MM, EDITOR_DPI),
    height: toPixels(A4_WIDTH_MM, EDITOR_DPI),
  },
};

const A4_PIXELS_EXPORT = {
  portrait: {
    width: toPixels(A4_WIDTH_MM, EXPORT_DPI),
    height: toPixels(A4_HEIGHT_MM, EXPORT_DPI),
  },
  landscape: {
    width: toPixels(A4_HEIGHT_MM, EXPORT_DPI),
    height: toPixels(A4_WIDTH_MM, EXPORT_DPI),
  },
};

const autoArrangeImages = (items, paperSize) => {
  if (!items.length) return items;

  const count = items.length;
  const paperAspect = paperSize.width / paperSize.height;
  let cols;
  let rows;

  if (count === 1) {
    cols = 1;
    rows = 1;
  } else if (count === 2) {
    // Always place two images side-by-side and vertically centered.
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

    // Fit rotated bounding box inside slot while preserving original image aspect ratio.
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

const createEditorPreviewImage = (sourceImage) =>
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
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    tempCtx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

    const previewImage = new Image();
    previewImage.onload = () => resolve(previewImage);
    previewImage.src = tempCanvas.toDataURL('image/jpeg', 0.9);
  });

const CollagePrint = () => {
  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [orientation, setOrientation] = useState('portrait');
  const [windowSize, setWindowSize] = useState({ width: 1024, height: 768 });
  const [draggingId, setDraggingId] = useState(null);
  const [draggingType, setDraggingType] = useState(null); // 'move', 'resize', 'rotate'
  const [draggingCorner, setDraggingCorner] = useState(null); // 'nw','ne','sw','se'
  const [activeButtonId, setActiveButtonId] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef();
  const containerRef = useRef();
  const lastMoveTimeRef = useRef(0);
  const resizeStartRef = useRef(null);
  const rotateStartRef = useRef(0);
  const initialRotationRef = useRef(0);
  const dragAnchorRef = useRef({ x: 0, y: 0 });
  const initialImageXRef = useRef(0);
  const initialImageYRef = useRef(0);
  const imagesRef = useRef([]);
  const moveIntervalRef = useRef(null);
  const resizeIntervalRef = useRef(null);

  // Update window size
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const paperSize = A4_PIXELS_EDITOR[orientation];

  useEffect(() => {
    if (!imagesRef.current.length) return;
    setImages((prev) => autoArrangeImages(prev, paperSize));
    setSelectedId(null);
  }, [orientation, paperSize]);

  // Responsive layout flags
  const isMobile = windowSize.width <= 700;
  const sidebarWidth = isMobile ? 0 : 280;

  // Calculate responsive canvas scale - maximize space usage
  const availableWidth = Math.max(300, isMobile ? windowSize.width - 40 : windowSize.width - sidebarWidth - 40);
  const availableHeight = Math.max(300, isMobile ? windowSize.height - 180 : windowSize.height - 120);

  const scaleX = availableWidth / paperSize.width;
  const scaleY = availableHeight / paperSize.height;
  const canvasScale = Math.min(scaleX, scaleY, 1); // Max 100% of actual size

  // User-controllable zoom percent (starts at computed fit)
  const [zoomPercent, setZoomPercent] = useState(Math.round(canvasScale * 100));
  // Effective scale applied to the canvas (clamped 10% - 200%)
  const effectiveScale = Math.max(0.1, Math.min(2, zoomPercent / 100));

  // UI font sizing
  const controlFontSize = isMobile ? '14px' : '12px';
  const controlSpacing = isMobile ? '12px' : '8px';

  // Dynamic handle size so it stays visible on small screens
  const dynamicHandleSize = Math.min(48, Math.max(18, 28 / effectiveScale));

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const drawCanvas = useCallback((currentImages, currentSelectedId, currentPaperSize) => {
    if (!canvasRef.current || !Array.isArray(currentImages)) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });

    const isInteracting = Boolean(draggingId || activeButtonId);
    const dpr = isInteracting
      ? (isMobile ? 0.85 : 1)
      : Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    canvas.width = currentPaperSize.width * dpr;
    canvas.height = currentPaperSize.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = isInteracting ? 'low' : 'high';

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, currentPaperSize.width, currentPaperSize.height);

    // Border
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, currentPaperSize.width, currentPaperSize.height);

    // Draw images
    currentImages.forEach((img) => {
      const isSelected = img.id === currentSelectedId;

      // Draw image within rotated context
      ctx.save();
      const cx = img.x + img.width / 2;
      const cy = img.y + img.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((img.rotation * Math.PI) / 180);
      const editorImageObj = img.editorImageObj || img.imageObj;
      ctx.drawImage(editorImageObj, -img.width / 2, -img.height / 2, img.width, img.height);

      // Selection border and interactive handles (drawn in rotated space)
      if (isSelected && !(isMobile && isInteracting)) {
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);
        ctx.setLineDash([]);

        const handleSize = dynamicHandleSize; // dynamicHandleSize is already dependent on effectiveScale
        const hs = handleSize / 2;

        // Corners in local space: nw, ne, sw, se
        const localCorners = [
          { lx: -img.width / 2, ly: -img.height / 2 },
          { lx: img.width / 2, ly: -img.height / 2 },
          { lx: -img.width / 2, ly: img.height / 2 },
          { lx: img.width / 2, ly: img.height / 2 },
        ];

        localCorners.forEach((c) => {
          ctx.fillStyle = '#0066ff';
          ctx.beginPath();
          ctx.arc(c.lx, c.ly, hs, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(c.lx, c.ly, Math.max(4, hs * 0.6), 0, Math.PI * 2);
          ctx.fill();
        });

        // Rotate handle above the top center in local space
        const rotateOffset = Math.max(40, hs * 2.2);
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(0, -img.height / 2 - rotateOffset, hs, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = `${Math.max(10, hs)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↻', 0, -img.height / 2 - rotateOffset);

        // Center drag handle
        ctx.fillStyle = '#00aa00';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(10, hs * 0.9), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(12, hs)}px Arial`;
        ctx.fillText('⋮', 0, 0);
      }

      ctx.restore();
    });
  }, [dynamicHandleSize, draggingId, activeButtonId, isMobile]);

  const moveImageByStep = useCallback((dx, dy) => {
    if (!selectedId || !imagesRef.current || imagesRef.current.length === 0) return;

    const currentImages = imagesRef.current;
    const imgIndex = currentImages.findIndex((img) => img.id === selectedId);
    if (imgIndex === -1) return;

    const img = { ...currentImages[imgIndex] }; // Create a copy to modify
    img.x += dx;
    img.y += dy;

    // Constrain within paper (can move partially off-screen)
    img.x = Math.max(-img.width, Math.min(img.x, paperSize.width));
    img.y = Math.max(-img.height, Math.min(img.y, paperSize.height));

    currentImages[imgIndex] = img; // Update the mutable ref
    drawCanvas(currentImages, selectedId, paperSize);
  }, [selectedId, paperSize, drawCanvas]);

  const resizeImageByStep = useCallback((delta) => {
    if (!selectedId || !imagesRef.current || imagesRef.current.length === 0) return;

    const currentImages = imagesRef.current;
    const imgIndex = currentImages.findIndex((img) => img.id === selectedId);
    if (imgIndex === -1) return;

    const img = { ...currentImages[imgIndex] }; // Create a copy to modify
    const aspect = img.imageObj.naturalWidth / img.imageObj.naturalHeight;

    let newWidth = img.width + delta;
    let newHeight = newWidth / aspect;

    // Ensure minimum size
    newWidth = Math.max(50, newWidth);
    newHeight = newWidth / aspect;

    img.width = newWidth;
    img.height = newHeight;

    currentImages[imgIndex] = img; // Update the mutable ref
    drawCanvas(currentImages, selectedId, paperSize);
  }, [selectedId, paperSize, drawCanvas]);
  
  const startContinuousAction = useCallback((buttonId, actionFn, ...args) => {
    setActiveButtonId(buttonId);
    // Clear any existing interval first
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    if (resizeIntervalRef.current) clearInterval(resizeIntervalRef.current);

    // Determine which ref to use
    const intervalRef = (actionFn === moveImageByStep) ? moveIntervalRef : resizeIntervalRef;

    // Call once immediately
    actionFn(...args);
    // Then set interval for continuous calls
    intervalRef.current = setInterval(() => {
      actionFn(...args);
    }, 100); // Adjust delay as needed for responsiveness
  }, [moveImageByStep, resizeImageByStep]);

  const stopContinuousAction = useCallback(() => {
    setActiveButtonId(null);
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
    if (resizeIntervalRef.current) {
      clearInterval(resizeIntervalRef.current);
      resizeIntervalRef.current = null;
    }
    // Update React state after continuous action stops
    setImages([...imagesRef.current]);
  }, []);

  // Draw canvas - optimized for performance
  useEffect(() => {
    // Only call drawCanvas if images is an array
    if (Array.isArray(images)) {
      drawCanvas(images, selectedId, paperSize);
    }
  }, [images, selectedId, paperSize, drawCanvas]);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      event.target.value = '';
      return;
    }

    try {
      const loadedImages = await Promise.all(
        imageFiles.map(
          (file, index) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (loadEvent) => {
                const imageObj = new Image();
                imageObj.onload = async () => {
                  const editorImageObj = await createEditorPreviewImage(imageObj);
                  resolve({
                    id: Date.now() + Math.random() + index,
                    imageObj,
                    editorImageObj,
                    x: 0,
                    y: 0,
                    width: imageObj.naturalWidth,
                    height: imageObj.naturalHeight,
                    rotation: 0,
                  });
                };
                imageObj.onerror = () => reject(new Error('Failed to load image.'));
                imageObj.src = loadEvent.target.result;
              };
              reader.onerror = () => reject(new Error('Failed to read file.'));
              reader.readAsDataURL(file);
            })
        )
      );

      setImages((prev) => autoArrangeImages([...prev, ...loadedImages], paperSize));
      setSelectedId(null);
    } catch {
      alert('One or more images could not be loaded. Please try again.');
    }
    event.target.value = '';
  };

  const handleAutoArrange = useCallback(() => {
    setImages((prev) => autoArrangeImages(prev, paperSize));
    setSelectedId(null);
  }, [paperSize]);

  const getEventCoords = (e) => {
    if (e.touches && e.touches.length) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  // Helper: Check if point is in circle
  const isPointInCircle = (px, py, cx, cy, radius) => {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
  };

  // Helper: convert local point (lx,ly) relative to image center to world coords
  const localToWorld = (img, lx, ly) => {
    const cx = img.x + img.width / 2;
    const cy = img.y + img.height / 2;
    const rad = (img.rotation * Math.PI) / 180;
    const wx = cx + lx * Math.cos(rad) - ly * Math.sin(rad);
    const wy = cy + lx * Math.sin(rad) + ly * Math.cos(rad);
    return { x: wx, y: wy };
  };

  // Helper: point in rotated rect (centered at img.x/img.y + width/2,height/2)
  const pointInRotatedRect = (px, py, img) => {
    const cx = img.x + img.width / 2;
    const cy = img.y + img.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    const rad = (-img.rotation * Math.PI) / 180; // rotate point by -rotation
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
    return rx >= -img.width / 2 && rx <= img.width / 2 && ry >= -img.height / 2 && ry <= img.height / 2;
  };

  // Update cursor on hover (without dragging)
  const updateCursorOnHover = useCallback((e) => {
    if (!canvasRef.current || draggingId) return; // Don't update cursor while dragging

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getEventCoords(e);
    const x = (clientX - rect.left) / effectiveScale;
    const y = (clientY - rect.top) / effectiveScale;

    let cursor = 'default';

    if (selectedId) {
      const img = images.find((i) => i.id === selectedId);
      if (img) {
        // Check rotate handle
        const rotateLocal = { lx: 0, ly: -img.height / 2 - Math.max(40, dynamicHandleSize / 2.2) };
        const rotateWorld = localToWorld(img, rotateLocal.lx, rotateLocal.ly);
        if (isPointInCircle(x, y, rotateWorld.x, rotateWorld.y, dynamicHandleSize / 2)) {
          cursor = 'grab';
        } else {
          // Check corner handles with appropriate resize cursors
          const corners = [
            { lx: -img.width / 2, ly: -img.height / 2, cursor: 'nw-resize' },
            { lx: img.width / 2, ly: -img.height / 2, cursor: 'ne-resize' },
            { lx: -img.width / 2, ly: img.height / 2, cursor: 'sw-resize' },
            { lx: img.width / 2, ly: img.height / 2, cursor: 'se-resize' },
          ];
          for (let ci = 0; ci < corners.length; ci++) {
            const corner = corners[ci];
            const world = localToWorld(img, corner.lx, corner.ly);
            if (isPointInCircle(x, y, world.x, world.y, dynamicHandleSize / 2)) {
              cursor = corner.cursor;
              break;
            }
          }
          // Check center move handle
          if (cursor === 'default' && isPointInCircle(x, y, img.x + img.width / 2, img.y + img.height / 2, 14)) {
            cursor = 'move';
          }
        }
      }
    }

    canvas.style.cursor = cursor;
  }, [draggingId, effectiveScale, images, selectedId, dynamicHandleSize]);

  // Handle canvas mouse down - detect what was clicked
  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling on touch

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getEventCoords(e);
    const x = (clientX - rect.left) / effectiveScale;
    const y = (clientY - rect.top) / effectiveScale;

    setDragStart({ x, y }); // Initial click point

    // Check all images from top to bottom to find which one was clicked
    let found = false;
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      const isCurrentlySelected = img.id === selectedId;

      // Only check handles if this image is currently selected
      if (isCurrentlySelected) {
        // Check rotate handle
        const rotateLocal = { lx: 0, ly: -img.height / 2 - Math.max(40, dynamicHandleSize / 2.2) };
        const rotateWorld = localToWorld(img, rotateLocal.lx, rotateLocal.ly);
        if (isPointInCircle(x, y, rotateWorld.x, rotateWorld.y, dynamicHandleSize / 2)) {
          setDraggingId(img.id);
          setDraggingType('rotate');
          rotateStartRef.current = Math.atan2(y - (img.y + img.height / 2), x - (img.x + img.width / 2));
          initialRotationRef.current = img.rotation;
          dragAnchorRef.current = { x, y };
          return;
        }

        // Check center drag handle
        if (isPointInCircle(x, y, img.x + img.width / 2, img.y + img.height / 2, 14)) {
          setDraggingId(img.id);
          setDraggingType('move');
          initialImageXRef.current = img.x; // Store initial image x
          initialImageYRef.current = img.y; // Store initial image y
          return;
        }

        // Check corner handles using local->world
        const localCorners = [
          { lx: -img.width / 2, ly: -img.height / 2 },
          { lx: img.width / 2, ly: -img.height / 2 },
          { lx: -img.width / 2, ly: img.height / 2 },
          { lx: img.width / 2, ly: img.height / 2 },
        ];
        for (let ci = 0; ci < localCorners.length; ci++) {
          const lw = localCorners[ci];
          const world = localToWorld(img, lw.lx, lw.ly);
          if (isPointInCircle(x, y, world.x, world.y, dynamicHandleSize / 2)) {
            setDraggingId(img.id);
            setDraggingType('resize');
            const cornerNames = ['nw', 'ne', 'sw', 'se'];
            setDraggingCorner(cornerNames[ci]);
            resizeStartRef.current = { x: img.x, y: img.y, width: img.width, height: img.height };
            dragAnchorRef.current = { x, y };
            return;
          }
        }
      }

      // Check if within rotated image bounds (for any image, not just selected)
      if (pointInRotatedRect(x, y, img)) {
        // Bring the clicked image to the front
        setImages((prevImages) => {
          const clickedImage = prevImages.find((item) => item.id === img.id);
          const otherImages = prevImages.filter((item) => item.id !== img.id);
          return [...otherImages, clickedImage];
        });
        setSelectedId(img.id);
        setDraggingId(img.id);
        setDraggingType('move');
        setDragStart({ x, y }); // Still need this for initial reference
        initialImageXRef.current = img.x; // Store initial image x
        initialImageYRef.current = img.y; // Store initial image y
        found = true;
        break;
      }
    }

    if (!found) {
      setSelectedId(null);
    }
  }, [effectiveScale, images, selectedId, dynamicHandleSize]);

  // Handle canvas mouse move (throttled)
  const handleCanvasMouseMove = useCallback((e) => {
    if (!draggingId || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling on touch

    const now = Date.now();
    const throttleMs = isMobile ? 24 : 16;
    if (now - lastMoveTimeRef.current < throttleMs) return;
    lastMoveTimeRef.current = now;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getEventCoords(e);
    const x = (clientX - rect.left) / effectiveScale;
    const y = (clientY - rect.top) / effectiveScale;

    // Find the image being dragged in the mutable ref
    const currentImages = imagesRef.current;
    const imgIndex = currentImages.findIndex((img) => img.id === draggingId);
    if (imgIndex === -1) return;

    const img = currentImages[imgIndex];
    let updatedImg = { ...img };

    if (draggingType === 'move') {
      // Calculate new position based on initial image position and total pointer displacement
      const newX = initialImageXRef.current + (x - dragStart.x);
      const newY = initialImageYRef.current + (y - dragStart.y);

      // Allow image to move partially off-screen
      const constrainedX = Math.max(-img.width, Math.min(newX, paperSize.width));
      const constrainedY = Math.max(-img.height, Math.min(newY, paperSize.height));

      updatedImg.x = constrainedX;
      updatedImg.y = constrainedY;
    } else if (draggingType === 'rotate') {
      const centerX = img.x + img.width / 2;
      const centerY = img.y + img.height / 2;
      const start = rotateStartRef.current;
      const initial = initialRotationRef.current || 0;
      const current = Math.atan2(y - centerY, x - centerX);
      const deltaDeg = (current - start) * (180 / Math.PI);
      const newRot = initial + deltaDeg;
      updatedImg.rotation = Math.round(newRot);
    } else if (draggingType === 'resize') {
      const corner = draggingCorner || 'se';
      const start = resizeStartRef.current || { x: img.x, y: img.y, width: img.width, height: img.height };
      const anchor = dragAnchorRef.current || { x: dragStart.x, y: dragStart.y };
      const dx = x - anchor.x;
      const dy = y - anchor.y;
      const aspect = start.width / start.height;
      let newWidth = start.width;
      let newHeight = start.height;
      let newX = start.x;
      let newY = start.y;

      if (corner === 'se') {
        newWidth = Math.max(50, start.width + dx);
        newHeight = newWidth / aspect;
      } else if (corner === 'sw') {
        newWidth = Math.max(50, start.width - dx);
        newHeight = newWidth / aspect;
        newX = start.x + (start.width - newWidth);
      } else if (corner === 'ne') {
        newWidth = Math.max(50, start.width + dx);
        newHeight = newWidth / aspect;
        newY = start.y + (start.height - newHeight);
      } else if (corner === 'nw') {
        newWidth = Math.max(50, start.width - dx);
        newHeight = newWidth / aspect;
        newX = start.x + (start.width - newWidth);
        newY = start.y + (start.height - newHeight);
      }

      // Constrain within paper
      let constrainedX = Math.max(0, Math.min(newX, paperSize.width - newWidth));
      let constrainedY = Math.max(0, Math.min(newY, paperSize.height - newHeight));

      updatedImg.x = constrainedX;
      updatedImg.y = constrainedY;
      updatedImg.width = newWidth;
      updatedImg.height = newHeight;
    }
    
    // Update the mutable ref directly
    currentImages[imgIndex] = updatedImg;

    // Redraw the canvas immediately
    drawCanvas(currentImages, selectedId, paperSize);
  }, [draggingId, effectiveScale, dragStart, paperSize, drawCanvas, isMobile]);

  const handleCanvasMouseUp = useCallback(() => {
    setDraggingId(null);
    setDraggingType(null);
    setDraggingCorner(null);
    resizeStartRef.current = null;
    rotateStartRef.current = 0;
    initialRotationRef.current = 0;
    dragAnchorRef.current = { x: 0, y: 0 };
    // Officially update React state with the final positions after drag ends
    setImages([...imagesRef.current]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e) => handleCanvasMouseDown(e);
    const handleTouchMove = (e) => handleCanvasMouseMove(e);
    const handleTouchEnd = (e) => handleCanvasMouseUp(e);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp]);

  const handleDelete = () => {
    setImages((prev) => prev.filter((img) => img.id !== selectedId));
    setSelectedId(null);
  };

  const handleRotate = () => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === selectedId) {
          return { ...img, rotation: (img.rotation + 90) % 360 };
        }
        return img;
      })
    );
  };

  const handleResize = (delta) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === selectedId) {
          const aspect = img.width / img.height;
          const newWidth = Math.max(50, Math.min(img.width + delta, paperSize.width - img.x));
          const newHeight = newWidth / aspect;
          return { ...img, width: newWidth, height: newHeight };
        }
        return img;
      })
    );
  };
  
  const buildExportCanvas = useCallback((imagesToRender) => {
    const exportCanvas = document.createElement('canvas');
    const exportSize = A4_PIXELS_EXPORT[orientation];
    const scale = EXPORT_DPI / EDITOR_DPI;
    const exportCtx = exportCanvas.getContext('2d');

    exportCanvas.width = exportSize.width;
    exportCanvas.height = exportSize.height;

    exportCtx.fillStyle = 'white';
    exportCtx.fillRect(0, 0, exportSize.width, exportSize.height);
    exportCtx.strokeStyle = '#ddd';
    exportCtx.lineWidth = 2 * scale;
    exportCtx.strokeRect(0, 0, exportSize.width, exportSize.height);

    imagesToRender.forEach((img) => {
      const width = img.width * scale;
      const height = img.height * scale;
      const x = img.x * scale;
      const y = img.y * scale;

      exportCtx.save();
      exportCtx.translate(x + width / 2, y + height / 2);
      exportCtx.rotate((img.rotation * Math.PI) / 180);
      exportCtx.drawImage(img.imageObj, -width / 2, -height / 2, width, height);
      exportCtx.restore();
    });

    return exportCanvas;
  }, [orientation]);

  const handleDownload = (format) => {
    if (!images.length) return;

    const previousSelectedId = selectedId;
    setSelectedId(null);

    // Snapshot current geometry so export is deterministic and never includes UI selection overlays.
    const imagesSnapshot = images.map((img) => ({ ...img }));
    const exportCanvas = buildExportCanvas(imagesSnapshot);

    if (format === 'png' || format === 'jpg') {
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality = format === 'jpg' ? 0.95 : 1;
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          setSelectedId(previousSelectedId);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `collage.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSelectedId(previousSelectedId);
      }, mimeType, quality);
      return;
    }

    if (format === 'pdf') {
      const pdf = new jsPDF({
        orientation: orientation === 'landscape' ? 'l' : 'p',
        unit: 'mm',
        format: 'a4',
      });
      const imgData = exportCanvas.toDataURL('image/png');
      const pageWidth = orientation === 'landscape' ? 297 : 210;
      const pageHeight = orientation === 'landscape' ? 210 : 297;
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save('collage.pdf');
      setSelectedId(previousSelectedId);
    }
  };

  // Z-index manipulation functions
  const bringToFront = () => {
    if (!selectedId) return;
    setImages((prevImages) => {
      const selectedImage = prevImages.find((img) => img.id === selectedId);
      const otherImages = prevImages.filter((img) => img.id !== selectedId);
      return [...otherImages, selectedImage];
    });
  };

  const sendToBack = () => {
    if (!selectedId) return;
    setImages((prevImages) => {
      const selectedImage = prevImages.find((img) => img.id === selectedId);
      const otherImages = prevImages.filter((img) => img.id !== selectedId);
      return [selectedImage, ...otherImages];
    });
  };

  const bringForward = () => {
    if (!selectedId) return;
    setImages((prevImages) => {
      const index = prevImages.findIndex((img) => img.id === selectedId);
      if (index === -1 || index === prevImages.length - 1) return prevImages; // Already at front or not found
      const newImages = [...prevImages];
      const [movedImage] = newImages.splice(index, 1);
      newImages.splice(index + 1, 0, movedImage);
      return newImages;
    });
  };

  const sendBackward = () => {
    if (!selectedId) return;
    setImages((prevImages) => {
      const index = prevImages.findIndex((img) => img.id === selectedId);
      if (index === -1 || index === 0) return prevImages; // Already at back or not found
      const newImages = [...prevImages];
      const [movedImage] = newImages.splice(index, 1);
      newImages.splice(index - 1, 0, movedImage);
      return newImages;
    });
  };


  return (
    <div style={{ minHeight: '100vh', padding: '10px', backgroundColor: '#f5f5f5' }}>
      <Card className="shadow-sm h-100" style={{ minHeight: '100vh' }}>
        <Card.Header className="bg-light p-2 flex-shrink-0">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">Collage Print</h5>
            <Form.Select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              style={{ width: '150px' }}
              size="sm"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </Form.Select>
          </div>
        </Card.Header>

                  <Card.Body
                    className="p-2 flex-grow-1"
                    style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}
                  >          {/* Left Sidebar - Controls */}
          <div
            style={{
              width: isMobile ? '100%' : '280px',
              display: 'flex',
              flexDirection: 'column',
              gap: controlSpacing,
              backgroundColor: '#fafafa',
              padding: isMobile ? '12px' : '15px',
              borderRadius: '4px',
              overflowY: 'auto',
              fontSize: controlFontSize,
            }}
          >
            <h6 style={{ marginBottom: '10px', marginTop: 0, fontSize: controlFontSize }}>Controls</h6>

            <div>
              <label style={{ fontSize: controlFontSize, marginBottom: '5px', display: 'block' }}>Upload Images</label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                size="sm"
              />
            </div>

            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleAutoArrange}
              disabled={images.length === 0}
              className="w-100"
            >
              Auto Arrange
            </Button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: controlSpacing }}>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={!selectedId}
                className="w-100"
              >
                🗑️ Delete
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={handleRotate}
                disabled={!selectedId}
                className="w-100"
              >
                ↻ Rotate
              </Button>
              <Button
                variant="info"
                size="sm"
                onClick={() => handleResize(20)}
                disabled={!selectedId}
                className="w-100"
              >
                ➕ Bigger
              </Button>
              <Button
                variant="info"
                size="sm"
                onClick={() => handleResize(-20)}
                disabled={!selectedId}
                className="w-100"
              >
                ➖ Smaller
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={bringToFront}
                disabled={!selectedId}
                className="w-100"
              >
                ⬆️ Bring to Front
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={bringForward}
                disabled={!selectedId}
                className="w-100"
              >
                🔼 Bring Forward
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={sendBackward}
                disabled={!selectedId}
                className="w-100"
              >
                🔽 Send Backward
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={sendToBack}
                disabled={!selectedId}
                className="w-100"
              >
                ⬇️ Send to Back
              </Button>
            </div>

            <DropdownButton
              id="download-dropdown"
              title="📥 Download"
              variant="primary"
              size="sm"
              className="w-100"
            >
              <Dropdown.Item onClick={() => handleDownload('png')}>
                PNG
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDownload('jpg')}>
                JPG
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDownload('pdf')}>
                PDF
              </Dropdown.Item>
            </DropdownButton>

              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: controlFontSize }}>Zoom</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setZoomPercent(Math.round(canvasScale * 100))}
                  >
                    Fit
                  </button>
                </label>
                <input
                  type="range"
                  min={10}
                  max={200}
                  value={zoomPercent}
                  onChange={(e) => setZoomPercent(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={zoomPercent}
                    onChange={(e) => setZoomPercent(Math.max(10, Math.min(200, Number(e.target.value) || 10)))}
                    style={{ width: '70px' }}
                  />
                  <span style={{ color: '#666' }}>%</span>
                  <div style={{ marginLeft: 'auto', color: '#666' }}>Effective: {Math.round(effectiveScale * 100)}%</div>
                </div>
              </div>

            <hr />
            <div style={{ fontSize: controlFontSize, color: '#666' }}>
              <p style={{ margin: '5px 0' }}><strong>Images:</strong> {images.length}</p>
              <p style={{ margin: '5px 0' }}><strong>Zoom:</strong> {zoomPercent}%</p>
              <p style={{ margin: '5px 0', fontSize: isMobile ? '13px' : '11px', color: '#888' }}>Selected: {selectedId ? 'Yes' : 'No'}</p>
            </div>

            <div style={{ fontSize: isMobile ? '13px' : '11px', color: '#999', marginTop: 'auto' }}>
              <p style={{ margin: '5px 0' }}>💡 <strong>Tips:</strong></p>
              <ul style={{ paddingLeft: '18px', margin: '5px 0' }}>
                <li>🟢 Green = Move</li>
                <li>🔵 Blue = Resize</li>
                <li>🟠 Orange = Rotate</li>
              </ul>
            </div>
          </div>

          {isMobile && selectedId && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', justifyContent: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
              <Button
                variant="light"
                onMouseDown={() => startContinuousAction('moveUp', moveImageByStep, 0, -5)}
                onMouseUp={stopContinuousAction}
                onMouseLeave={stopContinuousAction}
                onTouchStart={() => startContinuousAction('moveUp', moveImageByStep, 0, -5)}
                onTouchEnd={stopContinuousAction}
                style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveUp' ? '#e0e0e0' : undefined }}
              >
                ⬆️
              </Button>
              <Button
                variant="light"
                onMouseDown={() => startContinuousAction('moveLeft', moveImageByStep, -5, 0)}
                onMouseUp={stopContinuousAction}
                onMouseLeave={stopContinuousAction}
                onTouchStart={() => startContinuousAction('moveLeft', moveImageByStep, -5, 0)}
                onTouchEnd={stopContinuousAction}
                style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveLeft' ? '#e0e0e0' : undefined }}
              >
                ⬅️
              </Button>
              <Button
                variant="light"
                onMouseDown={() => startContinuousAction('moveRight', moveImageByStep, 5, 0)}
                onMouseUp={stopContinuousAction}
                onMouseLeave={stopContinuousAction}
                onTouchStart={() => startContinuousAction('moveRight', moveImageByStep, 5, 0)}
                onTouchEnd={stopContinuousAction}
                style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveRight' ? '#e0e0e0' : undefined }}
              >
                ➡️
              </Button>
              <Button
                variant="light"
                onMouseDown={() => startContinuousAction('moveDown', moveImageByStep, 0, 5)}
                onMouseUp={stopContinuousAction}
                onMouseLeave={stopContinuousAction}
                onTouchStart={() => startContinuousAction('moveDown', moveImageByStep, 0, 5)}
                onTouchEnd={stopContinuousAction}
                style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveDown' ? '#e0e0e0' : undefined }}
              >
                ⬇️
              </Button>
              <Button
                variant="light"
                onMouseDown={() => startContinuousAction('zoomOut', resizeImageByStep, -5)}
                onMouseUp={stopContinuousAction}
                onMouseLeave={stopContinuousAction}
                onTouchStart={() => startContinuousAction('zoomOut', resizeImageByStep, -5)}
                onTouchEnd={stopContinuousAction}
                style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'zoomOut' ? '#e0e0e0' : undefined }}
              >
                ➖
              </Button>
              <Button
                variant="light"
                onMouseDown={() => startContinuousAction('zoomIn', resizeImageByStep, 5)}
                onMouseUp={stopContinuousAction}
                onMouseLeave={stopContinuousAction}
                onTouchStart={() => startContinuousAction('zoomIn', resizeImageByStep, 5)}
                onTouchEnd={stopContinuousAction}
                style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'zoomIn' ? '#e0e0e0' : undefined }}
              >
                ➕
              </Button>
            </div>
          )}

          {/* Right Side - Canvas */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: '4px',
              overflow: 'auto',
              border: '1px solid #ddd',
              marginTop: isMobile ? '12px' : 0,
              padding: isMobile ? '12px' : '0'
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={(e) => { updateCursorOnHover(e); handleCanvasMouseMove(e); }}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={(e) => { canvasRef.current.style.cursor = 'default'; handleCanvasMouseUp(e); }}
              style={{
                width: `${paperSize.width * effectiveScale}px`,
                height: `${paperSize.height * effectiveScale}px`,
                backgroundColor: 'white',
                border: '2px solid #ddd',
                cursor: draggingType === 'rotate' ? 'grab' : draggingType === 'resize' ? 'pointer' : draggingType === 'move' ? 'grabbing' : 'pointer',
                display: 'block',
              }}
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default React.memo(CollagePrint);
