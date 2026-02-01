import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Navbar, DropdownButton, Dropdown, Nav } from 'react-bootstrap';
import Settings from './components/Settings';
import Editor from './components/Editor';
import Preview from './components/Preview';
import MultiPhoto from './components/MultiPhoto';
import Logo from './components/Logo'; // Import the new Logo component
import { jsPDF } from 'jspdf';
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

// --- Main App Component ---
function App() {
  const [activeTab, setActiveTab] = useState('passport');

  return (
    <>
      <Navbar bg="white" expand="lg" className="mb-4 shadow-sm">
        <Container>
          <Navbar.Brand 
            onClick={() => setActiveTab('passport')} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Logo />
            Photo Print Utility
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav 
              variant="tabs" 
              activeKey={activeTab} 
              onSelect={(k) => setActiveTab(k)}
              className="ms-auto"
            >
              <Nav.Item>
                <Nav.Link eventKey="passport">Passport Photo Creator</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="multi">Multi-Photo Print</Nav.Link>
              </Nav.Item>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        {activeTab === 'passport' && <PassportPhotoCreator />}
        {activeTab === 'multi' && <MultiPhoto />}
      </Container>
    </>
  );
}


// --- Component for the Passport Photo functionality ---
function PassportPhotoCreator() {
  const previewCanvasRef = useRef(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [passport, setPassport] = useState(PRESET_PASSPORT_SIZES.india);
  const [paper, setPaper] = useState(PRESET_PAPER_SIZES.a4);
  const [passportPreset, setPassportPreset] = useState('india');
  const [paperPreset, setPaperPreset] = useState('a4');
  const [addBorder, setAddBorder] = useState(false);

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
    if (newSettings.passport) { setPassport(newSettings.passport); shouldResetCrop = true; }
    if (newSettings.paper) setPaper(newSettings.paper);
    if (newSettings.addBorder !== undefined) setAddBorder(newSettings.addBorder);
    if (newSettings.passportPreset) {
      if (newSettings.passportPreset !== passportPreset) shouldResetCrop = true;
      setPassportPreset(newSettings.passportPreset);
      if (PRESET_PASSPORT_SIZES[newSettings.passportPreset]) setPassport(PRESET_PASSPORT_SIZES[newSettings.passportPreset]);
    }
    if (newSettings.paperPreset) {
      setPaperPreset(newSettings.paperPreset);
      setPaper(PRESET_PAPER_SIZES[newSettings.paperPreset]);
    }
    if (shouldResetCrop) setCroppedImage(null);
  };

  const handleDownload = (format) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) { alert("Preview canvas not ready."); return; }
    if (format === 'PDF') {
      const orientation = canvas.width > canvas.height ? 'l' : 'p';
      const pdf = new jsPDF(orientation, paper.unit, [paper.width, paper.height]);
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, paper.width, paper.height);
      pdf.save('passport_photos.pdf');
    } else {
      const link = document.createElement('a');
      link.download = `passport_photos.${format.toLowerCase()}`;
      link.href = canvas.toDataURL(format === 'JPG' ? 'image/jpeg' : 'image/png', 1.0);
      link.click();
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
          uploadedImage={uploadedImage} onCrop={setCroppedImage} passportDimensions={passport}
          key={passport.width / passport.height} 
        />
      </Col>
      <Col md={7}>
        <Preview
          ref={previewCanvasRef} paper={paper} passport={passport} croppedImage={croppedImage}
          addBorder={addBorder} dpi={DPI}
        />
        <div className="d-grid gap-2 mt-3">
          <DropdownButton
            id="dropdown-download-button" title="Download Print-Ready File" size="lg"
            variant="primary" disabled={!croppedImage}
          >
            <Dropdown.Item onClick={() => handleDownload('PDF')}>Download as PDF</Dropdown.Item>
            <Dropdown.Item onClick={() => handleDownload('JPG')}>Download as JPG</Dropdown.Item>
            <Dropdown.Item onClick={() => handleDownload('PNG')}>Download as PNG</Dropdown.Item>
          </DropdownButton>
        </div>
      </Col>
    </Row>
  );
}

export default App;