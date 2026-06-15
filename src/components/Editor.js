import React, { useDeferredValue, useEffect, useRef, useState, startTransition } from 'react';
import { Card, Button, Alert, Form, Row, Col } from 'react-bootstrap';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import FormatDownloadDropdown from './FormatDownloadDropdown';
import { saveCanvasImage, saveBlob } from '../utils/fileDownload';
import { convertToPixels } from '../utils/dimensions';
import { changeDpiBlob } from 'changedpi';
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

  const [selectedDpi, setSelectedDpi] = useState(dpi);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [appliedDimensions, setAppliedDimensions] = useState(null);
  const [targetFileSize, setTargetFileSize] = useState('');
  const [targetFileUnit, setTargetFileUnit] = useState('KB');
  const [appliedTargetSize, setAppliedTargetSize] = useState(null);

  useEffect(() => {
    setSelectedDpi(dpi);
  }, [dpi]);

  const handleCustomWidthChange = (e) => {
    const val = e.target.value;
    setCustomWidth(val);
    if (keepAspectRatio && aspect && val !== '') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        setCustomHeight(Math.round(parsed / aspect).toString());
      }
    }
  };

  const handleCustomHeightChange = (e) => {
    const val = e.target.value;
    setCustomHeight(val);
    if (keepAspectRatio && aspect && val !== '') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        setCustomWidth(Math.round(parsed * aspect).toString());
      }
    }
  };

  const handleKeepAspectRatioToggle = () => {
    const nextVal = !keepAspectRatio;
    setKeepAspectRatio(nextVal);
    if (nextVal && customWidth !== '' && aspect) {
      setCustomHeight(Math.round(parseFloat(customWidth) / aspect).toString());
    }
  };

  const handleApplyDimensions = () => {
    const w = parseFloat(customWidth);
    const h = parseFloat(customHeight);
    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
      alert('Please enter valid width and height in pixels.');
      return;
    }
    setAppliedDimensions({ width: w, height: h });
  };

  const handleApplySize = () => {
    const size = parseFloat(targetFileSize);
    if (isNaN(size) || size <= 0) {
      alert('Please enter a valid target file size.');
      return;
    }
    setAppliedTargetSize({ size, unit: targetFileUnit });
  };

  const handleClearCustomSettings = () => {
    setSelectedDpi(dpi);
    setCustomWidth('');
    setCustomHeight('');
    setAppliedDimensions(null);
    setTargetFileSize('');
    setAppliedTargetSize(null);
  };

  const getDownloadCanvas = (croppedResult, targetDpi, targetDims) => {
    const isDpiChanged = targetDpi !== dpi;
    const hasCustomDims = !!targetDims;
    
    if (!isDpiChanged && !hasCustomDims) {
      return croppedResult.sourceCanvas;
    }
    
    if (hasCustomDims) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(targetDims.width));
      canvas.height = Math.max(1, Math.round(targetDims.height));
      
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(
        croppedResult.sourceCanvas, 
        0, 0, 
        croppedResult.sourceCanvas.width, croppedResult.sourceCanvas.height, 
        0, 0, 
        canvas.width, canvas.height
      );
      return canvas;
    }
    
    return croppedResult.canvas;
  };

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

  const buildCroppedPhoto = async (targetDpi = dpi) => {
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
    const outputWidth = convertToPixels(passportDimensions.width, passportDimensions.unit, targetDpi);
    const outputHeight = convertToPixels(passportDimensions.height, passportDimensions.unit, targetDpi);
    const cropped = renderCroppedCanvas(
      adjustedSource,
      actualCrop,
      outputWidth,
      outputHeight,
      addBorder,
      targetDpi
    );
    const sourceCrop = renderSourceCropCanvas(adjustedSource, actualCrop, addBorder, targetDpi);
    const minWidthPx = Math.round(outputWidth);
    const minHeightPx = Math.round(outputHeight);

    if (cropped.width < minWidthPx || cropped.height < minHeightPx) {
      setQualityWarning(
        `Crop is ${cropped.width}x${cropped.height}px. For best ${targetDpi} DPI print quality, use at least ${minWidthPx}x${minHeightPx}px.`
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
    const cropped = await buildCroppedPhoto(selectedDpi);
    if (!cropped) return;

    try {
      setDownloadFormat(format);
      const extension = format.toLowerCase();
      
      const downloadCanvas = getDownloadCanvas(cropped, selectedDpi, appliedDimensions);
      
      const mimeType = format === 'JPG' || format === 'jpg' ? 'image/jpeg' : 'image/png';
      
      let blob;
      let finalExtension = extension;
      
      if (appliedTargetSize) {
        let targetBytes = appliedTargetSize.size;
        if (appliedTargetSize.unit === 'KB') {
          targetBytes *= 1024;
        } else if (appliedTargetSize.unit === 'MB') {
          targetBytes *= 1024 * 1024;
        }
        
        let quality = 0.95;
        const maxAttempts = 20;
        let attempts = 0;
        let compressedBlob = null;
        
        const compressionMimeType = 'image/jpeg';
        finalExtension = 'jpg';
        
        while (attempts < maxAttempts) {
          compressedBlob = await new Promise(resolve => downloadCanvas.toBlob(resolve, compressionMimeType, quality));
          if (compressedBlob.size <= targetBytes || quality <= 0.1) {
            break;
          }
          quality -= 0.05;
          attempts++;
        }
        
        if (!compressedBlob) {
          throw new Error('Failed to compress image.');
        }
        blob = compressedBlob;
      } else {
        blob = await new Promise((resolve) => downloadCanvas.toBlob(resolve, mimeType, 1.0));
        if (!blob) throw new Error('Failed to render image.');
      }
      
      if (selectedDpi) {
        try {
          blob = await changeDpiBlob(blob, selectedDpi);
        } catch (dpiError) {
          console.error('Failed to change DPI metadata:', dpiError);
        }
      }
      
      await saveBlob(blob, `cropped_passport_photo.${finalExtension}`, blob.type);
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
            </div>

            <div className="border rounded p-3 my-3 custom-download-settings" style={{ fontSize: '0.9rem' }}>
              <h6 className="mb-3">Custom Download Settings</h6>
              
              <Form.Group className="mb-3">
                <Form.Label className="mb-1">Select DPI</Form.Label>
                <Form.Select 
                  value={selectedDpi} 
                  onChange={(e) => setSelectedDpi(Number(e.target.value))}
                >
                  <option value={100}>100 DPI</option>
                  <option value={200}>200 DPI</option>
                  <option value={300}>300 DPI</option>
                  <option value={400}>400 DPI</option>
                  <option value={500}>500 DPI</option>
                  <option value={600}>600 DPI</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="mb-1">Select Size (Pixels)</Form.Label>
                <Row className="g-2">
                  <Col>
                    <Form.Control 
                      type="number" 
                      placeholder="Width (px)" 
                      value={customWidth} 
                      onChange={handleCustomWidthChange}
                    />
                  </Col>
                  <Col>
                    <Form.Control 
                      type="number" 
                      placeholder="Height (px)" 
                      value={customHeight} 
                      onChange={handleCustomHeightChange}
                    />
                  </Col>
                </Row>
                <Form.Check 
                  type="checkbox" 
                  label="Keep Aspect Ratio" 
                  checked={keepAspectRatio} 
                  onChange={handleKeepAspectRatioToggle}
                  className="mt-2"
                />
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="mt-2 w-100" 
                  onClick={handleApplyDimensions}
                >
                  Apply Dimensions
                </Button>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="mb-1">Target File Size</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control 
                    type="number" 
                    placeholder="e.g. 100" 
                    value={targetFileSize} 
                    onChange={(e) => setTargetFileSize(e.target.value)}
                  />
                  <Form.Select 
                    value={targetFileUnit} 
                    onChange={(e) => setTargetFileUnit(e.target.value)}
                    style={{ maxWidth: '80px' }}
                  >
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </Form.Select>
                </div>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="mt-2 w-100" 
                  onClick={handleApplySize}
                >
                  Apply Size
                </Button>
              </Form.Group>

              {((selectedDpi !== dpi) || appliedDimensions || appliedTargetSize) && (
                <div className="mt-3 p-2 bg-body rounded border border-info">
                  <div className="fw-semibold text-info mb-1">Applied Settings:</div>
                  <ul className="list-unstyled mb-2 pl-2" style={{ fontSize: '0.85rem' }}>
                    {selectedDpi !== dpi && <li>• DPI: {selectedDpi} (Default: {dpi})</li>}
                    {appliedDimensions && <li>• Size: {appliedDimensions.width}x{appliedDimensions.height} px</li>}
                    {appliedTargetSize && <li>• Target Size: {appliedTargetSize.size} {appliedTargetSize.unit}</li>}
                  </ul>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 text-danger text-decoration-none" 
                    onClick={handleClearCustomSettings}
                  >
                    Clear Custom Settings
                  </Button>
                </div>
              )}
            </div>

            <div className="d-grid gap-2 mt-3">
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
