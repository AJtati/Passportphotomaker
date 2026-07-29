import React, { useEffect, useState } from 'react';
import { Card, Form, Row, Col, InputGroup } from 'react-bootstrap';

const Settings = ({
  passport,
  paper,
  passportPreset,
  paperPreset,
  addBorder,
  addDottedBorder,
  addCuttingGuide,
  cuttingGuideOffsetMm,
  onImageUpload,
  onSettingsChange,
  presets
}) => {
  const [customPassportDraft, setCustomPassportDraft] = useState({
    width: String(passport.width),
    height: String(passport.height),
  });

  useEffect(() => {
    setCustomPassportDraft({
      width: String(passport.width),
      height: String(passport.height),
    });
  }, [passport.width, passport.height]);

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

    if (name === 'unit') {
      onSettingsChange({
        passportPreset: 'custom',
        passport: { ...passport, unit: value }
      });
      return;
    }

    setCustomPassportDraft((current) => ({
      ...current,
      [name]: value
    }));

    if (value.trim() === '') {
      onSettingsChange({ passportPreset: 'custom' });
      return;
    }

    const numericValue = parseFloat(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      onSettingsChange({
        passportPreset: 'custom',
        passport: { ...passport, [name]: numericValue }
      });
    }
  };

  const handleCustomPassportBlur = (e) => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value);

    if (Number.isFinite(numericValue) && numericValue > 0) {
      const normalizedValue = String(numericValue);
      setCustomPassportDraft((current) => ({
        ...current,
        [name]: normalizedValue
      }));
      onSettingsChange({
        passportPreset: 'custom',
        passport: { ...passport, [name]: numericValue }
      });
      return;
    }

    setCustomPassportDraft((current) => ({
      ...current,
      [name]: String(passport[name])
    }));
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleBorderChange = (e) => {
    onSettingsChange({ addBorder: e.target.checked, addDottedBorder: false });
  };

  const handleDottedBorderChange = (e) => {
    onSettingsChange({ addDottedBorder: e.target.checked, addBorder: false });
  };

  const handleCuttingGuideChange = (e) => {
    onSettingsChange({ addCuttingGuide: e.target.checked });
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
                  type="text"
                  name="width"
                  inputMode="decimal"
                  value={customPassportDraft.width}
                  onChange={handleCustomPassportChange}
                  onBlur={handleCustomPassportBlur}
                />
              </InputGroup>
            </Col>
            <Col>
              <InputGroup>
                <Form.Control
                  type="text"
                  name="height"
                  inputMode="decimal"
                  value={customPassportDraft.height}
                  onChange={handleCustomPassportChange}
                  onBlur={handleCustomPassportBlur}
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
          <Form.Check 
            type="switch"
            id="dotted-border-switch"
            label="Add a light dotted border to each photo"
            checked={addDottedBorder}
            onChange={handleDottedBorderChange}
          />
          <Form.Check
            type="switch"
            id="cutting-guide-switch"
            label="Add cutting guide lines"
            checked={addCuttingGuide}
            onChange={handleCuttingGuideChange}
          />
          <div className="ms-4 mt-1">
            <div className="d-flex justify-content-between">
              <Form.Label className="mb-0">Cutting guide offset</Form.Label>
              <span>{cuttingGuideOffsetMm.toFixed(1)} mm</span>
            </div>
            <Form.Range
              min={0.5}
              max={2}
              step={0.1}
              value={cuttingGuideOffsetMm}
              disabled={!addCuttingGuide}
              onChange={(e) => onSettingsChange({ cuttingGuideOffsetMm: Number(e.target.value) })}
            />
          </div>
        </Form.Group>

      </Card.Body>
    </Card>
  );
};

export default Settings;
