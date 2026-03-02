import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Navbar, DropdownButton, Dropdown, Nav } from 'react-bootstrap';
import Settings from './components/Settings';
import Editor from './components/Editor';
import Preview from './components/Preview';
import MultiPhoto from './components/MultiPhoto';
import ImageResizer from './components/ImageResizer';
import CollagePrint from './components/CollagePrint';
import FormatDownloadDropdown from './components/FormatDownloadDropdown';
import Logo from './components/Logo';
import { saveCanvasDocument } from './utils/canvasExport';
import './styles/App.css';

// --- Constants ---
const DPI = 300;
const PRESET_PASSPORT_SIZES = {
  'india': { width: 35, height: 45, unit: 'mm', name: 'India' },
  'us': { width: 2, height: 2, unit: 'in', name: 'US' },
  'visa': { width: 35, height: 35, unit: 'mm', name: 'Visa' },
};
const PRESET_PAPER_SIZES = {
  'a4': { width: 210, height: 297, unit: 'mm', name: 'A4' },
  'letter': { width: 8.5, height: 11, unit: 'in', name: 'Letter' },
  '4x6': { width: 4, height: 6, unit: 'in', name: '4x6 Inch' },
};

const TAB_ROUTES = {
  passport: '/passport',
  multi: '/multi',
  resize: '/resize',
  collage: '/collage',
};

const ROUTE_TO_TAB = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, route]) => [route, tab])
);

const DEFAULT_TAB = 'passport';
const THEME_STORAGE_KEY = 'ui-theme-mode';

const getTabFromHash = () => {
  const rawHash = window.location.hash.replace(/^#/, '');
  const normalizedRoute = rawHash.startsWith('/') ? rawHash : `/${rawHash}`;
  return ROUTE_TO_TAB[normalizedRoute] || DEFAULT_TAB;
};

const getSystemTheme = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getResolvedTheme = (mode) => (mode === 'system' ? getSystemTheme() : mode);

const getInitialThemeMode = () => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
};

// --- Main App Component ---
function App() {
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [isNavExpanded, setIsNavExpanded] = useState(false); // New state for Navbar collapse
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState(getResolvedTheme(getInitialThemeMode()));

  useEffect(() => {
    const syncTabWithHash = () => {
      setActiveTab(getTabFromHash());
    };

    if (!window.location.hash) {
      window.location.hash = TAB_ROUTES[DEFAULT_TAB];
    } else {
      syncTabWithHash();
    }

    window.addEventListener('hashchange', syncTabWithHash);
    return () => window.removeEventListener('hashchange', syncTabWithHash);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyResolvedTheme = () => setResolvedTheme(getResolvedTheme(themeMode));
    applyResolvedTheme();
    media.addEventListener('change', applyResolvedTheme);
    return () => media.removeEventListener('change', applyResolvedTheme);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-bs-theme', resolvedTheme);
  }, [resolvedTheme]);

  const handleTabSelect = (tabKey) => {
    if (!TAB_ROUTES[tabKey]) return;
    window.location.hash = TAB_ROUTES[tabKey];
    setIsNavExpanded(false);
  };

  const handleThemeSelect = (mode) => {
    if (mode === 'light' || mode === 'dark' || mode === 'system') {
      setThemeMode(mode);
    }
  };

  return (
    <>
      <Navbar expand="lg" className="mb-4 shadow-sm top-nav" expanded={isNavExpanded} onToggle={setIsNavExpanded}>
        <Container>
          <Navbar.Brand 
            onClick={() => handleTabSelect('passport')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Logo />
            Photo Print Utility
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav 
              activeKey={activeTab} 
              onSelect={handleTabSelect}
              className="ms-auto"
            >
              <Nav.Item>
                <Nav.Link eventKey="passport">Passport Photo Creator</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="multi">Multi-Photo Print</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="resize">Change Photo Size</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="collage">Collage Print</Nav.Link>
              </Nav.Item>
            </Nav>
            <DropdownButton
              id="theme-dropdown"
              title={`Theme: ${themeMode === 'system' ? `System (${resolvedTheme})` : themeMode}`}
              variant="outline-secondary"
              size="sm"
              className="ms-lg-3 mt-2 mt-lg-0"
              onSelect={handleThemeSelect}
            >
              <Dropdown.Item eventKey="system" active={themeMode === 'system'}>System</Dropdown.Item>
              <Dropdown.Item eventKey="light" active={themeMode === 'light'}>Light</Dropdown.Item>
              <Dropdown.Item eventKey="dark" active={themeMode === 'dark'}>Dark</Dropdown.Item>
            </DropdownButton>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        {activeTab === 'passport' && <PassportPhotoCreator />}
        {activeTab === 'multi' && <MultiPhoto />}
        {activeTab === 'resize' && <ImageResizer />}
        {activeTab === 'collage' && <CollagePrint />}
      </Container>
    </>
  );
}


// --- Component for the Passport Photo functionality ---
function PassportPhotoCreator() {
  const previewCanvasRef = useRef(null);
  const previewSectionRef = useRef(null); // Ref for the preview section for scrolling

  const [uploadedImage, setUploadedImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [passport, setPassport] = useState(PRESET_PASSPORT_SIZES.india);
  const [paper, setPaper] = useState(PRESET_PAPER_SIZES.a4);
  const [passportPreset, setPassportPreset] = useState('india');
  const [paperPreset, setPaperPreset] = useState('a4');
  const [addBorder, setAddBorder] = useState(false);

  const sanitizePassport = (value) => {
    const safeWidth = Number.isFinite(value?.width) ? Math.max(0.1, value.width) : passport.width;
    const safeHeight = Number.isFinite(value?.height) ? Math.max(0.1, value.height) : passport.height;
    const safeUnit = value?.unit === 'in' || value?.unit === 'mm' ? value.unit : passport.unit;
    return { ...value, width: safeWidth, height: safeHeight, unit: safeUnit };
  };

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setCroppedImage(null); 
      }
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid image file (JPG, PNG).");
    }
  };

  const handleSettingsChange = (newSettings) => {
    let shouldResetCrop = false;
    if (newSettings.passport) {
      setPassport(sanitizePassport(newSettings.passport));
      shouldResetCrop = true;
    }
    if (newSettings.paper) setPaper(newSettings.paper);
    if (newSettings.addBorder !== undefined) setAddBorder(newSettings.addBorder);
    if (newSettings.passportPreset) {
      if (newSettings.passportPreset !== passportPreset) shouldResetCrop = true;
      setPassportPreset(newSettings.passportPreset);
      if (PRESET_PASSPORT_SIZES[newSettings.passportPreset]) {
        setPassport(sanitizePassport(PRESET_PASSPORT_SIZES[newSettings.passportPreset]));
      }
    }
    if (newSettings.paperPreset) {
      setPaperPreset(newSettings.paperPreset);
      setPaper(PRESET_PAPER_SIZES[newSettings.paperPreset]);
    }
    if (shouldResetCrop) setCroppedImage(null);
  };

  const handleCropApplied = (croppedImageUrl) => {
    setCroppedImage(croppedImageUrl);
    if (previewSectionRef.current) {
      previewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownload = async (format) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) { alert("Preview canvas not ready."); return; }
    try {
      await saveCanvasDocument(canvas, format, {
        filename: `passport_photos.${format.toLowerCase()}`,
        quality: 1.0,
        pdfOptions: {
          filename: 'passport_photos.pdf',
          unit: paper.unit,
          width: paper.width,
          height: paper.height,
        },
      });
    } catch (error) {
      alert(`Download failed: ${error.message}`);
    }
  };

  return (
    <Row>
      <Col md={5} className="d-flex flex-column" style={{gap: '1rem'}}>
        <Settings
          passport={passport} paper={paper} passportPreset={passportPreset} paperPreset={paperPreset}
          addBorder={addBorder} onImageUpload={handleImageUpload} onSettingsChange={handleSettingsChange}
          presets={{ passport: PRESET_PASSPORT_SIZES, paper: PRESET_PAPER_SIZES }}
        />
        <Editor 
          uploadedImage={uploadedImage} onCrop={handleCropApplied} passportDimensions={passport}
          dpi={DPI}
          addBorder={addBorder}
          key={passport.width / passport.height} 
        />
      </Col>
      <Col md={7} ref={previewSectionRef} className="pb-5"> {/* Attach ref here and add pb-5 */}
        <Preview
          ref={previewCanvasRef} paper={paper} passport={passport} croppedImage={croppedImage}
          addBorder={addBorder} dpi={DPI}
        />
        <div className="d-grid gap-2 mt-3">
          <FormatDownloadDropdown
            id="dropdown-download-button" title="Download Print-Ready File" size="lg"
            variant="primary" disabled={!croppedImage}
            formats={['PDF', 'JPG', 'PNG']}
            onSelect={handleDownload}
          />
        </div>
      </Col>
    </Row>
  );
}

export default App;
