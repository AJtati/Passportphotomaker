import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button, Form, Spinner, Card, Alert, Collapse } from 'react-bootstrap';
import * as pdfjsLib from 'pdfjs-dist';
import { resumeTemplates } from '../utils/resumeTemplates';
import { saveBlob } from '../utils/fileDownload';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const TEXLIVE_COMPILER_URL = 'https://texlive.net/cgi-bin/latexcgi';
const CAN_FETCH_COMPILER = process.env.NODE_ENV === 'development';
// Bypasses CORS locally by proxying through webpack dev-server.
const COMPILER_URL = CAN_FETCH_COMPILER ? '/cgi-bin/latexcgi' : TEXLIVE_COMPILER_URL;

const RESUME_PDF_FILENAME = 'resume.pdf';
const RESUME_PDF_MIME_TYPE = 'application/pdf';
const REMOTE_PREVIEW_FRAME_NAME = 'resume-texlive-preview';

const saveResumePdfWithPicker = async (blob) => {
  if (
    typeof window === 'undefined' ||
    typeof window.showSaveFilePicker !== 'function' ||
    !window.isSecureContext
  ) {
    return false;
  }

  const fileHandle = await window.showSaveFilePicker({
    suggestedName: RESUME_PDF_FILENAME,
    types: [
      {
        description: 'PDF Document',
        accept: { [RESUME_PDF_MIME_TYPE]: ['.pdf'] },
      },
    ],
  });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([blob], { type: RESUME_PDF_MIME_TYPE }));
  await writable.close();
  return true;
};

function ResumeBuilder() {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('jake');
  const [latexCode, setLatexCode] = useState(resumeTemplates.jake.code);
  const [engine, setEngine] = useState('pdflatex');
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.2);
  const [compilerError, setCompilerError] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [usesRemotePreview, setUsesRemotePreview] = useState(false);

  // Keep track of the active blob URL to revoke it on change or unmount
  const activeBlobUrlRef = useRef(null);
  const previewFormRef = useRef(null);
  const downloadFormRef = useRef(null);
  const remotePreviewPendingRef = useRef(false);

  useEffect(() => {
    // Compile the default template on mount so the user sees a result immediately
    handleCompile();

    return () => {
      // Clean up blob URL on unmount
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, []);

  // Update editor when template changes
  const handleTemplateChange = (e) => {
    const key = e.target.value;
    setSelectedTemplateKey(key);
    if (resumeTemplates[key]) {
      setLatexCode(resumeTemplates[key].code);
    }
  };

  const handleEditorChange = (e) => {
    setLatexCode(e.target.value);
    setSelectedTemplateKey('custom');
  };

  const clearPdfState = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setPdfBlobUrl(null);
    setPdfBlob(null);
    setPdfDoc(null);
    setNumPages(0);
  };

  const submitRemotePreview = () => {
    setCompilerError(null);
    setShowLogs(false);
    clearPdfState();
    setUsesRemotePreview(true);
    setIsCompiling(true);

    window.setTimeout(() => {
      if (!previewFormRef.current) {
        setIsCompiling(false);
        setCompilerError({
          summary: 'Unable to submit TeX Live compile form.',
          logs: 'Preview form was not available in the page.',
        });
        setShowLogs(true);
        return;
      }
      remotePreviewPendingRef.current = true;
      previewFormRef.current.submit();
    }, 0);
  };

  const handleRemotePreviewLoad = () => {
    if (!remotePreviewPendingRef.current) return;
    remotePreviewPendingRef.current = false;
    setIsCompiling(false);
  };

  const handleCompile = async () => {
    if (isCompiling) return;

    if (!CAN_FETCH_COMPILER) {
      submitRemotePreview();
      return;
    }

    setIsCompiling(true);
    setCompilerError(null);
    setUsesRemotePreview(false);

    // Add console logging so the user can verify the compiled content in the browser console
    console.log(`[LaTeX Compiler] Initiating compile. Engine: ${engine}. Code length: ${latexCode ? latexCode.length : 0} characters.`);
    console.log(`[LaTeX Compiler] Code Context being sent:\n`, latexCode);

    try {
      const formData = new FormData();
      formData.append('filecontents[]', latexCode);
      formData.append('filename[]', 'document.tex');
      formData.append('engine', engine);
      formData.append('return', 'pdf');

      const response = await fetch(COMPILER_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.toLowerCase().includes('pdf')) {
        const rawBlob = await response.blob();
        
        // Wrap the blob in a File object with the explicit name "resume.pdf" to ensure 
        // the browser honors the filename and extension upon download
        const pdfFile = new File([rawBlob], 'resume.pdf', { type: 'application/pdf' });

        // Revoke the old blob URL to release memory
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        }
        
        const newUrl = URL.createObjectURL(pdfFile);
        activeBlobUrlRef.current = newUrl;
        setPdfBlobUrl(newUrl);
        setPdfBlob(pdfFile);
        
        // Parse and load the PDF document using pdfjs-dist
        try {
          const loadingTask = pdfjsLib.getDocument(newUrl);
          const pdf = await loadingTask.promise;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setCompilerError(null);
          setShowLogs(false);
        } catch (pdfError) {
          console.error("PDFJS loading error:", pdfError);
          setCompilerError({
            summary: "Failed to render PDF preview: " + pdfError.message,
            logs: pdfError.stack || pdfError.toString()
          });
          setPdfDoc(null);
          setNumPages(0);
        }
      } else {
        // It failed and returned a compilation log file
        const logText = await response.text();
        // Parse basic LaTeX errors for better readability
        const errorSummary = parseLatexErrors(logText);
        setCompilerError({
          summary: errorSummary || "LaTeX compilation failed. Check logs below.",
          logs: logText
        });
        setPdfBlobUrl(null);
        setPdfBlob(null);
        setPdfDoc(null);
        setNumPages(0);
        setShowLogs(true);
      }
    } catch (err) {
      setCompilerError({
        summary: `Network error or failed to connect to compilation server: ${err.message}`,
        logs: err.toString()
      });
      setPdfBlobUrl(null);
      setPdfBlob(null);
      setPdfDoc(null);
      setNumPages(0);
      setShowLogs(true);
    } finally {
      setIsCompiling(false);
    }
  };

  // Helper to extract a friendly summary from LaTeX logs
  const parseLatexErrors = (logs) => {
    const lines = logs.split('\n');
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('!') || lines[i].includes('Error:')) {
        errors.push(lines[i]);
        // Also capture the next line for context if available
        if (i + 1 < lines.length && lines[i + 1].trim()) {
          errors.push(lines[i + 1]);
        }
        break; // Just grab the first one for the summary
      }
    }
    return errors.join('\n');
  };

  // Listen to keyboard shortcut Ctrl+Enter or Cmd+Enter
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCompile();
    }
  };

  const handleDownload = async () => {
    if (!pdfBlob) {
      if (downloadFormRef.current) {
        downloadFormRef.current.submit();
      }
      return;
    }
    try {
      const savedWithPicker = await saveResumePdfWithPicker(pdfBlob);
      if (!savedWithPicker) {
        await saveBlob(pdfBlob, RESUME_PDF_FILENAME, RESUME_PDF_MIME_TYPE);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      alert(`Download failed: ${error.message}`);
    }
  };

  return (
    <div className="resume-builder-container">
      <form
        ref={previewFormRef}
        action={TEXLIVE_COMPILER_URL}
        method="post"
        target={REMOTE_PREVIEW_FRAME_NAME}
        encType="multipart/form-data"
        style={{ display: 'none' }}
      >
        <textarea name="filecontents[]" value={latexCode} readOnly />
        <input type="hidden" name="filename[]" value="document.tex" />
        <input type="hidden" name="engine" value={engine} />
        <input type="hidden" name="return" value="pdfjs" />
      </form>
      <form
        ref={downloadFormRef}
        action={TEXLIVE_COMPILER_URL}
        method="post"
        target="_blank"
        encType="multipart/form-data"
        style={{ display: 'none' }}
      >
        <textarea name="filecontents[]" value={latexCode} readOnly />
        <input type="hidden" name="filename[]" value="document.tex" />
        <input type="hidden" name="engine" value={engine} />
        <input type="hidden" name="return" value="pdf" />
      </form>
      <Row className="mb-3">
        <Col md={6} className="d-flex align-items-center gap-3">
          <Form.Group className="d-flex align-items-center gap-2 mb-0">
            <Form.Label className="mb-0 text-nowrap font-weight-bold">Template:</Form.Label>
            <Form.Select 
              value={selectedTemplateKey} 
              onChange={handleTemplateChange}
              size="sm"
              style={{ minWidth: '220px' }}
            >
              {Object.entries(resumeTemplates).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
              {selectedTemplateKey === 'custom' && (
                <option value="custom">✏️ Custom LaTeX Code (Modified)</option>
              )}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6} className="d-flex justify-content-md-end align-items-center gap-2 mt-2 mt-md-0">
          <Form.Group className="d-flex align-items-center gap-2 mb-0">
            <Form.Label className="mb-0 text-nowrap font-weight-bold">Engine:</Form.Label>
            <Form.Select 
              value={engine} 
              onChange={(e) => setEngine(e.target.value)}
              size="sm"
              style={{ width: '110px' }}
            >
              <option value="pdflatex">pdflatex</option>
              <option value="xelatex">xelatex</option>
            </Form.Select>
          </Form.Group>
          <Button 
            variant="success" 
            size="sm" 
            onClick={handleCompile} 
            disabled={isCompiling}
            className="d-flex align-items-center gap-1 font-weight-bold"
          >
            {isCompiling ? (
              <>
                <Spinner animation="border" size="sm" />
                Compiling...
              </>
            ) : (
              <>
                <span className="me-1">⚙️</span> Recompile
              </>
            )}
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleDownload} 
            disabled={(!pdfBlobUrl && !usesRemotePreview) || isCompiling}
            className="d-flex align-items-center gap-1 font-weight-bold"
          >
            📥 Download PDF
          </Button>
        </Col>
      </Row>

      <Row>
        {/* Left Column: LaTeX Code Editor */}
        <Col lg={6} className="mb-4 mb-lg-0">
          <Card className="shadow-sm border-secondary-subtle h-100">
            <Card.Header className="bg-light py-2 px-3 d-flex justify-content-between align-items-center">
              <span className="font-weight-bold text-secondary">LaTeX Code Editor</span>
              <small className="text-muted">Press Ctrl+Enter / ⌘+Enter to compile</small>
            </Card.Header>
            <Card.Body className="p-0 position-relative d-flex flex-column" style={{ minHeight: '550px' }}>
              <Form.Control
                as="textarea"
                value={latexCode}
                onChange={handleEditorChange}
                onKeyDown={handleKeyDown}
                className="latex-editor-textarea flex-grow-1"
                placeholder="Write your LaTeX resume code here..."
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: PDF Preview / Logs */}
        <Col lg={6}>
          <Card className="shadow-sm border-secondary-subtle h-100">
            <Card.Header className="bg-light py-2 px-3 d-flex justify-content-between align-items-center">
              <span className="font-weight-bold text-secondary">ATS PDF Preview</span>
              {pdfDoc && (
                <div className="d-flex align-items-center gap-2">
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.1))}
                    disabled={zoomScale <= 0.6}
                    style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                  >
                    ➖
                  </Button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{Math.round(zoomScale * 100)}%</span>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => setZoomScale(prev => Math.min(2.0, prev + 0.1))}
                    disabled={zoomScale >= 2.0}
                    style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                  >
                    ➕
                  </Button>
                </div>
              )}
              {pdfBlobUrl && !isCompiling && (
                <small className="text-success font-weight-bold">● Compiled Successfully</small>
              )}
              {usesRemotePreview && !isCompiling && (
                <small className="text-success font-weight-bold">● Preview Loaded</small>
              )}
            </Card.Header>
            <Card.Body className="p-0 d-flex flex-column justify-content-between" style={{ minHeight: '550px' }}>
              
              {/* Alert box for compile errors */}
              {compilerError && (
                <div className="p-3">
                  <Alert variant="danger" className="mb-0">
                    <Alert.Heading className="fs-6 font-weight-bold">LaTeX Compilation Error</Alert.Heading>
                    <pre className="error-summary-box mb-2">{compilerError.summary}</pre>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => setShowLogs(!showLogs)}
                    >
                      {showLogs ? 'Hide Detailed Logs' : 'View Detailed Logs'}
                    </Button>
                  </Alert>
                </div>
              )}

              {/* Detailed logs view */}
              <Collapse in={showLogs}>
                <div className="px-3 pb-3">
                  <div className="compiler-log-console">
                    <pre>{compilerError?.logs}</pre>
                  </div>
                </div>
              </Collapse>

              {/* PDF Preview Canvas Area */}
              <div 
                className="flex-grow-1 p-3 d-flex flex-column align-items-center position-relative pdf-canvas-viewport" 
                style={{ overflowY: 'auto', backgroundColor: '#525659', maxHeight: '600px' }}
              >
                {isCompiling && (
                  <div className="pdf-overlay-loader d-flex flex-column align-items-center justify-content-center">
                    <Spinner animation="grow" variant="primary" className="mb-2" />
                    <span className="text-secondary font-weight-bold">Compiling LaTeX document...</span>
                    <small className="text-muted mt-1">Calling TeXLive API compiler</small>
                  </div>
                )}

                {usesRemotePreview ? (
                  <iframe
                    key={REMOTE_PREVIEW_FRAME_NAME}
                    name={REMOTE_PREVIEW_FRAME_NAME}
                    title="ATS PDF Preview"
                    onLoad={handleRemotePreviewLoad}
                    style={{ width: '100%', minHeight: '560px', border: 0, backgroundColor: '#fff' }}
                  />
                ) : pdfDoc && numPages > 0 ? (
                  <div className="w-100 d-flex flex-column align-items-center">
                    {Array.from({ length: numPages }, (_, index) => (
                      <PdfPageCanvas 
                        key={index + 1} 
                        doc={pdfDoc} 
                        pageNum={index + 1} 
                        scale={zoomScale} 
                      />
                    ))}
                  </div>
                ) : (
                  !isCompiling && !compilerError && (
                    <div className="d-flex flex-column align-items-center justify-content-center w-100 text-light p-5 my-auto">
                      <span className="fs-1 mb-2">📄</span>
                      <p className="mb-0 text-light">No compiled PDF available yet.</p>
                      <small className="text-white-50">Click Recompile to render your resume.</small>
                    </div>
                  )
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mt-3 bg-light border-secondary-subtle">
        <Card.Body className="py-2 px-3">
          <small className="text-muted d-block">
            <strong>💡 ATS Optimization Tips:</strong> Use the single-column templates (Jake's Resume / Sans-Serif). Avoid tables for layout structures, graphics, page margins under 0.5 in, or custom symbol lists. The output is a standard vector PDF where text is fully selectable and searchable, which is perfect for parsing by Applicant Tracking Systems.
          </small>
          <small className="text-muted d-block mt-1">
            Resume PDF compilation inspired by and uses{' '}
            <a href="https://texlive.net/run" target="_blank" rel="noreferrer">
              TeX Live Online
            </a>.
          </small>
        </Card.Body>
      </Card>
    </div>
  );
}

// Child helper component to render a single PDF page onto a canvas
function PdfPageCanvas({ doc, pageNum, scale }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let active = true;

    const renderPage = async () => {
      try {
        const page = await doc.getPage(pageNum);
        if (!active) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Cancel any pending render task before launching a new one
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering PDF page ${pageNum}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [doc, pageNum, scale]);

  return (
    <div className="pdf-page-canvas-wrapper shadow-sm mb-3 bg-white p-1 border">
      <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
      <div className="text-center text-muted small py-1 bg-light border-top" style={{ fontSize: '0.7rem' }}>
        Page {pageNum} of {doc.numPages}
      </div>
    </div>
  );
}

export default ResumeBuilder;
