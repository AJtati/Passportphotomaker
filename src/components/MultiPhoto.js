import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Form, Button, DropdownButton, Dropdown, Badge } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import { saveCanvasImage, savePdf } from '../utils/fileDownload';

const DPI = 300;
// Swapped for Landscape orientation
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const PHOTO_WIDTH_IN = 6;
const PHOTO_HEIGHT_IN = 4;
const MAX_PHOTOS = 4;

const BORDER_STYLES = [
  { value: 'none', label: 'No Border' },
  { value: 'single', label: 'Single Line' },
  { value: 'thick', label: 'Thick Line' },
  { value: 'double', label: 'Double Line' },
];

const convertToPixels = (value, unit) => {
  if (unit === 'in') return value * DPI;
  if (unit === 'mm') return (value / 25.4) * DPI;
  return value;
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

/**
 * Draws image with optional white margin + border around the image itself.
 */
function drawContainedImage(ctx, image, slotX, slotY, slotWidth, slotHeight, rotation, borderStyle) {
  ctx.save(); // Save the current state
  
  // Translate to the center of the slot for rotation
  ctx.translate(slotX + slotWidth / 2, slotY + slotHeight / 2);
  ctx.rotate(rotation * Math.PI / 180);

  const imgAspectRatio = image.naturalWidth / image.naturalHeight;
  
  // When rotated 90 or 270, the effective slot dimensions for the image are swapped
  const isSideways = rotation === 90 || rotation === 270;
  const effectiveSlotWidth = isSideways ? slotHeight : slotWidth;
  const effectiveSlotHeight = isSideways ? slotWidth : slotHeight;
  
  const hasFrame = borderStyle !== 'none';
  const outerInset = hasFrame ? 14 : 0;
  const imageMatPadding = hasFrame ? 10 : 0;
  const frameWidthLimit = Math.max(1, effectiveSlotWidth - outerInset * 2);
  const frameHeightLimit = Math.max(1, effectiveSlotHeight - outerInset * 2);
  const imageWidthLimit = Math.max(1, frameWidthLimit - imageMatPadding * 2);
  const imageHeightLimit = Math.max(1, frameHeightLimit - imageMatPadding * 2);
  const limitedSlotAspectRatio = imageWidthLimit / imageHeightLimit;

  let drawWidth, drawHeight;

  if (imgAspectRatio > limitedSlotAspectRatio) { // Image is wider than the slot
    drawWidth = imageWidthLimit;
    drawHeight = imageWidthLimit / imgAspectRatio;
  } else { // Image is taller than or same aspect as the slot
    drawHeight = imageHeightLimit;
    drawWidth = imageHeightLimit * imgAspectRatio;
  }

  const frameWidth = drawWidth + imageMatPadding * 2;
  const frameHeight = drawHeight + imageMatPadding * 2;
  const frameX = -frameWidth / 2;
  const frameY = -frameHeight / 2;

  if (hasFrame) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frameX, frameY, frameWidth, frameHeight);
    drawPhotoFrame(ctx, frameX, frameY, frameWidth, frameHeight, borderStyle);
  }

  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  
  ctx.restore(); // Restore the state
}


const MultiPhoto = () => {
  const [photos, setPhotos] = useState([]);
  const [borderStyle, setBorderStyle] = useState('single');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    drawCanvas();
  }, [photos, borderStyle]);

  const triggerFilePicker = () => {
    if (photos.length >= MAX_PHOTOS) return;
    fileInputRef.current?.click();
  };

  const handleImageUpload = (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          setPhotos((currentPhotos) => {
            if (currentPhotos.length >= MAX_PHOTOS) {
              return currentPhotos;
            }
            return [
              ...currentPhotos,
              {
                id: `${Date.now()}-${Math.random()}`,
                src: event.target.result,
                image: img,
                rotation: 0,
                name: file.name,
              },
            ];
          });
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRotate = (id) => {
    setPhotos((currentPhotos) =>
      currentPhotos.map((photo) =>
        photo.id === id ? { ...photo, rotation: (photo.rotation + 90) % 360 } : photo
      )
    );
  };

  const handleRemove = (id) => {
    setPhotos((currentPhotos) => currentPhotos.filter((photo) => photo.id !== id));
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const paperWidthPx = convertToPixels(A4_WIDTH_MM, 'mm');
    const paperHeightPx = convertToPixels(A4_HEIGHT_MM, 'mm');
    canvas.width = paperWidthPx;
    canvas.height = paperHeightPx;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const photoWidthPx = convertToPixels(PHOTO_WIDTH_IN, 'in');
    const photoHeightPx = convertToPixels(PHOTO_HEIGHT_IN, 'in');

    const activeCount = photos.length;
    let positions;

    if (activeCount === 2) {
      // Side-by-side for two photos
      const marginX = (paperWidthPx - 2 * photoWidthPx) / 3;
      const marginY = (paperHeightPx - photoHeightPx) / 2;
      positions = [
        { x: marginX, y: marginY, w: photoWidthPx, h: photoHeightPx },
        { x: marginX * 2 + photoWidthPx, y: marginY, w: photoWidthPx, h: photoHeightPx },
      ];
    } else {
      // Default 2x2 grid
      const marginX = (paperWidthPx - 2 * photoWidthPx) / 3;
      const marginY = (paperHeightPx - 2 * photoHeightPx) / 3;
      positions = [
        { x: marginX, y: marginY, w: photoWidthPx, h: photoHeightPx },
        { x: marginX * 2 + photoWidthPx, y: marginY, w: photoWidthPx, h: photoHeightPx },
        { x: marginX, y: marginY * 2 + photoHeightPx, w: photoWidthPx, h: photoHeightPx },
        { x: marginX * 2 + photoWidthPx, y: marginY * 2 + photoHeightPx, w: photoWidthPx, h: photoHeightPx },
      ];
    }

    positions.forEach((pos, index) => {
      const photo = photos[index];
      ctx.strokeStyle = '#ced4da';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      if (photo?.image?.complete) {
        drawContainedImage(ctx, photo.image, pos.x, pos.y, pos.w, pos.h, photo.rotation, borderStyle);
      } else {
        ctx.fillStyle = '#6c757d';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '40px Arial';
        ctx.fillText(`Photo ${index + 1}`, pos.x + pos.w / 2, pos.y + pos.h / 2);
      }
    });
  };

  const handleDownload = async (format) => {
    const canvas = canvasRef.current;
    if (!canvas) { alert("Preview canvas not ready."); return; }
    try {
      if (format === 'PDF') {
        const pdf = new jsPDF('l', 'mm', [A4_WIDTH_MM, A4_HEIGHT_MM]);
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
        await savePdf(pdf, 'multi-photo_A4_landscape.pdf');
      } else {
        await saveCanvasImage(canvas, format, `multi-photo_A4_landscape.${format.toLowerCase()}`, 1.0);
      }
    } catch (error) {
      alert(`Download failed: ${error.message}`);
    }
  };

  return (
    <Row>
      <Col md={5}>
        <Card>
          <Card.Body>
            <Card.Title>Upload Your Photos</Card.Title>
            <p className="mb-3">Select one or multiple photos (Ctrl-select on Windows), then keep adding until you reach 4 photos. Layout stays 6x4 per photo on A4 landscape.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg, image/png"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                handleImageUpload(e.target.files);
                e.target.value = '';
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
              <Form.Select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)}>
                {BORDER_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <div className="multi-photo-sidebar">
              {[...Array(MAX_PHOTOS)].map((_, index) => {
                const photo = photos[index];
                return (
                  <div key={photo?.id || `empty-${index}`} className={`multi-photo-item ${photo ? 'has-image' : ''}`}>
                    <div className="multi-photo-preview-wrap">
                      {photo ? (
                        <img src={photo.src} alt={`Photo ${index + 1}`} className="multi-photo-preview-img" />
                      ) : (
                        <span className="multi-photo-empty-text">Photo {index + 1}</span>
                      )}
                    </div>
                    <div className="multi-photo-meta">
                      <div className="small multi-photo-file-name" title={photo?.name || ''}>{photo?.name || `Empty slot ${index + 1}`}</div>
                      {photo && (
                        <div className="multi-photo-actions mt-2">
                          <Button variant="outline-secondary" size="sm" onClick={() => handleRotate(photo.id)}>
                            Rotate ({photo.rotation}deg)
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleRemove(photo.id)}>
                            Remove
                          </Button>
                        </div>
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
            <Card.Title>A4 Landscape Preview</Card.Title>
            <div className="text-center themed-canvas-wrap" style={{ padding: '1rem', overflowX: 'auto' }}>
              <canvas ref={canvasRef} style={{ width: '100%', backgroundColor: 'white' }} />
            </div>
          </Card.Body>
        </Card>
        <div className="d-grid gap-2 mt-3">
          <DropdownButton
            id="dropdown-download-multi-button" title="Download A4 Sheet" size="lg"
            variant="primary" disabled={photos.length === 0}
          >
            <Dropdown.Item onClick={() => handleDownload('PDF')}>Download as PDF</Dropdown.Item>
            <Dropdown.Item onClick={() => handleDownload('JPG')}>Download as JPG</Dropdown.Item>
            <Dropdown.Item onClick={() => handleDownload('PNG')}>Download as PNG</Dropdown.Item>
          </DropdownButton>
        </div>
      </Col>
    </Row>
  );
};

export default MultiPhoto;
