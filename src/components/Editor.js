import React, { useDeferredValue, useEffect, useRef, useState, startTransition } from 'react';
import { Card, Button, Alert, DropdownButton, Dropdown, Form } from 'react-bootstrap';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { saveCanvasImage } from '../utils/fileDownload';

const MAX_ROTATION_DEGREES = 15;
const ROTATION_STEP = 0.1;
const PREVIEW_MAX_DIMENSION = 1600;

const convertToPixels = (value, unit, dpi) => {
  if (unit === 'in') return value * dpi;
  if (unit === 'mm') return (value / 25.4) * dpi;
  return value;
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });

const getRotatedBounds = (width, height, radians) => {
  const absCos = Math.abs(Math.cos(radians));
  const absSin = Math.abs(Math.sin(radians));

  return {
    width: Math.max(1, Math.round(width * absCos + height * absSin)),
    height: Math.max(1, Math.round(width * absSin + height * absCos)),
  };
};

const renderAdjustedCanvas = (image, rotation, maxDimension = null) => {
  const scaleToFitPreview = maxDimension
    ? Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    : 1;
  const canvasWidth = Math.max(1, Math.round(image.naturalWidth * scaleToFitPreview));
  const canvasHeight = Math.max(1, Math.round(image.naturalHeight * scaleToFitPreview));
  const radians = rotation * (Math.PI / 180);
  const bounds = getRotatedBounds(canvasWidth, canvasHeight, radians);
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const fitScale = Math.min(canvasWidth / bounds.width, canvasHeight / bounds.height);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(
    image,
    -canvasWidth * fitScale / 2,
    -canvasHeight * fitScale / 2,
    canvasWidth * fitScale,
    canvasHeight * fitScale
  );

  return canvas;
};

const getActualCropDimensions = (displayWidth, displayHeight, sourceWidth, sourceHeight, crop) => {
  const scaleX = sourceWidth / displayWidth;
  const scaleY = sourceHeight / displayHeight;

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
function renderCroppedCanvas(source, crop, outputWidth, outputHeight, addBorder, dpi) {
  const canvas = document.createElement('canvas');
  const {
    actualCropX,
    actualCropY,
    actualCropWidth,
    actualCropHeight,
  } = crop;

  canvas.width = Math.max(1, Math.round(outputWidth || actualCropWidth));
  canvas.height = Math.max(1, Math.round(outputHeight || actualCropHeight));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    source,
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
  const [rotation, setRotation] = useState(0);
  const deferredRotation = useDeferredValue(rotation);
  const [sourceImage, setSourceImage] = useState(null);
  const [editorImage, setEditorImage] = useState(null);
  const [isLoadingSourceImage, setIsLoadingSourceImage] = useState(false);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [qualityWarning, setQualityWarning] = useState('');
  const [downloadFormat, setDownloadFormat] = useState(null);
  const [imagePreparationError, setImagePreparationError] = useState('');

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

  useEffect(() => {
    setRotation(0);
    setSourceImage(null);
    setEditorImage(null);
    setShowConfirmation(false);
    setQualityWarning('');
    setDownloadFormat(null);
    setImagePreparationError('');
  }, [uploadedImage]);

  useEffect(() => {
    let cancelled = false;

    const loadSourceImage = async () => {
      if (!uploadedImage) {
        setSourceImage(null);
        setCrop(undefined);
        setCompletedCrop(null);
        setIsLoadingSourceImage(false);
        return;
      }

      setIsLoadingSourceImage(true);
      setImagePreparationError('');
      setCrop(undefined);
      setCompletedCrop(null);

      try {
        const loadedImage = await loadImage(uploadedImage);
        if (!cancelled) {
          setSourceImage(loadedImage);
        }
      } catch (error) {
        if (!cancelled) {
          setSourceImage(null);
          setImagePreparationError('Could not rotate the preview image. You can still crop the original photo.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSourceImage(false);
        }
      }
    };

    loadSourceImage();

    return () => {
      cancelled = true;
    };
  }, [uploadedImage]);

  useEffect(() => {
    let cancelled = false;
    let frameId = null;

    if (!sourceImage) {
      setEditorImage(null);
      setIsRenderingPreview(false);
      return undefined;
    }

    setIsRenderingPreview(true);
    frameId = window.requestAnimationFrame(() => {
      try {
        const previewCanvas = renderAdjustedCanvas(sourceImage, deferredRotation, PREVIEW_MAX_DIMENSION);
        const previewUrl = previewCanvas.toDataURL('image/jpeg', 0.92);
        if (!cancelled) {
          startTransition(() => {
            setEditorImage(previewUrl);
          });
        }
      } catch (error) {
        if (!cancelled) {
          setEditorImage(uploadedImage);
          setImagePreparationError('Could not update the rotated preview smoothly. You can still crop the photo.');
        }
      } finally {
        if (!cancelled) {
          setIsRenderingPreview(false);
        }
      }
    });

    return () => {
      cancelled = true;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [sourceImage, deferredRotation, uploadedImage]);

  function onImageLoad(e) {
    if (completedCrop?.width && completedCrop?.height) {
      return;
    }

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

  const buildCroppedPhoto = async () => {
    if (!completedCrop?.width || !completedCrop?.height || !imgRef.current || !sourceImage) {
      return null;
    }

    const adjustedSource = renderAdjustedCanvas(sourceImage, rotation);
    const displayWidth = imgRef.current.clientWidth || imgRef.current.width;
    const displayHeight = imgRef.current.clientHeight || imgRef.current.height;
    const actualCrop = getActualCropDimensions(
      displayWidth,
      displayHeight,
      adjustedSource.width,
      adjustedSource.height,
      completedCrop
    );
    const outputWidth = convertToPixels(passportDimensions.width, passportDimensions.unit, dpi);
    const outputHeight = convertToPixels(passportDimensions.height, passportDimensions.unit, dpi);
    const cropped = renderCroppedCanvas(
      adjustedSource,
      actualCrop,
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
    const cropped = await buildCroppedPhoto();
    if (!cropped) return;

    onCrop(cropped.dataUrl);
    setShowConfirmation(true);
  };

  const handleDownloadCroppedPhoto = async (format) => {
    const cropped = await buildCroppedPhoto();
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
              ruleOfThirds
            >
              <img ref={imgRef} src={editorImage || uploadedImage} alt="To be cropped" style={{ maxWidth: '100%' }} onLoad={onImageLoad} />
            </ReactCrop>
            <Form.Group className="mt-3">
              <div className="d-flex justify-content-between align-items-center">
                <Form.Label className="mb-1">Straighten Photo</Form.Label>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none"
                  disabled={rotation === 0}
                  onClick={() => setRotation(0)}
                >
                  Reset
                </Button>
              </div>
              <Form.Range
                min={-MAX_ROTATION_DEGREES}
                max={MAX_ROTATION_DEGREES}
                step={ROTATION_STEP}
                value={rotation}
                disabled={isLoadingSourceImage}
                onChange={(event) => setRotation(Number(event.target.value))}
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>-{MAX_ROTATION_DEGREES}deg</span>
                <span>{rotation.toFixed(1)}deg</span>
                <span>+{MAX_ROTATION_DEGREES}deg</span>
              </div>
              {isRenderingPreview && <div className="small text-muted mt-1">Updating preview...</div>}
            </Form.Group>
            <div className="d-grid gap-2 mt-3">
              <Button
                variant="secondary"
                onClick={handleCrop}
                disabled={!completedCrop?.width || !completedCrop?.height || isLoadingSourceImage || !sourceImage}
              >
                Apply Crop
              </Button>
              <DropdownButton
                id="dropdown-download-cropped-button"
                title={downloadFormat ? `Downloading ${downloadFormat}...` : 'Download Cropped Photo'}
                variant="outline-primary"
                disabled={!completedCrop?.width || !completedCrop?.height || !!downloadFormat || isLoadingSourceImage || !sourceImage}
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
            {imagePreparationError && (
              <Alert variant="warning" className="mt-3 mb-0">
                {imagePreparationError}
              </Alert>
            )}
            {qualityWarning && (
              <Alert variant="warning" className="mt-3 mb-0">
                {qualityWarning}
              </Alert>
            )}
            <p className="text-muted small mt-2">Use the grid and straighten slider to fix tilted photos before cropping. The frame stays locked to the correct aspect ratio.</p>
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
