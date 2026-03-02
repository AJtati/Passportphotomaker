import { getDrawRotateOffset } from './helpers';

export const drawCollageCanvas = (
  canvas,
  currentImages,
  currentSelectedId,
  currentPaperSize,
  { dynamicHandleSize, draggingId, activeButtonId, isMobile }
) => {
  if (!canvas || !Array.isArray(currentImages)) return;

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

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, currentPaperSize.width, currentPaperSize.height);

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, currentPaperSize.width, currentPaperSize.height);

  currentImages.forEach((img) => {
    const isSelected = img.id === currentSelectedId;

    ctx.save();
    const cx = img.x + img.width / 2;
    const cy = img.y + img.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((img.rotation * Math.PI) / 180);
    const editorImageObj = img.editorImageObj || img.imageObj;
    ctx.drawImage(editorImageObj, -img.width / 2, -img.height / 2, img.width, img.height);

    if (isSelected && !(isMobile && isInteracting)) {
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);
      ctx.setLineDash([]);

      const handleSize = dynamicHandleSize;
      const hs = handleSize / 2;
      const localCorners = [
        { lx: -img.width / 2, ly: -img.height / 2 },
        { lx: img.width / 2, ly: -img.height / 2 },
        { lx: -img.width / 2, ly: img.height / 2 },
        { lx: img.width / 2, ly: img.height / 2 },
      ];

      localCorners.forEach((corner) => {
        ctx.fillStyle = '#0066ff';
        ctx.beginPath();
        ctx.arc(corner.lx, corner.ly, hs, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(corner.lx, corner.ly, Math.max(4, hs * 0.6), 0, Math.PI * 2);
        ctx.fill();
      });

      const rotateOffset = getDrawRotateOffset(handleSize);
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(0, -img.height / 2 - rotateOffset, hs, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = `${Math.max(10, hs)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↻', 0, -img.height / 2 - rotateOffset);

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
};
