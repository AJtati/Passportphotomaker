import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Form, Button, InputGroup, DropdownButton, Dropdown, Spinner, Alert } from 'react-bootstrap';

const ImageResizer = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [originalImageSizeKB, setOriginalImageSizeKB] = useState(null);
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [targetFileSize, setTargetFileSize] = useState('');
  const [targetFileSizeUnit, setTargetFileSizeUnit] = useState('MB');
  
  const [currentProcessedImage, setCurrentProcessedImage] = useState(null);
  const [finalProcessedImage, setFinalProcessedImage] = useState(null);
  const [downloadableBlob, setDownloadableBlob] = useState(null);
  const [processingDimensions, setProcessingDimensions] = useState(false);
  const [processingCompression, setProcessingCompression] = useState(false);
  const [currentFileSizeKB, setCurrentFileSizeKB] = useState(null);

  const [showDimensionConfirmation, setShowDimensionConfirmation] = useState(false);
  const [showSizeConfirmation, setShowSizeConfirmation] = useState(false);

  const previewCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const dimensionSectionRef = useRef(null);
  const sizeSectionRef = useRef(null);
  const finalPreviewSectionRef = useRef(null);

  // Effect to load image and set original dimensions
  useEffect(() => {
    if (uploadedImage) {
      const img = new Image();
      img.onload = () => {
        setOriginalWidth(img.naturalWidth);
        setOriginalHeight(img.naturalHeight);
        setNewWidth(img.naturalWidth);
        setNewHeight(img.naturalHeight);
        imageRef.current = img;
        setCurrentProcessedImage(uploadedImage);
        setFinalProcessedImage(null);
        setDownloadableBlob(null);
        setCurrentFileSizeKB(null);
        setShowDimensionConfirmation(false);
        setShowSizeConfirmation(false);
      };
      img.src = uploadedImage;
      // Get original file size
      fetch(uploadedImage)
        .then(res => res.blob())
        .then(blob => setOriginalImageSizeKB((blob.size / 1024).toFixed(2)));
    } else {
      setOriginalWidth(0);
      setOriginalHeight(0);
      setOriginalImageSizeKB(null);
      setNewWidth('');
      setNewHeight('');
      imageRef.current = null;
      setCurrentProcessedImage(null);
      setFinalProcessedImage(null);
      setDownloadableBlob(null);
      setCurrentFileSizeKB(null);
      setShowDimensionConfirmation(false);
      setShowSizeConfirmation(false);
    }
  }, [uploadedImage]);

  // Effect to draw processed image on canvas
  useEffect(() => {
    drawPreviewCanvas();
  }, [finalProcessedImage]);

  // Confirmation message effects
  useEffect(() => {
    if (showDimensionConfirmation) {
      const timer = setTimeout(() => setShowDimensionConfirmation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showDimensionConfirmation]);

  useEffect(() => {
    if (showSizeConfirmation) {
      const timer = setTimeout(() => setShowSizeConfirmation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSizeConfirmation]);


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setUploadedImage(event.target.result);
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid image file (JPG, PNG).");
    }
  };

  const handleWidthChange = (e) => {
    const value = e.target.value;
    setNewWidth(value);
    if (maintainAspectRatio && originalWidth > 0 && value !== '') {
      const width = parseFloat(value);
      if (!isNaN(width) && width > 0) {
        setNewHeight(Math.round(width * (originalHeight / originalWidth)));
      }
    }
  };

  const handleHeightChange = (e) => {
    const value = e.target.value;
    setNewHeight(value);
    if (maintainAspectRatio && originalHeight > 0 && value !== '') {
      const height = parseFloat(value);
      if (!isNaN(height) && height > 0) {
        setNewWidth(Math.round(height * (originalWidth / originalHeight)));
      }
    }
  };

  const handleAspectRatioToggle = () => {
    setMaintainAspectRatio(!maintainAspectRatio);
    if (!maintainAspectRatio && newWidth !== '' && originalWidth > 0) {
      setNewHeight(Math.round(parseFloat(newWidth) * (originalHeight / originalWidth)));
    } else if (!maintainAspectRatio && newHeight !== '' && originalHeight > 0) {
      setNewWidth(Math.round(parseFloat(newHeight) * (originalWidth / originalHeight)));
    }
  };

  const handleTargetFileSizeChange = (e) => {
    const value = e.target.value;
    const size = parseFloat(value);
    
    const maxHardLimitMB = 5;
    let maxAllowedSizeKB = maxHardLimitMB * 1024;

    if (originalImageSizeKB) {
      maxAllowedSizeKB = Math.min(maxAllowedSizeKB, parseFloat(originalImageSizeKB));
    }

    let inputSizeKB = 0;
    if (targetFileSizeUnit === 'MB') {
      inputSizeKB = size * 1024;
    } else { // KB
      inputSizeKB = size;
    }

    if (!isNaN(size) && size > 0 && inputSizeKB > maxAllowedSizeKB) {
      alert(`Target size cannot exceed ${maxAllowedSizeKB / 1024} MB (or original image size).`);
      setTargetFileSize('');
    } else {
      setTargetFileSize(value);
    }
  };

  const handleTargetFileSizeUnitChange = (e) => {
    setTargetFileSizeUnit(e.target.value);
  };

  const drawPreviewCanvas = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !finalProcessedImage) return;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
    };
    img.src = finalProcessedImage;
  };

  const applyDimensions = async () => {
    if (!imageRef.current) {
      alert("Please upload an image first.");
      return;
    }
    const width = parseFloat(newWidth);
    const height = parseFloat(newHeight);
    if (isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
      alert("Please enter valid dimensions.");
      return;
    }

    setProcessingDimensions(true);
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCtx.drawImage(imageRef.current, 0, 0, width, height);

    const resizedDataUrl = tempCanvas.toDataURL('image/png');
    setCurrentProcessedImage(resizedDataUrl);
    setFinalProcessedImage(resizedDataUrl);
    
    const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png', 1.0));
    setCurrentFileSizeKB((blob.size / 1024).toFixed(2));
    setDownloadableBlob(blob);

    setProcessingDimensions(false);
    setShowDimensionConfirmation(true);
    if (sizeSectionRef.current) {
      sizeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyCompression = async () => {
    if (!currentProcessedImage) {
      alert("Please apply dimensions first.");
      return;
    }
    const targetSize = parseFloat(targetFileSize);
    if (isNaN(targetSize) || targetSize <= 0) {
      alert("Please enter a valid target file size.");
      return;
    }

    setProcessingCompression(true);
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const img = new Image();
    img.src = currentProcessedImage;
    await new Promise(resolve => img.onload = resolve);
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    tempCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

    let finalBlob = null;
    let quality = 0.9;
    const maxAttempts = 20;
    let attempts = 0;
    let targetBytes = targetSize;
    if (targetFileSizeUnit === 'KB') {
      targetBytes *= 1024;
    } else if (targetFileSizeUnit === 'MB') {
      targetBytes *= 1024 * 1024;
    }

    while (attempts < maxAttempts) {
      finalBlob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg', quality));
      if (finalBlob.size <= targetBytes || quality <= 0.1) {
        break;
      }
      quality -= 0.05;
      attempts++;
    }
    
    setFinalProcessedImage(URL.createObjectURL(finalBlob));
    setCurrentFileSizeKB((finalBlob.size / 1024).toFixed(2));
    setDownloadableBlob(finalBlob);
    setProcessingCompression(false);
    setShowSizeConfirmation(true);
    if (finalPreviewSectionRef.current) {
      finalPreviewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  const handleDownload = (format) => {
    if (!downloadableBlob) {
      alert("No image to download. Please process an image first.");
      return;
    }

    const link = document.createElement('a');
    link.download = `resized_image.${format.toLowerCase()}`;
    
    if (format === 'PDF') {
      alert("PDF download is not available for this feature. Please choose JPG or PNG.");
      return;
    } else {
      const imageFormat = format === 'JPG' ? 'image/jpeg' : 'image/png';
      if (downloadableBlob.type === imageFormat || (format === 'PNG' && downloadableBlob.type === 'image/png') || (format === 'JPG' && downloadableBlob.type === 'image/jpeg')) {
        const url = URL.createObjectURL(downloadableBlob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            alert("Failed to generate image for download.");
          }
        }, imageFormat, 1.0);
      }
    }
  };

  return (
    <Row>
      <Col md={5}>
        <Card>
          <Card.Body>
            <Card.Title>Change Photo Size & Compress</Card.Title>
            <Form.Group className="mb-3">
              <Form.Label>Upload Image</Form.Label>
              <Form.Control type="file" accept="image/jpeg, image/png" onChange={handleImageUpload} />
            </Form.Group>

            {uploadedImage && (
              <>
                <hr />
                <div ref={dimensionSectionRef}>
                  <p>Original: {originalWidth}x{originalHeight} px {originalImageSizeKB && `(${originalImageSizeKB} KB)`}</p>
                  <Form.Group className="mb-3">
                    <Form.Label>New Dimensions (pixels)</Form.Label>
                    <Row>
                      <Col>
                        <InputGroup>
                          <Form.Control type="number" value={newWidth} onChange={handleWidthChange} placeholder="Width" />
                          <InputGroup.Text>px</InputGroup.Text>
                        </InputGroup>
                      </Col>
                      <Col>
                        <InputGroup>
                          <Form.Control type="number" value={newHeight} onChange={handleHeightChange} placeholder="Height" />
                          <InputGroup.Text>px</InputGroup.Text>
                        </InputGroup>
                      </Col>
                    </Row>
                    <Form.Check
                      type="checkbox"
                      label="Maintain Aspect Ratio"
                      checked={maintainAspectRatio}
                      onChange={handleAspectRatioToggle}
                      className="mt-2"
                    />
                  </Form.Group>
                  <div className="d-grid gap-2 mt-3">
                    <Button variant="primary" onClick={applyDimensions} disabled={processingDimensions}>
                      {processingDimensions ? <Spinner animation="border" size="sm" /> : 'Apply Dimensions'}
                    </Button>
                  </div>
                  {showDimensionConfirmation && (
                    <Alert variant="success" className="mt-3">
                      Dimensions Applied!
                    </Alert>
                  )}
                </div>

                <hr />

                <div ref={sizeSectionRef}>
                  <Form.Group className="mb-3">
                    <Form.Label>Target File Size (for JPG)</Form.Label>
                    <InputGroup>
                      <Form.Control type="number" step="0.1" value={targetFileSize} onChange={handleTargetFileSizeChange} placeholder="e.g., 2" />
                      <Form.Select value={targetFileSizeUnit} onChange={handleTargetFileSizeUnitChange} style={{ maxWidth: '80px' }}>
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                      </Form.Select>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Leave blank for maximum quality (PNG or JPG 1.0). Max 5MB.
                      {originalImageSizeKB && ` Cannot exceed original size (${originalImageSizeKB} KB).`}
                    </Form.Text>
                  </Form.Group>
                  <div className="d-grid gap-2 mt-3">
                    <Button variant="primary" onClick={applyCompression} disabled={processingCompression || !currentProcessedImage}>
                      {processingCompression ? <Spinner animation="border" size="sm" /> : 'Apply Size'}
                    </Button>
                  </div>
                  {showSizeConfirmation && (
                    <Alert variant="success" className="mt-3">
                      Size Applied!
                    </Alert>
                  )}
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Col>
      <Col md={7} ref={finalPreviewSectionRef} className="pb-5"> {/* Add pb-5 here */}
        <Card>
          <Card.Body>
            <Card.Title>Processed Image Preview</Card.Title>
            {finalProcessedImage ? (
              <>
                <div className="text-center mb-3" style={{ backgroundColor: '#e9ecef', padding: '1rem', overflowX: 'auto' }}>
                  <canvas ref={previewCanvasRef} style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc' }} />
                </div>
                {currentFileSizeKB && <p className="text-center">Current Size: {currentFileSizeKB} KB</p>}
                <div className="d-grid gap-2 mt-3">
                  <DropdownButton
                    id="dropdown-download-resize-button" title="Download Processed Image" size="lg"
                    variant="primary"
                  >
                    <Dropdown.Item onClick={() => handleDownload('JPG')}>Download as JPG</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleDownload('PNG')}>Download as PNG</Dropdown.Item>
                  </DropdownButton>
                </div>
              </>
            ) : (
              <div className="text-center text-muted" style={{ minHeight: '200px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>Upload and process an image to see preview</span>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ImageResizer;
