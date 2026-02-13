import React from 'react';
import { Card, Form, Row, Col, InputGroup } from 'react-bootstrap';

const Settings = ({
  passport,
  paper,
  passportPreset,
  paperPreset,
  addBorder,
  onImageUpload,
  onSettingsChange,
  presets
}) => {

  const handlePassportPresetChange = (e) => {
    const preset = e.target.value;
    onSettingsChange({ passportPreset: preset });
  };

  const handlePaperPresetChange = (e) => {
    const preset = e.target.value;
    onSettingsChange({ paperPreset: preset });
  };

  const handleCustomPassportChange = (e) => {
    const { name, value } = e.target;
    
    let numericValue = name === 'unit' ? value : parseFloat(value);
    if (name !== 'unit' && isNaN(numericValue)) {
      numericValue = 0; // Default to 0 if input is not a valid number
    }

    onSettingsChange({
      passportPreset: 'custom',
      passport: { ...passport, [name]: numericValue }
    });
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleBorderChange = (e) => {
    onSettingsChange({ addBorder: e.target.checked });
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>Step 1: Configure</Card.Title>
        
        <Form.Group className="mb-3">
          <Form.Label htmlFor="imageUpload">Upload Photo</Form.Label>
          <Form.Control 
            type="file" 
            id="imageUpload" 
            accept="image/jpeg, image/png" 
            onChange={handleFileChange}
          />
        </Form.Group>

        <hr />

        <Form.Group className="mb-3">
          <Form.Label>Passport Photo Size</Form.Label>
          <Form.Select className="mb-2" value={passportPreset} onChange={handlePassportPresetChange}>
            {Object.keys(presets.passport).map(key => (
              <option key={key} value={key}>
                {`${presets.passport[key].name} - ${presets.passport[key].width}x${presets.passport[key].height} ${presets.passport[key].unit}`}
              </option>
            ))}
            <option value="custom">Custom</option>
          </Form.Select>
          <Row>
            <Col>
              <InputGroup>
                <Form.Control
                  type="number"
                  name="width"
                  min="0.1"
                  step="0.1"
                  value={passport.width}
                  onChange={handleCustomPassportChange}
                />
              </InputGroup>
            </Col>
            <Col>
              <InputGroup>
                <Form.Control
                  type="number"
                  name="height"
                  min="0.1"
                  step="0.1"
                  value={passport.height}
                  onChange={handleCustomPassportChange}
                />
              </InputGroup>
            </Col>
            <Col>
              <Form.Select name="unit" value={passport.unit} onChange={handleCustomPassportChange}>
                <option value="mm">mm</option>
                <option value="in">in</option>
              </Form.Select>
            </Col>
          </Row>
        </Form.Group>

        <hr />

        <Form.Group className="mb-3">
          <Form.Label>Paper Size</Form.Label>
          <Form.Select value={paperPreset} onChange={handlePaperPresetChange}>
            {Object.keys(presets.paper).map(key => (
              <option key={key} value={key}>
                {`${presets.paper[key].name} - ${presets.paper[key].width}x${presets.paper[key].height} ${presets.paper[key].unit}`}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <hr />

        <Form.Group className="mb-3">
          <Form.Label>Layout Options</Form.Label>
          <Form.Check 
            type="switch"
            id="border-switch"
            label="Add a thin border to each photo"
            checked={addBorder}
            onChange={handleBorderChange}
          />
        </Form.Group>

      </Card.Body>
    </Card>
  );
};

export default Settings;
