import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, DropdownButton, Dropdown } from 'react-bootstrap';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { saveCanvasImage } from '../utils/fileDownload';

const convertToPixels = (value, unit, dpi) => {
  if (unit === 'in') return value * dpi;
  if (unit === 'mm') return (value / 25.4) * dpi;
  return value;
};

const getActualCropDimensions = (image, crop) => {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

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

// Render the crop at the final passport size so downloads stay print-ready.
function renderCroppedCanvas(image, crop, outputWidth, outputHeight, addBorder, dpi) {
  const canvas = document.createElement('canvas');
  const {
    actualCropX,
    actualCropY,
    actualCropWidth,
    actualCropHeight,
  } = getActualCropDimensions(image, crop);

  canvas.width = Math.max(1, Math.round(outputWidth || actualCropWidth));
  canvas.height = Math.max(1, Math.round(outputHeight || actualCropHeight));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
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
}


const Editor = ({ uploadedImage, onCrop, passportDimensions, dpi = 300, addBorder = false }) => {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const [aspect, setAspect] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [qualityWarning, setQualityWarning] = useState('');
  const [downloadFormat, setDownloadFormat] = useState(null);

  useEffect(() => {
    if (passportDimensions) {
      setAspect(passportDimensions.width / passportDimensions.height);
    }
  }, [passportDimensions]);

  useEffect(() => {
    if (showConfirmation) {
      const timer = setTimeout(() => setShowConfirmation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfirmation]);

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
    setCompletedCrop(newCrop);
  }

  const buildCroppedPhoto = () => {
    if (!completedCrop?.width || !completedCrop?.height || !imgRef.current) {
      return null;
    }

    const outputWidth = convertToPixels(passportDimensions.width, passportDimensions.unit, dpi);
    const outputHeight = convertToPixels(passportDimensions.height, passportDimensions.unit, dpi);
    const cropped = renderCroppedCanvas(
      imgRef.current,
      completedCrop,
      outputWidth,
      outputHeight,
      addBorder,
      dpi
    );
    const minWidthPx = Math.round(outputWidth);
    const minHeightPx = Math.round(outputHeight);

    if (cropped.width < minWidthPx || cropped.height < minHeightPx) {
      setQualityWarning(
        `Crop is ${cropped.width}x${cropped.height}px. For best 300 DPI print quality, use at least ${minWidthPx}x${minHeightPx}px.`
      );
    } else {
      setQualityWarning('');
    }

    return cropped;
  };

  const handleCrop = async () => {
    const cropped = buildCroppedPhoto();
    if (!cropped) return;

    onCrop(cropped.dataUrl);
    setShowConfirmation(true);
  };

  const handleDownloadCroppedPhoto = async (format) => {
    const cropped = buildCroppedPhoto();
    if (!cropped) return;

    try {
      setDownloadFormat(format);
      const extension = format.toLowerCase();
      await saveCanvasImage(cropped.canvas, format, `cropped_passport_photo.${extension}`, 1.0);
    } catch (error) {
      alert(`Download failed: ${error.message}`);
    } finally {
      setDownloadFormat(null);
    }
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>Step 2: Edit Photo</Card.Title>
        
        {uploadedImage ? (
          <div>
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              aspect={aspect}
              minWidth={100}
            >
              <img ref={imgRef} src={uploadedImage} alt="To be cropped" style={{ maxWidth: '100%' }} onLoad={onImageLoad} />
            </ReactCrop>
            <div className="d-grid gap-2 mt-3">
              <Button variant="secondary" onClick={handleCrop}>Apply Crop</Button>
              <DropdownButton
                id="dropdown-download-cropped-button"
                title={downloadFormat ? `Downloading ${downloadFormat}...` : 'Download Cropped Photo'}
                variant="outline-primary"
                disabled={!completedCrop?.width || !completedCrop?.height || !!downloadFormat}
              >
                <Dropdown.Item onClick={() => handleDownloadCroppedPhoto('PNG')}>
                  Download as PNG
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleDownloadCroppedPhoto('JPG')}>
                  Download as JPG
                </Dropdown.Item>
              </DropdownButton>
            </div>
            {showConfirmation && (
              <Alert variant="success" className="mt-3">
                Crop Applied!
              </Alert>
            )}
            {qualityWarning && (
              <Alert variant="warning" className="mt-3 mb-0">
                {qualityWarning}
              </Alert>
            )}
            <p className="text-muted small mt-2">Adjust the selection on your photo. The frame is locked to the correct aspect ratio.</p>
          </div>
        ) : (
          <div className="text-center text-muted themed-empty-state" style={{ minHeight: '200px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>Upload an image to begin editing</span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default Editor;
