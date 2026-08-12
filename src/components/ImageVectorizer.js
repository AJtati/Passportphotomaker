import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import FormatDownloadDropdown from './FormatDownloadDropdown';
import { saveBlob } from '../utils/fileDownload';
import {
  CARVING_SENSITIVITY,
  VECTOR_DETAIL,
  VECTOR_PRESETS,
  getVectorOptions,
  prepareSvg,
  safeVectorFilename,
  svgToDxf,
} from '../utils/vectorExport';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24_000_000;

const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const loadImageDimensions = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => reject(new Error('This image could not be read. Try a different JPG or PNG.'));
  image.src = url;
});

const ImageVectorizer = () => {
  const [source, setSource] = useState(null);
  const [preset, setPreset] = useState('nameplate');
  const [detail, setDetail] = useState('detailed');
  const [outputWidth, setOutputWidth] = useState('100');
  const [margin, setMargin] = useState('5');
  const [sensitivity, setSensitivity] = useState('balanced');
  const [invertCarving, setInvertCarving] = useState(false);
  const [vector, setVector] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const workerRef = useRef(null);
  const isNameplate = preset === 'nameplate';

  useEffect(() => () => workerRef.current?.terminate(), []);
  useEffect(() => () => {
    if (source?.url) URL.revokeObjectURL(source.url);
  }, [source?.url]);
  useEffect(() => () => {
    if (vector?.url) URL.revokeObjectURL(vector.url);
  }, [vector?.url]);

  const clearVector = () => {
    setVector(null);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    clearVector();

    const isSupported = ['image/jpeg', 'image/png'].includes(file.type)
      || /\.(jpe?g|png)$/i.test(file.name);
    if (!isSupported) {
      setError('Choose a JPG or PNG image. Other image formats are not supported yet.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('This image is larger than 20 MB. Resize or compress it before vectorising.');
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const dimensions = await loadImageDimensions(url);
      if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
        URL.revokeObjectURL(url);
        setError('This image exceeds 24 megapixels. Resize it first to keep conversion reliable.');
        return;
      }
      setSource({ file, url, ...dimensions });
    } catch (uploadError) {
      URL.revokeObjectURL(url);
      setError(uploadError.message);
    }
  };

  const handleUpload = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const convertImage = async () => {
    if (!source || isConverting) return;
    const physicalWidth = Number(outputWidth);
    if (!Number.isFinite(physicalWidth) || physicalWidth < 1 || physicalWidth > 2000) {
      setError('Enter an output width between 1 and 2,000 mm.');
      return;
    }
    const physicalMargin = Number(margin);
    if (isNameplate && (!Number.isFinite(physicalMargin) || physicalMargin < 0 || physicalMargin * 2 >= physicalWidth)) {
      setError('Enter a white margin smaller than half of the finished width.');
      return;
    }
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      setError('This browser cannot run the local vector engine. Update your browser and try again.');
      return;
    }

    setError('');
    clearVector();
    setIsConverting(true);

    try {
      const buffer = await source.file.arrayBuffer();
      const worker = new Worker(new URL('../workers/vtracer.worker.js', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      const svgText = await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Conversion took too long. Try a smaller image.')), 120000);
        worker.onmessage = ({ data }) => {
          window.clearTimeout(timeout);
          if (data.error) reject(new Error(data.error));
          else resolve(data.svg);
        };
        worker.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error('The vector engine could not start in this browser.'));
        };
        worker.postMessage({
          buffer,
          mimeType: source.file.type || (/\.png$/i.test(source.file.name) ? 'image/png' : 'image/jpeg'),
          options: {
            ...getVectorOptions(preset, detail),
            ...(isNameplate ? { binaryThreshold: CARVING_SENSITIVITY[sensitivity].threshold } : {}),
          },
          carving: isNameplate ? {
            threshold: CARVING_SENSITIVITY[sensitivity].threshold,
            invert: invertCarving,
          } : null,
        }, [buffer]);
      });

      const result = prepareSvg(svgText, physicalWidth, isNameplate ? {
        whiteBackground: true,
        monochrome: true,
        marginMm: physicalMargin,
      } : undefined);
      const blob = new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' });
      setVector({ ...result, url: URL.createObjectURL(blob) });
    } catch (conversionError) {
      setError(conversionError.message || 'Vector conversion failed. Try a simpler or smaller image.');
    } finally {
      workerRef.current?.terminate();
      workerRef.current = null;
      setIsConverting(false);
    }
  };

  const downloadVectorPdf = async (filename) => {
    await import('svg2pdf.js');
    const document = new DOMParser().parseFromString(vector.svg, 'image/svg+xml');
    const svgElement = document.documentElement;
    const orientation = vector.widthMm > vector.heightMm ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [vector.widthMm, vector.heightMm],
      compress: true,
    });
    pdf.setProperties({ title: filename, creator: 'Photo Print Utility' });
    await pdf.svg(svgElement, { x: 0, y: 0, width: vector.widthMm, height: vector.heightMm });
    await saveBlob(pdf.output('blob'), `${filename}.pdf`, 'application/pdf');
  };

  const handleDownload = async (format) => {
    if (!vector || isDownloading) return;
    setError('');
    setIsDownloading(true);
    const filename = safeVectorFilename(source?.file.name);

    try {
      if (format === 'SVG') {
        await saveBlob(new Blob([vector.svg], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`, 'image/svg+xml');
      } else if (format === 'PDF') {
        await downloadVectorPdf(filename);
      } else if (format === 'DXF') {
        const dxf = svgToDxf(vector.svg, vector.widthMm);
        await saveBlob(new Blob([dxf], { type: 'application/dxf;charset=utf-8' }), `${filename}.dxf`, 'application/dxf');
      }
    } catch (downloadError) {
      setError(`${format} download failed. ${downloadError.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="vector-workspace">
      <Row className="g-4">
        <Col lg={4}>
          <Card className="vector-controls-card">
            <Card.Body>
              <Card.Title>Convert image to vector</Card.Title>
              <p className="text-muted mb-4">
                Trace a JPG or PNG into scalable paths for print, engraving, CNC and laser workflows.
              </p>

              <Form.Group className="mb-3" controlId="vector-image-upload">
                <Form.Label>Source image</Form.Label>
                <Form.Control type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={handleUpload} disabled={isConverting} />
                <Form.Text className="text-muted">JPG or PNG, up to 20 MB and 24 megapixels.</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="vector-purpose">
                <Form.Label>Conversion type</Form.Label>
                <Form.Select value={preset} onChange={(event) => { setPreset(event.target.value); clearVector(); }} disabled={isConverting}>
                  {Object.entries(VECTOR_PRESETS).map(([key, option]) => (
                    <option key={key} value={key}>{option.label}</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">{VECTOR_PRESETS[preset].help}</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="vector-detail">
                <Form.Label>Path detail</Form.Label>
                <Form.Select value={detail} onChange={(event) => { setDetail(event.target.value); clearVector(); }} disabled={isConverting}>
                  {Object.entries(VECTOR_DETAIL).map(([key, option]) => (
                    <option key={key} value={key}>{option.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              {isNameplate && (
                <div className="vector-carving-settings">
                  <Form.Group className="mb-3" controlId="vector-carving-sensitivity">
                    <Form.Label>Artwork pickup</Form.Label>
                    <Form.Select value={sensitivity} onChange={(event) => { setSensitivity(event.target.value); clearVector(); }} disabled={isConverting}>
                      {Object.entries(CARVING_SENSITIVITY).map(([key, option]) => (
                        <option key={key} value={key}>{option.label}</option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">Use faint detail for light text or fine ornament.</Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="vector-white-margin">
                    <Form.Label>White margin</Form.Label>
                    <div className="vector-measure-control">
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={margin}
                        onChange={(event) => { setMargin(event.target.value); clearVector(); }}
                        disabled={isConverting}
                        inputMode="decimal"
                      />
                      <span aria-hidden="true">mm</span>
                    </div>
                  </Form.Group>

                  <Form.Check
                    className="mb-3"
                    id="vector-invert-carving"
                    type="checkbox"
                    label="Light artwork on a dark background"
                    checked={invertCarving}
                    onChange={(event) => { setInvertCarving(event.target.checked); clearVector(); }}
                    disabled={isConverting}
                  />
                </div>
              )}

              <Form.Group className="mb-4" controlId="vector-output-width">
                <Form.Label>Finished width</Form.Label>
                <div className="vector-measure-control">
                  <Form.Control
                    type="number"
                    min="1"
                    max="2000"
                    step="0.1"
                    value={outputWidth}
                    onChange={(event) => { setOutputWidth(event.target.value); clearVector(); }}
                    disabled={isConverting}
                    inputMode="decimal"
                  />
                  <span aria-hidden="true">mm</span>
                </div>
                <Form.Text className="text-muted">Used as the real-world size in SVG, PDF and DXF.</Form.Text>
              </Form.Group>

              <div className="d-grid">
                <Button onClick={convertImage} disabled={!source || isConverting}>
                  {isConverting ? <><Spinner animation="border" size="sm" className="me-2" />Tracing paths…</> : 'Convert to Vector'}
                </Button>
              </div>

              <p className="vector-privacy-note mb-0" role="note">
                Conversion runs on this device. Your image is not uploaded.
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          {error && <Alert variant="danger" role="alert">{error}</Alert>}
          <div className="vector-comparison" aria-live="polite">
            <section className="vector-preview-panel" aria-labelledby="original-preview-heading">
              <div className="vector-preview-heading">
                <h2 id="original-preview-heading">Original</h2>
                {source && <span>{source.width} × {source.height} px</span>}
              </div>
              <div className="vector-preview-stage">
                {source ? <img src={source.url} alt={`Original ${source.file.name}`} /> : <p>Choose a JPG or PNG to preview it here.</p>}
              </div>
              {source && <p className="vector-file-meta">{source.file.name} · {formatBytes(source.file.size)}</p>}
            </section>

            <section className={`vector-preview-panel${vector ? ' is-ready' : ''}`} aria-labelledby="vector-preview-heading">
              <div className="vector-preview-heading">
                <h2 id="vector-preview-heading">Vector result</h2>
                {vector && <span>{vector.widthMm.toFixed(1)} × {vector.heightMm.toFixed(1)} mm</span>}
              </div>
              <div className="vector-preview-stage">
                {isConverting ? (
                  <div className="vector-preview-status"><Spinner animation="border" /><p>Tracing clean, scalable paths…</p></div>
                ) : vector ? (
                  <img src={vector.url} alt="Converted vector preview" />
                ) : (
                  <p>Your converted vector will appear here.</p>
                )}
              </div>
              {vector && <p className="vector-file-meta">{vector.pathCount.toLocaleString()} paths · {formatBytes(vector.byteSize)}</p>}
            </section>
          </div>

          {isNameplate && vector && (
            <div className="vector-production-spec" role="status">
              <strong>Print-ready carving artwork</strong>
              <span>Pure black paths · white background · {Number(margin).toLocaleString()} mm margin · exact-size exports</span>
            </div>
          )}

          <div className="vector-download-bar">
            <div>
              <strong>Production files</strong>
              <span>{isNameplate ? 'PDF for print, SVG for design, DXF paths for laser/CNC.' : 'SVG for design, PDF for print, DXF for CAD/CAM.'}</span>
            </div>
            <FormatDownloadDropdown
              id="vector-download-formats"
              title={isDownloading ? 'Preparing file…' : 'Download Vector'}
              formats={['SVG', 'PDF', 'DXF']}
              onSelect={handleDownload}
              disabled={!vector || isDownloading || isConverting}
            />
          </div>
          {!['nameplate', 'engraving'].includes(preset) && vector && (
            <p className="vector-dxf-note mb-0">DXF exports the outlines of each colour region as millimetre polylines.</p>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ImageVectorizer;
