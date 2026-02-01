import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Helper to generate the cropped image
function getCroppedImg(image, crop, fileName) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Calculate the actual pixel dimensions of the cropped region
  const actualCropWidth = crop.width * scaleX;
  const actualCropHeight = crop.height * scaleY;

  canvas.width = actualCropWidth;
  canvas.height = actualCropHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    actualCropWidth, // Use actual pixel dimensions for source width
    actualCropHeight, // Use actual pixel dimensions for source height
    0,
    0,
    actualCropWidth, // Use actual pixel dimensions for destination width
    actualCropHeight // Use actual pixel dimensions for destination height
  );

  return new Promise((resolve) => {
    resolve(canvas.toDataURL('image/png')); // PNG is lossless
  });
}


const Editor = ({ uploadedImage, onCrop, passportDimensions }) => {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const [aspect, setAspect] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
      const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop, 'newFile.png');
      onCrop(croppedImageUrl);
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
            <p className="text-muted small mt-2">Adjust the selection on your photo. The frame is locked to the correct aspect ratio.</p>
          </div>
        ) : (
          <div className="text-center text-muted" style={{ minHeight: '200px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>Upload an image to begin editing</span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default Editor;