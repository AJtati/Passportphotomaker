import React from 'react';
import { Button, Form } from 'react-bootstrap';
import FormatDownloadDropdown from '../FormatDownloadDropdown';

const CollageSidebar = ({
  isMobile,
  controlSpacing,
  controlFontSize,
  onFileChange,
  onAutoArrange,
  imagesCount,
  selectedId,
  onDelete,
  onRotate,
  onResize,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onDownload,
  zoomPercent,
  onZoomPercentChange,
  canvasScale,
  effectiveScale,
}) => (
  <div
    style={{
      width: isMobile ? '100%' : '280px',
      display: 'flex',
      flexDirection: 'column',
      gap: controlSpacing,
      backgroundColor: 'var(--surface-subtle)',
      padding: isMobile ? '12px' : '15px',
      borderRadius: '4px',
      overflowY: 'auto',
      fontSize: controlFontSize,
    }}
  >
    <h6 style={{ marginBottom: '10px', marginTop: 0, fontSize: controlFontSize }}>Controls</h6>

    <div>
      <label style={{ fontSize: controlFontSize, marginBottom: '5px', display: 'block' }}>Upload Images</label>
      <Form.Control
        type="file"
        multiple
        accept="image/*"
        onChange={onFileChange}
        size="sm"
      />
    </div>

    <Button
      variant="outline-primary"
      size="sm"
      onClick={onAutoArrange}
      disabled={imagesCount === 0}
      className="w-100"
    >
      Auto Arrange
    </Button>

    <div style={{ display: 'flex', flexDirection: 'column', gap: controlSpacing }}>
      <Button variant="danger" size="sm" onClick={onDelete} disabled={!selectedId} className="w-100">
        🗑️ Delete
      </Button>
      <Button variant="warning" size="sm" onClick={onRotate} disabled={!selectedId} className="w-100">
        ↻ Rotate
      </Button>
      <Button variant="info" size="sm" onClick={() => onResize(20)} disabled={!selectedId} className="w-100">
        ➕ Bigger
      </Button>
      <Button variant="info" size="sm" onClick={() => onResize(-20)} disabled={!selectedId} className="w-100">
        ➖ Smaller
      </Button>
      <Button variant="secondary" size="sm" onClick={onBringToFront} disabled={!selectedId} className="w-100">
        ⬆️ Bring to Front
      </Button>
      <Button variant="secondary" size="sm" onClick={onBringForward} disabled={!selectedId} className="w-100">
        🔼 Bring Forward
      </Button>
      <Button variant="secondary" size="sm" onClick={onSendBackward} disabled={!selectedId} className="w-100">
        🔽 Send Backward
      </Button>
      <Button variant="secondary" size="sm" onClick={onSendToBack} disabled={!selectedId} className="w-100">
        ⬇️ Send to Back
      </Button>
    </div>

    <FormatDownloadDropdown
      id="download-dropdown"
      title="📥 Download"
      variant="primary"
      size="sm"
      className="w-100"
      formats={['png', 'jpg', 'pdf']}
      onSelect={onDownload}
    />

    <div style={{ marginTop: '8px' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: controlFontSize }}>Zoom</span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onZoomPercentChange(Math.round(canvasScale * 100))}
        >
          Fit
        </button>
      </label>
      <input
        type="range"
        min={10}
        max={200}
        value={zoomPercent}
        onChange={(event) => onZoomPercentChange(Number(event.target.value))}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
        <input
          type="number"
          value={zoomPercent}
          onChange={(event) => onZoomPercentChange(Math.max(10, Math.min(200, Number(event.target.value) || 10)))}
          style={{ width: '70px' }}
        />
        <span style={{ color: 'var(--text-muted)' }}>%</span>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          Effective: {Math.round(effectiveScale * 100)}%
        </div>
      </div>
    </div>

    <hr />
    <div style={{ fontSize: controlFontSize, color: 'var(--text-muted)' }}>
      <p style={{ margin: '5px 0' }}><strong>Images:</strong> {imagesCount}</p>
      <p style={{ margin: '5px 0' }}><strong>Zoom:</strong> {zoomPercent}%</p>
      <p style={{ margin: '5px 0', fontSize: isMobile ? '13px' : '11px', color: 'var(--text-muted)' }}>
        Selected: {selectedId ? 'Yes' : 'No'}
      </p>
    </div>

    <div style={{ fontSize: isMobile ? '13px' : '11px', color: 'var(--text-muted)', marginTop: 'auto' }}>
      <p style={{ margin: '5px 0' }}>💡 <strong>Tips:</strong></p>
      <ul style={{ paddingLeft: '18px', margin: '5px 0' }}>
        <li>🟢 Green = Move</li>
        <li>🔵 Blue = Resize</li>
        <li>🟠 Orange = Rotate</li>
      </ul>
    </div>
  </div>
);

export default CollageSidebar;
