import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Form, Button, DropdownButton, Dropdown } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import { saveCanvasImage, savePdf } from '../utils/fileDownload';

const DPI = 300;
// Swapped for Landscape orientation
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const PHOTO_WIDTH_IN = 6;
const PHOTO_HEIGHT_IN = 4;

const convertToPixels = (value, unit) => {
  if (unit === 'in') return value * DPI;
  if (unit === 'mm') return (value / 25.4) * DPI;
  return value;
};

/**
 * Draws an image inside a given slot, preserving aspect ratio (background-size: contain).
 */
function drawContainedImage(ctx, image, slotX, slotY, slotWidth, slotHeight, rotation) {
  ctx.save(); // Save the current state
  
  // Translate to the center of the slot for rotation
  ctx.translate(slotX + slotWidth / 2, slotY + slotHeight / 2);
  ctx.rotate(rotation * Math.PI / 180);

  const imgAspectRatio = image.naturalWidth / image.naturalHeight;
  
  // When rotated 90 or 270, the effective slot dimensions for the image are swapped
  const isSideways = rotation === 90 || rotation === 270;
  const effectiveSlotWidth = isSideways ? slotHeight : slotWidth;
  const effectiveSlotHeight = isSideways ? slotWidth : slotHeight;
  
  const slotAspectRatio = effectiveSlotWidth / effectiveSlotHeight;

  let drawWidth, drawHeight;

  if (imgAspectRatio > slotAspectRatio) { // Image is wider than the slot
    drawWidth = effectiveSlotWidth;
    drawHeight = effectiveSlotWidth / imgAspectRatio;
  } else { // Image is taller than or same aspect as the slot
    drawHeight = effectiveSlotHeight;
    drawWidth = effectiveSlotHeight * imgAspectRatio;
  }

  // Draw the image centered in the rotated context
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  
  ctx.restore(); // Restore the state
}


const MultiPhoto = () => {
  const [images, setImages] = useState([null, null, null, null]);
  const [imageObjects, setImageObjects] = useState([null, null, null, null]);
  const [rotations, setRotations] = useState([0, 0, 0, 0]);
  const canvasRef = useRef(null);

  useEffect(() => {
    let allImagesLoaded = true;
    const newImageObjects = [...imageObjects];
  
    images.forEach((imgData, index) => {
      if (imgData && (!imageObjects[index] || imageObjects[index].src !== imgData)) {
        const img = new Image();
        img.src = imgData;
        newImageObjects[index] = img; 
        allImagesLoaded = false; 
        img.onload = () => {
          setImageObjects(currentObjs => {
            const finalObjs = [...currentObjs];
            finalObjs[index] = img;
            if (finalObjs.every((obj, i) => !images[i] || obj?.complete)) {
              drawCanvas(finalObjs, rotations);
            }
            return finalObjs;
          });
        };
      } else if (!imgData && imageObjects[index]) {
        newImageObjects[index] = null;
      }
    });
  
    if (allImagesLoaded) {
      drawCanvas(newImageObjects, rotations);
    }
  }, [images, rotations]);

  const handleImageUpload = (file, index) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImages = [...images];
        newImages[index] = event.target.result;
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = (index) => {
    const newRotations = [...rotations];
    newRotations[index] = (newRotations[index] + 90) % 360;
    setRotations(newRotations);
  };

  const drawCanvas = (currentImages, currentRotations) => {
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
    
    const activeImages = currentImages.filter(img => img && img.complete);
    let positions;

    if (activeImages.length === 2) {
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
      ctx.strokeStyle = '#ced4da';
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      if (currentImages[index] && currentImages[index].complete) {
        drawContainedImage(ctx, currentImages[index], pos.x, pos.y, pos.w, pos.h, currentRotations[index]);
      } else {
        ctx.fillStyle = '#6c757d';
        ctx.textAlign = 'center';
        ctx.font = '48px Arial';
        ctx.fillText(`Image ${index + 1}`, pos.x + pos.w / 2, pos.y + pos.h / 2);
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
            <p>Upload up to four photos. They will be arranged on a landscape A4 page. Each photo fits in a 6x4 inch slot. If you upload only two, they will be placed side-by-side.</p>
            {[...Array(4)].map((_, index) => (
              <Form.Group key={index} className="mb-3">
                <Form.Label>Image {index + 1}</Form.Label>
                <div className="d-flex align-items-center">
                  <Form.Control type="file" accept="image/jpeg, image/png" onChange={(e) => handleImageUpload(e.target.files[0], index)} />
                  <Button variant="outline-secondary" size="sm" className="ms-2" onClick={() => handleRotate(index)} title={`Rotate ${rotations[index]}°`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-clockwise" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>
                  </Button>
                  <img src={images[index] || ''} alt="" style={{ width: '60px', height: 'auto', marginLeft: '1rem', border: '1px solid var(--border-color)', visibility: images[index] ? 'visible' : 'hidden' }} />
                </div>
              </Form.Group>
            ))}
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
            variant="primary" disabled={images.every(img => img === null)}
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
