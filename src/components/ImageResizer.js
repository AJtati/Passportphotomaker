import React, { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Form, Button, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import FormatDownloadDropdown from './FormatDownloadDropdown';
import { saveBlob } from '../utils/fileDownload';
import { loadPdfJs } from '../utils/pdfjs';
import { changeDpiBlob } from 'changedpi';

const revokeObjectUrl = (value) => {
  if (typeof value === 'string' && value.startsWith('blob:')) {
    URL.revokeObjectURL(value);
  }
};

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
  const [selectedDpi, setSelectedDpi] = useState('');
  
  const [currentProcessedImage, setCurrentProcessedImage] = useState(null);
  const [finalProcessedImage, setFinalProcessedImage] = useState(null);
  const [downloadableBlob, setDownloadableBlob] = useState(null);
  const [processingDimensions, setProcessingDimensions] = useState(false);
  const [processingCompression, setProcessingCompression] = useState(false);
  const [currentFileSizeKB, setCurrentFileSizeKB] = useState(null);

  const [showDimensionConfirmation, setShowDimensionConfirmation] = useState(false);
  const [showSizeConfirmation, setShowSizeConfirmation] = useState(false);

  const [uploadedPdfFile, setUploadedPdfFile] = useState(null);
  const [originalPdfSizeKB, setOriginalPdfSizeKB] = useState(null);
  const [pdfTargetSize, setPdfTargetSize] = useState('');
  const [pdfTargetSizeUnit, setPdfTargetSizeUnit] = useState('MB');
  const [pdfSuggestedSizes, setPdfSuggestedSizes] = useState([]);
  const [processingPdfCompression, setProcessingPdfCompression] = useState(false);
  const [compressedPdfSizeKB, setCompressedPdfSizeKB] = useState(null);
  const [showPdfConfirmation, setShowPdfConfirmation] = useState(false);

  const [uploadedCleanPdfFile, setUploadedCleanPdfFile] = useState(null);
  const [originalCleanPdfSizeKB, setOriginalCleanPdfSizeKB] = useState(null);
  const [processingClean, setProcessingClean] = useState(false);
  const [showCleanConfirmation, setShowCleanConfirmation] = useState(false);

  const previewCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const dimensionSectionRef = useRef(null);
  const sizeSectionRef = useRef(null);
  const finalPreviewSectionRef = useRef(null);

  useEffect(() => {
    if (showPdfConfirmation) {
      const timer = setTimeout(() => setShowPdfConfirmation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showPdfConfirmation]);

  useEffect(() => {
    if (showCleanConfirmation) {
      const timer = setTimeout(() => setShowCleanConfirmation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showCleanConfirmation]);

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

  useEffect(() => () => revokeObjectUrl(finalProcessedImage), [finalProcessedImage]);

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

  const formatKB = (sizeInKB) => {
    if (sizeInKB >= 1024) return `${(sizeInKB / 1024).toFixed(2)} MB`;
    return `${sizeInKB.toFixed(2)} KB`;
  };

  const sizeToBytes = (size, unit) => {
    const numericSize = parseFloat(size);
    if (isNaN(numericSize) || numericSize <= 0) return null;
    return unit === 'MB' ? numericSize * 1024 * 1024 : numericSize * 1024;
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF file.');
      return;
    }

    const sizeKB = file.size / 1024;
    setUploadedPdfFile(file);
    setOriginalPdfSizeKB(sizeKB);
    setPdfTargetSize('');
    setPdfTargetSizeUnit(sizeKB >= 1024 ? 'MB' : 'KB');
    setCompressedPdfSizeKB(null);
    setShowPdfConfirmation(false);

    const factors = [0.9, 0.75, 0.6, 0.5, 0.35];
    const suggestions = factors
      .map((factor) => Math.max(10, sizeKB * factor))
      .filter((value) => value < sizeKB)
      .slice(0, 4);
    setPdfSuggestedSizes(suggestions);
  };

  const handlePdfTargetSizeChange = (e) => {
    if (!originalPdfSizeKB) {
      setPdfTargetSize('');
      return;
    }

    const value = e.target.value;
    if (value === '') {
      setPdfTargetSize('');
      return;
    }

    const bytes = sizeToBytes(value, pdfTargetSizeUnit);
    if (!bytes) {
      setPdfTargetSize(value);
      return;
    }

    const originalBytes = originalPdfSizeKB * 1024;
    if (bytes > originalBytes) {
      alert('Target size cannot be greater than the original PDF size.');
      setPdfTargetSize('');
      return;
    }

    setPdfTargetSize(value);
  };

  const handlePdfTargetUnitChange = (e) => {
    setPdfTargetSizeUnit(e.target.value);
    setPdfTargetSize('');
  };

  const downloadPdfBlob = async (blob) => {
    await saveBlob(blob, 'compressed.pdf', 'application/pdf');
  };

  const buildCompressedPdfBlob = async (pdfDocument, quality, renderScale) => {
    let doc = null;
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      await page.render({ canvasContext: context, viewport }).promise;

      const imageData = canvas.toDataURL('image/jpeg', quality);
      const orientation = viewport.width > viewport.height ? 'l' : 'p';

      if (!doc) {
        doc = new jsPDF({
          orientation,
          unit: 'pt',
          format: [viewport.width, viewport.height],
          compress: true,
        });
        doc.addImage(imageData, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
      } else {
        doc.addPage([viewport.width, viewport.height], orientation);
        doc.addImage(imageData, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
      }
    }

    return doc.output('blob');
  };

  const compressPdf = async () => {
    if (!uploadedPdfFile) {
      alert('Please upload a PDF first.');
      return;
    }

    setProcessingPdfCompression(true);
    try {
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) {
        throw new Error('PDF engine unavailable.');
      }
      const fileBytes = await uploadedPdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
      const pdfDocument = await loadingTask.promise;

      const targetBytes = pdfTargetSize ? sizeToBytes(pdfTargetSize, pdfTargetSizeUnit) : null;
      const tries = targetBytes
        ? [
            { quality: 0.92, scale: 1.8 },
            { quality: 0.85, scale: 1.6 },
            { quality: 0.78, scale: 1.4 },
            { quality: 0.7, scale: 1.25 },
            { quality: 0.62, scale: 1.1 },
            { quality: 0.55, scale: 1.0 },
          ]
        : [
            { quality: 0.88, scale: 1.6 },
            { quality: 0.8, scale: 1.4 },
            { quality: 0.74, scale: 1.2 },
          ];

      let bestBlob = null;
      for (const attempt of tries) {
        const blob = await buildCompressedPdfBlob(pdfDocument, attempt.quality, attempt.scale);
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (targetBytes && blob.size <= targetBytes) {
          bestBlob = blob;
          break;
        }
      }

      if (!bestBlob) {
        alert('Unable to compress this PDF.');
        setProcessingPdfCompression(false);
        return;
      }

      setCompressedPdfSizeKB(bestBlob.size / 1024);
      setShowPdfConfirmation(true);
      await downloadPdfBlob(bestBlob);
    } catch (error) {
      alert(`PDF compression failed: ${error.message}`);
    } finally {
      setProcessingPdfCompression(false);
    }
  };

  const handleCleanPdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF file.');
      return;
    }

    setUploadedCleanPdfFile(file);
    setOriginalCleanPdfSizeKB(file.size / 1024);
    setShowCleanConfirmation(false);
  };

  const handleCleanPdf = async () => {
    if (!uploadedCleanPdfFile) {
      alert('Please upload a PDF first.');
      return;
    }

    setProcessingClean(true);
    try {
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) {
        throw new Error('PDF engine unavailable.');
      }
      const fileBytes = await uploadedCleanPdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
      const pdfDocument = await loadingTask.promise;

      const targetBytes = uploadedCleanPdfFile.size;
      const tries = [
        { quality: 0.95, scale: 3.5 },
        { quality: 0.93, scale: 3.0 },
        { quality: 0.90, scale: 2.5 },
      ];

      let bestBlob = null;
      let closestDiff = Infinity;

      for (const attempt of tries) {
        const blob = await buildCompressedPdfBlob(pdfDocument, attempt.quality, attempt.scale);
        const diff = Math.abs(blob.size - targetBytes);
        if (diff < closestDiff) {
          closestDiff = diff;
          bestBlob = blob;
        }
      }

      if (!bestBlob) {
        throw new Error('Unable to clean this PDF.');
      }

      setShowCleanConfirmation(true);
      await saveBlob(bestBlob, uploadedCleanPdfFile.name, 'application/pdf');
    } catch (error) {
      alert(`PDF cleaning failed: ${error.message}`);
    } finally {
      setProcessingClean(false);
    }
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


  const handleDownload = async (format) => {
    if (!downloadableBlob) {
      alert("No image to download. Please process an image first.");
      return;
    }
    
    if (format === 'PDF') {
      alert("PDF download is not available for this feature. Please choose JPG or PNG.");
      return;
    }
    try {
      const imageFormat = format === 'JPG' ? 'image/jpeg' : 'image/png';
      let finalBlob = downloadableBlob;
      
      if (downloadableBlob.type !== imageFormat || (format === 'PNG' && downloadableBlob.type !== 'image/png') || (format === 'JPG' && downloadableBlob.type !== 'image/jpeg')) {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        finalBlob = await new Promise((resolve) => canvas.toBlob(resolve, imageFormat, 1.0));
      }
      
      if (!finalBlob) {
        alert("Failed to generate image for download.");
        return;
      }
      
      if (selectedDpi) {
        try {
          finalBlob = await changeDpiBlob(finalBlob, Number(selectedDpi));
        } catch (dpiError) {
          console.error("Failed to change DPI metadata:", dpiError);
        }
      }
      
      await saveBlob(finalBlob, `resized_image.${format.toLowerCase()}`, imageFormat);
    } catch (error) {
      alert(`Download failed: ${error.message}`);
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

                <hr />

                <Form.Group className="mb-3">
                  <Form.Label>Select DPI</Form.Label>
                  <Form.Select
                    value={selectedDpi}
                    onChange={(e) => setSelectedDpi(e.target.value)}
                  >
                    <option value="">Default (Keep original)</option>
                    <option value="100">100 DPI</option>
                    <option value="200">200 DPI</option>
                    <option value="300">300 DPI</option>
                    <option value="400">400 DPI</option>
                    <option value="500">500 DPI</option>
                    <option value="600">600 DPI</option>
                  </Form.Select>
                </Form.Group>
              </>
            )}

            <hr />

            <div>
              <h6 className="mb-3">PDF Compression</h6>
              <Form.Group className="mb-3">
                <Form.Label>Upload PDF</Form.Label>
                <Form.Control type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} />
              </Form.Group>

              {uploadedPdfFile && (
                <>
                  <p className="mb-2">
                    Original PDF Size: <strong>{formatKB(originalPdfSizeKB)}</strong>
                  </p>

                  <Form.Group className="mb-3">
                    <Form.Label>Target PDF Size (optional)</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        step="0.1"
                        value={pdfTargetSize}
                        onChange={handlePdfTargetSizeChange}
                        placeholder="Leave blank for auto best compression"
                      />
                      <Form.Select value={pdfTargetSizeUnit} onChange={handlePdfTargetUnitChange} style={{ maxWidth: '80px' }}>
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                      </Form.Select>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Target size cannot be greater than original PDF size.
                    </Form.Text>
                  </Form.Group>

                  {pdfSuggestedSizes.length > 0 && (
                    <div className="mb-3">
                      <Form.Label>Suggested Sizes</Form.Label>
                      <div className="d-flex flex-wrap gap-2">
                        {pdfSuggestedSizes.map((sizeKB, index) => (
                          <Button
                            key={`${sizeKB}-${index}`}
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              if (sizeKB >= 1024) {
                                setPdfTargetSize((sizeKB / 1024).toFixed(2));
                                setPdfTargetSizeUnit('MB');
                              } else {
                                setPdfTargetSize(sizeKB.toFixed(0));
                                setPdfTargetSizeUnit('KB');
                              }
                            }}
                          >
                            {formatKB(sizeKB)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="d-grid gap-2 mt-3">
                    <Button variant="primary" onClick={compressPdf} disabled={processingPdfCompression}>
                      {processingPdfCompression ? <Spinner animation="border" size="sm" /> : 'Compress PDF'}
                    </Button>
                  </div>

                  {showPdfConfirmation && (
                    <Alert variant="success" className="mt-3">
                      PDF compressed and downloaded successfully.
                    </Alert>
                  )}

                  {compressedPdfSizeKB && (
                    <p className="mt-2 mb-0 text-muted">
                      Compressed PDF Size: {formatKB(compressedPdfSizeKB)}
                    </p>
                  )}
                </>
              )}
            </div>

            <hr />

            <div>
              <h6 className="mb-3">PDF Clean (Security / Header Remover)</h6>
              <Form.Group className="mb-3">
                <Form.Label>Upload PDF</Form.Label>
                <Form.Control type="file" accept="application/pdf,.pdf" onChange={handleCleanPdfUpload} />
              </Form.Group>

              {uploadedCleanPdfFile && (
                <>
                  <p className="mb-2">
                    Original PDF Size: <strong>{formatKB(originalCleanPdfSizeKB)}</strong>
                  </p>

                  <div className="d-grid gap-2 mt-3">
                    <Button variant="primary" onClick={handleCleanPdf} disabled={processingClean}>
                      {processingClean ? <Spinner animation="border" size="sm" /> : 'Clean PDF'}
                    </Button>
                  </div>

                  {showCleanConfirmation && (
                    <Alert variant="success" className="mt-3">
                      PDF cleaned and downloaded successfully.
                    </Alert>
                  )}
                </>
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={7} ref={finalPreviewSectionRef} className="pb-5"> {/* Add pb-5 here */}
        <Card>
          <Card.Body>
            <Card.Title>Processed Image Preview</Card.Title>
            {finalProcessedImage ? (
              <>
                <div className="text-center mb-3 themed-canvas-wrap" style={{ padding: '1rem', overflowX: 'auto' }}>
                  <canvas ref={previewCanvasRef} style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc' }} />
                </div>
                {currentFileSizeKB && <p className="text-center">Current Size: {currentFileSizeKB} KB</p>}
                <div className="d-grid gap-2 mt-3">
                  <FormatDownloadDropdown
                    id="dropdown-download-resize-button" title="Download Processed Image" size="lg"
                    variant="primary"
                    formats={['JPG', 'PNG']}
                    onSelect={handleDownload}
                  />
                </div>
              </>
            ) : (
              <div className="text-center text-muted themed-empty-state" style={{ minHeight: '200px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
