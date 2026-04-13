import React, { useDeferredValue, useEffect, useRef, useState, startTransition } from 'react';
import { Card, Button, Alert, Form } from 'react-bootstrap';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import FormatDownloadDropdown from './FormatDownloadDropdown';
import { saveCanvasImage } from '../utils/fileDownload';
import { convertToPixels } from '../utils/dimensions';
import {
  getActualCropDimensions,
  loadImage,
  MAX_ROTATION_DEGREES,
  PREVIEW_MAX_DIMENSION,
  renderAdjustedCanvas,
  renderCroppedCanvas,
  renderSourceCropCanvas,
  ROTATION_STEP,
} from '../utils/passportEditor';


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
    const sourceCrop = renderSourceCropCanvas(adjustedSource, actualCrop, addBorder, dpi);
    const minWidthPx = Math.round(outputWidth);
    const minHeightPx = Math.round(outputHeight);

    if (cropped.width < minWidthPx || cropped.height < minHeightPx) {
      setQualityWarning(
        `Crop is ${cropped.width}x${cropped.height}px. For best 300 DPI print quality, use at least ${minWidthPx}x${minHeightPx}px.`
      );
    } else {
      setQualityWarning('');
    }

    return {
      ...cropped,
      sourceCanvas: sourceCrop.canvas,
      sourceDataUrl: sourceCrop.dataUrl,
    };
  };

  const handleCrop = async () => {
    const cropped = await buildCroppedPhoto();
    if (!cropped) return;

    onCrop({
      previewUrl: cropped.dataUrl,
      sourceUrl: cropped.sourceDataUrl,
      width: cropped.width,
      height: cropped.height,
    });
    setShowConfirmation(true);
  };

  const handleDownloadCroppedPhoto = async (format) => {
    const cropped = await buildCroppedPhoto();
    if (!cropped) return;

    try {
      setDownloadFormat(format);
      const extension = format.toLowerCase();
      await saveCanvasImage(cropped.sourceCanvas, format, `cropped_passport_photo.${extension}`, 1.0);
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
              className="passport-crop-editor"
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              aspect={aspect}
              minWidth={100}
              ruleOfThirds
            >
              <img
                ref={imgRef}
                className="passport-crop-image"
                src={editorImage || uploadedImage}
                alt="To be cropped"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                style={{ maxWidth: '100%' }}
                onLoad={onImageLoad}
              />
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
              <FormatDownloadDropdown
                id="dropdown-download-cropped-button"
                title={downloadFormat ? `Downloading ${downloadFormat}...` : 'Download Cropped Photo'}
                variant="outline-primary"
                disabled={!completedCrop?.width || !completedCrop?.height || !!downloadFormat || isLoadingSourceImage || !sourceImage}
                formats={['PNG', 'JPG']}
                onSelect={handleDownloadCroppedPhoto}
              />
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
