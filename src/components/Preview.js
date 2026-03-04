import React, { useRef, useEffect, forwardRef } from 'react';
import { Card } from 'react-bootstrap';
import { convertToPixels } from '../utils/dimensions';

const drawCutGuides = (ctx, { cols, rows, spacing, startX, startY, photoWidthPx, photoHeightPx, gridWidth, gridHeight, dpi }) => {
  if (cols <= 1 && rows <= 1) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = '#6c757d';
  ctx.lineWidth = Math.max(1, Math.round(dpi / 300));
  ctx.setLineDash([
    Math.max(4, Math.round(dpi / 50)),
    Math.max(3, Math.round(dpi / 75)),
  ]);

  for (let col = 0; col < cols - 1; col += 1) {
    const guideX = startX + (col + 1) * photoWidthPx + col * spacing + (spacing / 2);
    ctx.beginPath();
    ctx.moveTo(guideX, startY);
    ctx.lineTo(guideX, startY + gridHeight);
    ctx.stroke();
  }

  for (let row = 0; row < rows - 1; row += 1) {
    const guideY = startY + (row + 1) * photoHeightPx + row * spacing + (spacing / 2);
    ctx.beginPath();
    ctx.moveTo(startX, guideY);
    ctx.lineTo(startX + gridWidth, guideY);
    ctx.stroke();
  }

  ctx.restore();
};

const Preview = forwardRef(({ paper, passport, croppedImage, addBorder, dpi }, ref) => {
  const photoPlaceholder = useRef(null);

  useEffect(() => {
    if (croppedImage) {
      const img = new Image();
      img.src = croppedImage;
      img.onload = () => {
        photoPlaceholder.current = img;
        drawCanvas();
      };
    } else {
      photoPlaceholder.current = null;
      drawCanvas();
    }
  }, [croppedImage]);

  const drawCanvas = () => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const paperWidthPx = convertToPixels(paper.width, paper.unit, dpi);
    const paperHeightPx = convertToPixels(paper.height, paper.unit, dpi);
    const photoWidthPx = convertToPixels(passport.width, passport.unit, dpi);
    const photoHeightPx = convertToPixels(passport.height, passport.unit, dpi);

    if (paperWidthPx <= 0 || paperHeightPx <= 0 || photoWidthPx <= 0 || photoHeightPx <= 0) {
      canvas.width = Math.max(1, paperWidthPx || 1);
      canvas.height = Math.max(1, paperHeightPx || 1);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#dc3545';
      ctx.textAlign = 'center';
      ctx.font = `${Math.min(28, canvas.width / 12)}px Arial`;
      ctx.fillText('Enter valid positive dimensions', canvas.width / 2, canvas.height / 2);
      return;
    }

    canvas.width = paperWidthPx;
    canvas.height = paperHeightPx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fixedMargin = convertToPixels(5, 'mm', dpi);
    const spacing = convertToPixels(2, 'mm', dpi);
    
    const availableWidth = paperWidthPx - (fixedMargin * 2);
    const availableHeight = paperHeightPx - (fixedMargin * 2);

    const cols = Math.floor((availableWidth + spacing) / (photoWidthPx + spacing));
    const rows = Math.floor((availableHeight + spacing) / (photoHeightPx + spacing));

    if (!croppedImage) {
        ctx.fillStyle = '#6c757d';
        ctx.textAlign = 'center';
        ctx.font = `${Math.min(48, paperWidthPx / 10)}px Arial`;
        ctx.fillText('Complete all steps to see preview', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    if (cols <= 0 || rows <= 0) {
      ctx.fillStyle = '#dc3545';
      ctx.textAlign = 'center';
      ctx.font = `${Math.min(48, paperWidthPx / 10)}px Arial`;
      ctx.fillText('Paper size too small for one photo', canvas.width / 2, canvas.height / 2);
      return;
    }

    const gridWidth = (cols * photoWidthPx) + ((cols - 1) * spacing);
    const gridHeight = (rows * photoHeightPx) + ((rows - 1) * spacing);

    const startX = fixedMargin + (availableWidth - gridWidth) / 2;
    const startY = fixedMargin + (availableHeight - gridHeight) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (photoWidthPx + spacing);
        const y = startY + r * (photoHeightPx + spacing);
        if (photoPlaceholder.current) {
          ctx.drawImage(photoPlaceholder.current, x, y, photoWidthPx, photoHeightPx);
          
          // --- Draw Border if enabled ---
          if (addBorder) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2; // 2px border at 300 DPI is very thin
            ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
          }
        }
      }
    }

    drawCutGuides(ctx, {
      cols,
      rows,
      spacing,
      startX,
      startY,
      photoWidthPx,
      photoHeightPx,
      gridWidth,
      gridHeight,
      dpi,
    });
  };

  useEffect(() => {
    drawCanvas();
  }, [paper, passport, dpi, croppedImage, addBorder, ref]);

  return (
    <Card>
      <Card.Body>
        <Card.Title>Step 3: Preview & Download</Card.Title>
        <p>A real-time preview of the final print layout with dashed cut guides between photos.</p>
        <div className="text-center themed-canvas-wrap" style={{ padding: '1rem', overflowX: 'auto' }}>
          <canvas ref={ref} style={{ width: '100%', backgroundColor: 'white' }} />
        </div>
      </Card.Body>
    </Card>
  );
});

export default Preview;
