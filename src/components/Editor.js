import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const convertToPixels = (value, unit, dpi) => {
  if (unit === 'in') return value * dpi;
  if (unit === 'mm') return (value / 25.4) * dpi;
  return value;
};

// Helper to generate the cropped image
function getCroppedImg(image, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Calculate the actual pixel dimensions of the cropped region
  const actualCropX = Math.round(crop.x * scaleX);
  const actualCropY = Math.round(crop.y * scaleY);
  const actualCropWidth = Math.max(1, Math.round(crop.width * scaleX));
  const actualCropHeight = Math.max(1, Math.round(crop.height * scaleY));

  canvas.width = actualCropWidth;
  canvas.height = actualCropHeight;
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
    actualCropWidth,
    actualCropHeight
  );

  return new Promise((resolve) => {
    resolve({
      dataUrl: canvas.toDataURL('image/png'), // PNG is lossless
      width: actualCropWidth,
      height: actualCropHeight,
    });
  });
}


const Editor = ({ uploadedImage, onCrop, passportDimensions, dpi = 300 }) => {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const [aspect, setAspect] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [qualityWarning, setQualityWarning] = useState('');

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

  const handleCrop = async () => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current) {
      const cropped = await getCroppedImg(imgRef.current, completedCrop);
      const minWidthPx = convertToPixels(passportDimensions.width, passportDimensions.unit, dpi);
      const minHeightPx = convertToPixels(passportDimensions.height, passportDimensions.unit, dpi);

      if (cropped.width < minWidthPx || cropped.height < minHeightPx) {
        setQualityWarning(
          `Crop is ${cropped.width}x${cropped.height}px. For best 300 DPI print quality, use at least ${Math.round(minWidthPx)}x${Math.round(minHeightPx)}px.`
        );
      } else {
        setQualityWarning('');
      }

      onCrop(cropped.dataUrl);
      setShowConfirmation(true);
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
