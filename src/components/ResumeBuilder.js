import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button, Form, Spinner, Card, Alert, Collapse } from 'react-bootstrap';
import * as pdfjsLib from 'pdfjs-dist';
import { resumeTemplates } from '../utils/resumeTemplates';
import { saveBlob } from '../utils/fileDownload';
import {
  SECTION_OPTIONS,
  cloneResumeModel,
  createDefaultResumeModel,
  createSection,
  generateLatexFromResumeModel,
  normalizeSections,
  parseLatexToResumeModel,
} from '../utils/visualResume';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const TEXLIVE_COMPILER_URL = 'https://texlive.net/cgi-bin/latexcgi';
const CAN_FETCH_COMPILER = process.env.NODE_ENV === 'development';
// Bypasses CORS locally by proxying through webpack dev-server.
const COMPILER_URL = CAN_FETCH_COMPILER ? '/cgi-bin/latexcgi' : TEXLIVE_COMPILER_URL;

const RESUME_PDF_FILENAME = 'resume.pdf';
const RESUME_PDF_MIME_TYPE = 'application/pdf';
const REMOTE_PREVIEW_FRAME_NAME = 'resume-texlive-preview';
const DEFAULT_OWN_CLOUD_COMPILER_URL = 'https://140-238-93-179.sslip.io/compile';
const OWN_CLOUD_COMPILER_URL =
  process.env.REACT_APP_OWN_CLOUD_COMPILER_URL || DEFAULT_OWN_CLOUD_COMPILER_URL;
const OWN_CLOUD_COMPILER_STORAGE_KEY = 'ownCloudCompilerUrl';

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
  const initialResumeModel = parseLatexToResumeModel(resumeTemplates.jake.code) || createDefaultResumeModel();
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('jake');
  const [latexCode, setLatexCode] = useState(resumeTemplates.jake.code);
  const [resumeModel, setResumeModel] = useState(initialResumeModel);
  const [builderMode, setBuilderMode] = useState('visual');
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
      const nextLatex = resumeTemplates[key].code;
      setLatexCode(nextLatex);
      const parsedModel = parseLatexToResumeModel(nextLatex);
      if (parsedModel) {
        setResumeModel(parsedModel);
      }
    }
  };

  const handleEditorChange = (e) => {
    const nextLatex = e.target.value;
    setLatexCode(nextLatex);
    setSelectedTemplateKey('custom');
    const parsedModel = parseLatexToResumeModel(nextLatex);
    if (parsedModel) {
      setResumeModel(parsedModel);
    }
  };

  const handleVisualModelChange = (nextModel) => {
    const normalizedModel = {
      ...nextModel,
      sections: normalizeSections(nextModel.sections),
    };
    setResumeModel(normalizedModel);
    setLatexCode(generateLatexFromResumeModel(normalizedModel));
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

  const getOwnCloudCompilerUrl = () => {
    if (typeof window === 'undefined') return OWN_CLOUD_COMPILER_URL;
    return localStorage.getItem(OWN_CLOUD_COMPILER_STORAGE_KEY) || OWN_CLOUD_COMPILER_URL;
  };

  const handleOwnCloudCompile = async () => {
    if (isCompiling) return;

    const ownCloudCompilerUrl = getOwnCloudCompilerUrl();
    if (!ownCloudCompilerUrl) {
      setCompilerError({
        summary: 'Own cloud compiler URL is not configured.',
        logs: `Set REACT_APP_OWN_CLOUD_COMPILER_URL before building, or set localStorage.${OWN_CLOUD_COMPILER_STORAGE_KEY} for testing.`,
      });
      setShowLogs(true);
      return;
    }

    setIsCompiling(true);
    setCompilerError(null);
    setUsesRemotePreview(false);

    try {
      const formData = new FormData();
      formData.append('filecontents[]', latexCode);
      formData.append('filename[]', 'document.tex');
      formData.append('engine', engine);
      formData.append('return', 'pdf');

      const response = await fetch(ownCloudCompilerUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.toLowerCase().includes('pdf')) {
        const rawBlob = await response.blob();
        const pdfFile = new File([rawBlob], RESUME_PDF_FILENAME, { type: RESUME_PDF_MIME_TYPE });

        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        }

        const newUrl = URL.createObjectURL(pdfFile);
        activeBlobUrlRef.current = newUrl;
        setPdfBlobUrl(newUrl);
        setPdfBlob(pdfFile);

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
        const logText = await response.text();
        const errorSummary = parseLatexErrors(logText);
        setCompilerError({
          summary: errorSummary || "Own cloud LaTeX compilation failed. Check logs below.",
          logs: logText
        });
        clearPdfState();
        setShowLogs(true);
      }
    } catch (err) {
      setCompilerError({
        summary: `Own cloud compiler failed: ${err.message}`,
        logs: err.toString()
      });
      clearPdfState();
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
      <Row className="mb-3 resume-controls-row">
        <Col md={6} className="resume-template-col">
          <Form.Group className="resume-control-group mb-0">
            <Form.Label className="mb-0 text-nowrap font-weight-bold">Template:</Form.Label>
            <Form.Select 
              value={selectedTemplateKey} 
              onChange={handleTemplateChange}
              size="sm"
              className="resume-template-select"
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
        <Col md={6} className="resume-actions-col mt-2 mt-md-0">
          <Form.Group className="resume-control-group resume-engine-group mb-0">
            <Form.Label className="mb-0 text-nowrap font-weight-bold">Engine:</Form.Label>
            <Form.Select 
              value={engine} 
              onChange={(e) => setEngine(e.target.value)}
              size="sm"
              className="resume-engine-select"
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
            className="resume-action-button d-flex align-items-center justify-content-center gap-1 font-weight-bold"
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
            variant="outline-info"
            size="sm"
            onClick={handleOwnCloudCompile}
            disabled={isCompiling}
            className="resume-action-button d-flex align-items-center justify-content-center gap-1 font-weight-bold"
          >
            ☁️ Compile on Own Cloud
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleDownload} 
            disabled={(!pdfBlobUrl && !usesRemotePreview) || isCompiling}
            className="resume-action-button d-flex align-items-center justify-content-center gap-1 font-weight-bold"
          >
            📥 Download PDF
          </Button>
        </Col>
      </Row>

      <Row>
        {/* Left Column: Visual Builder / LaTeX Code Editor */}
        <Col lg={6} className="mb-4 mb-lg-0">
          <Card className="shadow-sm border-secondary-subtle h-100">
            <Card.Header className="resume-card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
              <span className="font-weight-bold text-secondary">
                {builderMode === 'visual' ? 'Visual Resume Builder' : 'LaTeX Code Editor'}
              </span>
              <div className="resume-mode-toggle" role="group" aria-label="Resume builder mode">
                <Button
                  variant={builderMode === 'visual' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setBuilderMode('visual')}
                >
                  Visual
                </Button>
                <Button
                  variant={builderMode === 'latex' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setBuilderMode('latex')}
                >
                  LaTeX
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0 position-relative d-flex flex-column" style={{ minHeight: '550px' }}>
              {builderMode === 'visual' ? (
                <VisualResumeBuilder
                  model={resumeModel}
                  onChange={handleVisualModelChange}
                />
              ) : (
                <Form.Control
                  as="textarea"
                  value={latexCode}
                  onChange={handleEditorChange}
                  onKeyDown={handleKeyDown}
                  className="latex-editor-textarea flex-grow-1"
                  placeholder="Write your LaTeX resume code here..."
                />
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: PDF Preview / Logs */}
        <Col lg={6}>
          <Card className="shadow-sm border-secondary-subtle h-100">
            <Card.Header className="resume-card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center">
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

function VisualResumeBuilder({ model, onChange }) {
  const updateModel = (producer) => {
    const nextModel = cloneResumeModel(model);
    producer(nextModel);
    onChange(nextModel);
  };

  const updateContact = (field, value) => {
    updateModel((draft) => {
      draft.contact[field] = value;
    });
  };

  const moveSection = (index, direction) => {
    updateModel((draft) => {
      if (draft.sections[index]?.type === 'summary') return;
      const targetIndex = index + direction;
      if (targetIndex < 1 || targetIndex >= draft.sections.length) return;
      const [section] = draft.sections.splice(index, 1);
      draft.sections.splice(targetIndex, 0, section);
    });
  };

  const removeSection = (index) => {
    updateModel((draft) => {
      if (draft.sections[index]?.type === 'summary') return;
      draft.sections.splice(index, 1);
    });
  };

  const addSection = (type) => {
    if (!type) return;
    updateModel((draft) => {
      if (type === 'summary' && draft.sections.some((section) => section.type === 'summary')) return;
      draft.sections.push(createSection(type));
    });
  };

  const updateSection = (sectionIndex, producer) => {
    updateModel((draft) => {
      producer(draft.sections[sectionIndex]);
    });
  };

  const addItem = (sectionIndex) => {
    updateSection(sectionIndex, (section) => {
      if (section.type === 'summary') {
        section.bullets = [...(section.bullets || []), 'Add a concise impact statement.'];
      } else if (section.type === 'experience') {
        section.items.push({ role: 'Job Title', company: 'Company', location: 'City, State', dates: 'Jan 2024 -- Present', bullets: ['Describe measurable impact and relevant tools.'] });
      } else if (section.type === 'projects') {
        section.items.push({ name: 'Project Name', stack: 'Tech Stack', dates: '2024', bullets: ['Describe the problem, implementation, and result.'] });
      } else if (section.type === 'education') {
        section.items.push({ school: 'School Name', location: 'City, State', degree: 'Degree / Certification', dates: '2020 -- 2024' });
      } else if (section.type === 'skills') {
        section.groups.push({ label: 'Category', value: 'Skill one, Skill two' });
      }
    });
  };

  return (
    <div className="visual-resume-builder">
      <div className="visual-builder-band">
        <div className="visual-builder-grid">
          <Form.Group>
            <Form.Label>Name</Form.Label>
            <Form.Control size="sm" value={model.contact.name} onChange={(e) => updateContact('name', e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Phone</Form.Label>
            <Form.Control size="sm" value={model.contact.phone} onChange={(e) => updateContact('phone', e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Email</Form.Label>
            <Form.Control size="sm" value={model.contact.email} onChange={(e) => updateContact('email', e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Location</Form.Label>
            <Form.Control size="sm" value={model.contact.location} onChange={(e) => updateContact('location', e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>LinkedIn</Form.Label>
            <Form.Control size="sm" value={model.contact.linkedin} onChange={(e) => updateContact('linkedin', e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>GitHub</Form.Label>
            <Form.Control size="sm" value={model.contact.github} onChange={(e) => updateContact('github', e.target.value)} />
          </Form.Group>
        </div>
      </div>

      <div className="visual-builder-toolbar">
        <Form.Select size="sm" defaultValue="" onChange={(e) => { addSection(e.target.value); e.target.value = ''; }}>
          <option value="" disabled>Add section</option>
          {SECTION_OPTIONS
            .filter((option) => option.type !== 'summary' || !model.sections.some((section) => section.type === 'summary'))
            .map((option) => (
            <option key={option.type} value={option.type}>{option.title}</option>
          ))}
        </Form.Select>
      </div>

      <div className="visual-section-list">
        {model.sections.map((section, sectionIndex) => (
          <section className="visual-section-panel" key={section.id}>
            <div className="visual-section-header">
              <Form.Control
                size="sm"
                value={section.title}
                onChange={(e) => updateSection(sectionIndex, (draft) => { draft.title = e.target.value; })}
                className="visual-section-title-input"
              />
              <div className="visual-section-actions">
                <Button size="sm" variant="outline-secondary" onClick={() => moveSection(sectionIndex, -1)} disabled={section.type === 'summary' || sectionIndex <= 1}>Up</Button>
                <Button size="sm" variant="outline-secondary" onClick={() => moveSection(sectionIndex, 1)} disabled={section.type === 'summary' || sectionIndex === model.sections.length - 1}>Down</Button>
                <Button size="sm" variant="outline-danger" onClick={() => removeSection(sectionIndex)} disabled={section.type === 'summary'}>Remove</Button>
              </div>
            </div>

            {section.type === 'summary' && (
              <div className="visual-entry-stack">
                {(section.bullets || ['']).map((bullet, bulletIndex) => (
                  <div className="visual-bullet-row" key={`${section.id}-summary-${bulletIndex}`}>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={bullet}
                      onChange={(e) => updateSection(sectionIndex, (draft) => {
                        draft.bullets = draft.bullets || [];
                        draft.bullets[bulletIndex] = e.target.value;
                      })}
                    />
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => updateSection(sectionIndex, (draft) => { draft.bullets.splice(bulletIndex, 1); })}
                      disabled={(section.bullets || []).length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline-primary" onClick={() => addItem(sectionIndex)}>Add summary point</Button>
              </div>
            )}

            {section.type === 'experience' && (
              <VisualEntryList
                section={section}
                sectionIndex={sectionIndex}
                updateSection={updateSection}
                addItem={addItem}
                fields={[
                  ['role', 'Role'],
                  ['company', 'Company'],
                  ['location', 'Location'],
                  ['dates', 'Dates'],
                ]}
              />
            )}

            {section.type === 'projects' && (
              <VisualEntryList
                section={section}
                sectionIndex={sectionIndex}
                updateSection={updateSection}
                addItem={addItem}
                fields={[
                  ['name', 'Project'],
                  ['stack', 'Stack'],
                  ['dates', 'Dates'],
                ]}
              />
            )}

            {section.type === 'education' && (
              <VisualEntryList
                section={section}
                sectionIndex={sectionIndex}
                updateSection={updateSection}
                addItem={addItem}
                fields={[
                  ['school', 'School'],
                  ['degree', 'Degree'],
                  ['location', 'Location'],
                  ['dates', 'Dates'],
                ]}
                hideBullets
              />
            )}

            {section.type === 'skills' && (
              <div className="visual-entry-stack">
                {(section.groups || []).map((group, groupIndex) => (
                  <div className="visual-skill-row" key={`${section.id}-skill-${groupIndex}`}>
                    <Form.Control
                      size="sm"
                      value={group.label}
                      onChange={(e) => updateSection(sectionIndex, (draft) => { draft.groups[groupIndex].label = e.target.value; })}
                      placeholder="Category"
                    />
                    <Form.Control
                      size="sm"
                      value={group.value}
                      onChange={(e) => updateSection(sectionIndex, (draft) => { draft.groups[groupIndex].value = e.target.value; })}
                      placeholder="Skills"
                    />
                    <Button size="sm" variant="outline-danger" onClick={() => updateSection(sectionIndex, (draft) => { draft.groups.splice(groupIndex, 1); })}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline-primary" onClick={() => addItem(sectionIndex)}>Add skill group</Button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function VisualEntryList({ section, sectionIndex, updateSection, addItem, fields, hideBullets = false }) {
  return (
    <div className="visual-entry-stack">
      {(section.items || []).map((item, itemIndex) => (
        <div className="visual-entry-panel" key={`${section.id}-item-${itemIndex}`}>
          <div className="visual-entry-header">
            <span>{item.role || item.name || item.school || 'Entry'}</span>
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => updateSection(sectionIndex, (draft) => { draft.items.splice(itemIndex, 1); })}
            >
              Remove
            </Button>
          </div>
          <div className="visual-builder-grid visual-entry-grid">
            {fields.map(([field, label]) => (
              <Form.Group key={field}>
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  size="sm"
                  value={item[field] || ''}
                  onChange={(e) => updateSection(sectionIndex, (draft) => { draft.items[itemIndex][field] = e.target.value; })}
                />
              </Form.Group>
            ))}
          </div>
          {!hideBullets && (
            <div className="visual-bullet-list">
              {(item.bullets || []).map((bullet, bulletIndex) => (
                <div className="visual-bullet-row" key={`${section.id}-bullet-${itemIndex}-${bulletIndex}`}>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={bullet}
                    onChange={(e) => updateSection(sectionIndex, (draft) => { draft.items[itemIndex].bullets[bulletIndex] = e.target.value; })}
                  />
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => updateSection(sectionIndex, (draft) => { draft.items[itemIndex].bullets.splice(bulletIndex, 1); })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => updateSection(sectionIndex, (draft) => { draft.items[itemIndex].bullets.push('Describe measurable impact.'); })}
              >
                Add bullet
              </Button>
            </div>
          )}
        </div>
      ))}
      <Button size="sm" variant="outline-primary" onClick={() => addItem(sectionIndex)}>
        Add entry
      </Button>
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
