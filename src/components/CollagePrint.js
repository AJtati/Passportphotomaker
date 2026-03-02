import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Form } from 'react-bootstrap';
import CollageCanvasStage from './collage/CollageCanvasStage';
import CollageMobileControls from './collage/CollageMobileControls';
import CollageSidebar from './collage/CollageSidebar';
import { A4_PIXELS_EDITOR } from './collage/constants';
import { downloadCollageDocument } from './collage/export';
import {
  autoArrangeImages,
  createEditorPreviewImage,
  getEventCoords,
  getHitRotateOffset,
  isLikelyImageFile,
  isPointInCircle,
  loadImageFromFile,
  localToWorld,
  pointInRotatedRect,
} from './collage/helpers';
import { drawCollageCanvas } from './collage/render';

const CollagePrint = () => {
  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [orientation, setOrientation] = useState('portrait');
  const [windowSize, setWindowSize] = useState({ width: 1024, height: 768 });
  const [draggingId, setDraggingId] = useState(null);
  const [draggingType, setDraggingType] = useState(null);
  const [draggingCorner, setDraggingCorner] = useState(null);
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

  const isMobile = windowSize.width <= 700;
  const sidebarWidth = isMobile ? 0 : 280;
  const availableWidth = Math.max(300, isMobile ? windowSize.width - 40 : windowSize.width - sidebarWidth - 40);
  const availableHeight = Math.max(300, isMobile ? windowSize.height - 180 : windowSize.height - 120);
  const scaleX = availableWidth / paperSize.width;
  const scaleY = availableHeight / paperSize.height;
  const canvasScale = Math.min(scaleX, scaleY, 1);
  const [zoomPercent, setZoomPercent] = useState(Math.round(canvasScale * 100));
  const effectiveScale = Math.max(0.1, Math.min(2, zoomPercent / 100));
  const controlFontSize = isMobile ? '14px' : '12px';
  const controlSpacing = isMobile ? '12px' : '8px';
  const dynamicHandleSize = Math.min(48, Math.max(18, 28 / effectiveScale));

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const drawCanvas = useCallback((currentImages, currentSelectedId, currentPaperSize) => {
    drawCollageCanvas(canvasRef.current, currentImages, currentSelectedId, currentPaperSize, {
      dynamicHandleSize,
      draggingId,
      activeButtonId,
      isMobile,
    });
  }, [activeButtonId, draggingId, dynamicHandleSize, isMobile]);

  const moveImageByStep = useCallback((dx, dy) => {
    if (!selectedId || !imagesRef.current || imagesRef.current.length === 0) return;

    const currentImages = imagesRef.current;
    const imgIndex = currentImages.findIndex((img) => img.id === selectedId);
    if (imgIndex === -1) return;

    const img = { ...currentImages[imgIndex] };
    img.x += dx;
    img.y += dy;
    img.x = Math.max(-img.width, Math.min(img.x, paperSize.width));
    img.y = Math.max(-img.height, Math.min(img.y, paperSize.height));

    currentImages[imgIndex] = img;
    drawCanvas(currentImages, selectedId, paperSize);
  }, [drawCanvas, paperSize, selectedId]);

  const resizeImageByStep = useCallback((delta) => {
    if (!selectedId || !imagesRef.current || imagesRef.current.length === 0) return;

    const currentImages = imagesRef.current;
    const imgIndex = currentImages.findIndex((img) => img.id === selectedId);
    if (imgIndex === -1) return;

    const img = { ...currentImages[imgIndex] };
    const aspect = img.imageObj.naturalWidth / img.imageObj.naturalHeight;

    let newWidth = img.width + delta;
    let newHeight = newWidth / aspect;

    newWidth = Math.max(50, newWidth);
    newHeight = newWidth / aspect;

    img.width = newWidth;
    img.height = newHeight;

    currentImages[imgIndex] = img;
    drawCanvas(currentImages, selectedId, paperSize);
  }, [drawCanvas, paperSize, selectedId]);

  const startContinuousAction = useCallback((buttonId, actionFn, ...args) => {
    setActiveButtonId(buttonId);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    if (resizeIntervalRef.current) clearInterval(resizeIntervalRef.current);

    const intervalRef = actionFn === moveImageByStep ? moveIntervalRef : resizeIntervalRef;
    actionFn(...args);
    intervalRef.current = setInterval(() => {
      actionFn(...args);
    }, 100);
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
    setImages([...imagesRef.current]);
  }, []);

  useEffect(() => {
    if (Array.isArray(images)) {
      drawCanvas(images, selectedId, paperSize);
    }
  }, [drawCanvas, images, paperSize, selectedId]);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const imageFiles = files.filter(isLikelyImageFile);
    if (!imageFiles.length) {
      event.target.value = '';
      return;
    }

    try {
      const loadedImages = await Promise.all(
        imageFiles.map(async (file, index) => {
          const imageObj = await loadImageFromFile(file);
          let editorImageObj = imageObj;
          try {
            editorImageObj = await createEditorPreviewImage(imageObj);
          } catch {
            editorImageObj = imageObj;
          }
          return {
            id: Date.now() + Math.random() + index,
            imageObj,
            editorImageObj,
            x: 0,
            y: 0,
            width: imageObj.naturalWidth,
            height: imageObj.naturalHeight,
            rotation: 0,
          };
        })
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

  const updateCursorOnHover = useCallback((event) => {
    if (!canvasRef.current || draggingId) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getEventCoords(event);
    const x = (clientX - rect.left) / effectiveScale;
    const y = (clientY - rect.top) / effectiveScale;

    let cursor = 'default';

    if (selectedId) {
      const img = images.find((item) => item.id === selectedId);
      if (img) {
        const rotateLocal = { lx: 0, ly: -img.height / 2 - getHitRotateOffset(dynamicHandleSize) };
        const rotateWorld = localToWorld(img, rotateLocal.lx, rotateLocal.ly);
        if (isPointInCircle(x, y, rotateWorld.x, rotateWorld.y, dynamicHandleSize / 2)) {
          cursor = 'grab';
        } else {
          const corners = [
            { lx: -img.width / 2, ly: -img.height / 2, cursor: 'nw-resize' },
            { lx: img.width / 2, ly: -img.height / 2, cursor: 'ne-resize' },
            { lx: -img.width / 2, ly: img.height / 2, cursor: 'sw-resize' },
            { lx: img.width / 2, ly: img.height / 2, cursor: 'se-resize' },
          ];
          for (let index = 0; index < corners.length; index++) {
            const corner = corners[index];
            const world = localToWorld(img, corner.lx, corner.ly);
            if (isPointInCircle(x, y, world.x, world.y, dynamicHandleSize / 2)) {
              cursor = corner.cursor;
              break;
            }
          }
          if (cursor === 'default' && isPointInCircle(x, y, img.x + img.width / 2, img.y + img.height / 2, 14)) {
            cursor = 'move';
          }
        }
      }
    }

    canvas.style.cursor = cursor;
  }, [draggingId, dynamicHandleSize, effectiveScale, images, selectedId]);

  const handleCanvasMouseDown = useCallback((event) => {
    if (!canvasRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getEventCoords(event);
    const x = (clientX - rect.left) / effectiveScale;
    const y = (clientY - rect.top) / effectiveScale;

    setDragStart({ x, y });

    let found = false;
    for (let index = images.length - 1; index >= 0; index--) {
      const img = images[index];
      const isCurrentlySelected = img.id === selectedId;

      if (isCurrentlySelected) {
        const rotateLocal = { lx: 0, ly: -img.height / 2 - getHitRotateOffset(dynamicHandleSize) };
        const rotateWorld = localToWorld(img, rotateLocal.lx, rotateLocal.ly);
        if (isPointInCircle(x, y, rotateWorld.x, rotateWorld.y, dynamicHandleSize / 2)) {
          setDraggingId(img.id);
          setDraggingType('rotate');
          rotateStartRef.current = Math.atan2(y - (img.y + img.height / 2), x - (img.x + img.width / 2));
          initialRotationRef.current = img.rotation;
          dragAnchorRef.current = { x, y };
          return;
        }

        if (isPointInCircle(x, y, img.x + img.width / 2, img.y + img.height / 2, 14)) {
          setDraggingId(img.id);
          setDraggingType('move');
          initialImageXRef.current = img.x;
          initialImageYRef.current = img.y;
          return;
        }

        const localCorners = [
          { lx: -img.width / 2, ly: -img.height / 2 },
          { lx: img.width / 2, ly: -img.height / 2 },
          { lx: -img.width / 2, ly: img.height / 2 },
          { lx: img.width / 2, ly: img.height / 2 },
        ];
        for (let cornerIndex = 0; cornerIndex < localCorners.length; cornerIndex++) {
          const localCorner = localCorners[cornerIndex];
          const world = localToWorld(img, localCorner.lx, localCorner.ly);
          if (isPointInCircle(x, y, world.x, world.y, dynamicHandleSize / 2)) {
            setDraggingId(img.id);
            setDraggingType('resize');
            const cornerNames = ['nw', 'ne', 'sw', 'se'];
            setDraggingCorner(cornerNames[cornerIndex]);
            resizeStartRef.current = { x: img.x, y: img.y, width: img.width, height: img.height };
            dragAnchorRef.current = { x, y };
            return;
          }
        }
      }

      if (pointInRotatedRect(x, y, img)) {
        setImages((prevImages) => {
          const clickedImage = prevImages.find((item) => item.id === img.id);
          const otherImages = prevImages.filter((item) => item.id !== img.id);
          return [...otherImages, clickedImage];
        });
        setSelectedId(img.id);
        setDraggingId(img.id);
        setDraggingType('move');
        setDragStart({ x, y });
        initialImageXRef.current = img.x;
        initialImageYRef.current = img.y;
        found = true;
        break;
      }
    }

    if (!found) {
      setSelectedId(null);
    }
  }, [dynamicHandleSize, effectiveScale, images, selectedId]);

  const handleCanvasMouseMove = useCallback((event) => {
    if (!draggingId || !canvasRef.current) return;
    event.preventDefault();

    const now = Date.now();
    const throttleMs = isMobile ? 24 : 16;
    if (now - lastMoveTimeRef.current < throttleMs) return;
    lastMoveTimeRef.current = now;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getEventCoords(event);
    const x = (clientX - rect.left) / effectiveScale;
    const y = (clientY - rect.top) / effectiveScale;

    const currentImages = imagesRef.current;
    const imgIndex = currentImages.findIndex((img) => img.id === draggingId);
    if (imgIndex === -1) return;

    const img = currentImages[imgIndex];
    const updatedImg = { ...img };

    if (draggingType === 'move') {
      const newX = initialImageXRef.current + (x - dragStart.x);
      const newY = initialImageYRef.current + (y - dragStart.y);

      updatedImg.x = Math.max(-img.width, Math.min(newX, paperSize.width));
      updatedImg.y = Math.max(-img.height, Math.min(newY, paperSize.height));
    } else if (draggingType === 'rotate') {
      const centerX = img.x + img.width / 2;
      const centerY = img.y + img.height / 2;
      const start = rotateStartRef.current;
      const initial = initialRotationRef.current || 0;
      const current = Math.atan2(y - centerY, x - centerX);
      const deltaDeg = (current - start) * (180 / Math.PI);
      updatedImg.rotation = Math.round(initial + deltaDeg);
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

      updatedImg.x = Math.max(0, Math.min(newX, paperSize.width - newWidth));
      updatedImg.y = Math.max(0, Math.min(newY, paperSize.height - newHeight));
      updatedImg.width = newWidth;
      updatedImg.height = newHeight;
    }

    currentImages[imgIndex] = updatedImg;
    drawCanvas(currentImages, selectedId, paperSize);
  }, [dragStart, draggingCorner, draggingId, draggingType, drawCanvas, effectiveScale, isMobile, paperSize, selectedId]);

  const handleCanvasMouseUp = useCallback(() => {
    setDraggingId(null);
    setDraggingType(null);
    setDraggingCorner(null);
    resizeStartRef.current = null;
    rotateStartRef.current = 0;
    initialRotationRef.current = 0;
    dragAnchorRef.current = { x: 0, y: 0 };
    setImages([...imagesRef.current]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (event) => handleCanvasMouseDown(event);
    const handleTouchMove = (event) => handleCanvasMouseMove(event);
    const handleTouchEnd = (event) => handleCanvasMouseUp(event);

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
      prev.map((img) => (img.id === selectedId ? { ...img, rotation: (img.rotation + 90) % 360 } : img))
    );
  };

  const handleResize = (delta) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== selectedId) return img;
        const aspect = img.width / img.height;
        const newWidth = Math.max(50, Math.min(img.width + delta, paperSize.width - img.x));
        const newHeight = newWidth / aspect;
        return { ...img, width: newWidth, height: newHeight };
      })
    );
  };

  const handleDownload = async (format) => {
    if (!images.length) return;

    const previousSelectedId = selectedId;
    setSelectedId(null);

    const imagesSnapshot = images.map((img) => ({ ...img }));

    try {
      await downloadCollageDocument(imagesSnapshot, orientation, format);
    } catch (error) {
      alert(`Download failed: ${error.message}`);
    } finally {
      setSelectedId(previousSelectedId);
    }
  };

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
      if (index === -1 || index === prevImages.length - 1) return prevImages;
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
      if (index === -1 || index === 0) return prevImages;
      const newImages = [...prevImages];
      const [movedImage] = newImages.splice(index, 1);
      newImages.splice(index - 1, 0, movedImage);
      return newImages;
    });
  };

  const handlePointerMove = useCallback((event) => {
    updateCursorOnHover(event);
    handleCanvasMouseMove(event);
  }, [handleCanvasMouseMove, updateCursorOnHover]);

  return (
    <div style={{ minHeight: '100vh', padding: '10px', backgroundColor: 'var(--app-bg)', color: 'var(--text)' }}>
      <Card className="shadow-sm h-100" style={{ minHeight: '100vh' }}>
        <Card.Header className="p-2 flex-shrink-0" style={{ backgroundColor: 'var(--surface-subtle)' }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">Collage Print</h5>
            <Form.Select
              value={orientation}
              onChange={(event) => setOrientation(event.target.value)}
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
        >
          <CollageSidebar
            isMobile={isMobile}
            controlSpacing={controlSpacing}
            controlFontSize={controlFontSize}
            onFileChange={handleFileChange}
            onAutoArrange={handleAutoArrange}
            imagesCount={images.length}
            selectedId={selectedId}
            onDelete={handleDelete}
            onRotate={handleRotate}
            onResize={handleResize}
            onBringToFront={bringToFront}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
            onSendToBack={sendToBack}
            onDownload={handleDownload}
            zoomPercent={zoomPercent}
            onZoomPercentChange={setZoomPercent}
            canvasScale={canvasScale}
            effectiveScale={effectiveScale}
          />

          {isMobile && (
            <CollageMobileControls
              selectedId={selectedId}
              activeButtonId={activeButtonId}
              startContinuousAction={startContinuousAction}
              stopContinuousAction={stopContinuousAction}
              moveImageByStep={moveImageByStep}
              resizeImageByStep={resizeImageByStep}
            />
          )}

          <CollageCanvasStage
            containerRef={containerRef}
            canvasRef={canvasRef}
            isMobile={isMobile}
            paperSize={paperSize}
            effectiveScale={effectiveScale}
            draggingType={draggingType}
            handleCanvasMouseDown={handleCanvasMouseDown}
            handlePointerMove={handlePointerMove}
            handleCanvasMouseUp={handleCanvasMouseUp}
          />
        </Card.Body>
      </Card>
    </div>
  );
};

export default React.memo(CollagePrint);
