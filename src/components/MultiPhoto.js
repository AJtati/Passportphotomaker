import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Form, Button, DropdownButton, Dropdown } from 'react-bootstrap';
import { jsPDF } from 'jspdf';

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
function drawContainedImage(ctx, image, slotX, slotY, slotWidth, slotHeight) {
  const imgAspectRatio = image.naturalWidth / image.naturalHeight;
  const slotAspectRatio = slotWidth / slotHeight;

  let drawWidth, drawHeight, drawX, drawY;

  if (imgAspectRatio > slotAspectRatio) { // Image is wider than the slot
    drawWidth = slotWidth;
    drawHeight = slotWidth / imgAspectRatio;
    drawX = slotX;
    drawY = slotY + (slotHeight - drawHeight) / 2;
  } else { // Image is taller than or same aspect as the slot
    drawHeight = slotHeight;
    drawWidth = slotHeight * imgAspectRatio;
    drawY = slotY;
    drawX = slotX + (slotWidth - drawWidth) / 2;
  }

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}


const MultiPhoto = () => {
  const [images, setImages] = useState([null, null, null, null]);
  const [imageObjects, setImageObjects] = useState([null, null, null, null]);
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
            // Check if all images are now loaded before drawing
            if (finalObjs.every((obj, i) => !images[i] || obj?.complete)) {
              drawCanvas(finalObjs);
            }
            return finalObjs;
          });
        };
      } else if (!imgData && imageObjects[index]) {
        newImageObjects[index] = null;
      }
    });
  
    if (allImagesLoaded) {
      drawCanvas(newImageObjects);
    }
  }, [images]);

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

  const drawCanvas = (currentImages) => {
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
    
    const marginX = (paperWidthPx - 2 * photoWidthPx) / 3;
    const marginY = (paperHeightPx - 2 * photoHeightPx) / 3;

    const positions = [
      { x: marginX, y: marginY, w: photoWidthPx, h: photoHeightPx },
      { x: marginX * 2 + photoWidthPx, y: marginY, w: photoWidthPx, h: photoHeightPx },
      { x: marginX, y: marginY * 2 + photoHeightPx, w: photoWidthPx, h: photoHeightPx },
      { x: marginX * 2 + photoWidthPx, y: marginY * 2 + photoHeightPx, w: photoWidthPx, h: photoHeightPx },
    ];

    positions.forEach((pos, index) => {
      ctx.strokeStyle = '#ced4da';
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      if (currentImages[index] && currentImages[index].complete) {
        drawContainedImage(ctx, currentImages[index], pos.x, pos.y, pos.w, pos.h);
      } else {
        ctx.fillStyle = '#6c757d';
        ctx.textAlign = 'center';
        ctx.font = '48px Arial';
        ctx.fillText(`Image ${index + 1}`, pos.x + pos.w / 2, pos.y + pos.h / 2);
      }
    });
  };

  const handleDownload = (format) => {
    const canvas = canvasRef.current;
    if (!canvas) { alert("Preview canvas not ready."); return; }
    if (format === 'PDF') {
      const pdf = new jsPDF('l', 'mm', [A4_WIDTH_MM, A4_HEIGHT_MM]); // 'l' for landscape
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      pdf.save('multi-photo_A4_landscape.pdf');
    } else {
      const link = document.createElement('a');
      link.download = `multi-photo_A4_landscape.${format.toLowerCase()}`;
      link.href = canvas.toDataURL(format === 'JPG' ? 'image/jpeg' : 'image/png', 1.0);
      link.click();
    }
  };

  return (
    <Row>
      <Col md={5}>
        <Card>
          <Card.Body>
            <Card.Title>Upload Four Photos</Card.Title>
            <p>Upload up to four photos to be arranged on a landscape A4 page. Each photo will be placed in a 6x4 inch slot.</p>
            {[...Array(4)].map((_, index) => (
              <Form.Group key={index} className="mb-3">
                <Form.Label>Image {index + 1}</Form.Label>
                <div className="d-flex align-items-center">
                  <Form.Control type="file" accept="image/jpeg, image/png" onChange={(e) => handleImageUpload(e.target.files[0], index)} />
                  <img src={images[index] || ''} alt="" style={{ width: '80px', height: 'auto', marginLeft: '1rem', border: '1px solid #ccc', visibility: images[index] ? 'visible' : 'hidden' }} />
                </div>
              </Form.Group>
            ))}
          </Card.Body>
        </Card>
      </Col>
      <Col md={7}>
        <Card>
          <Card.Body>
            <Card.Title>A4 Landscape Preview</Card.Title>
            <div className="text-center" style={{ backgroundColor: '#e9ecef', padding: '1rem', overflowX: 'auto' }}>
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