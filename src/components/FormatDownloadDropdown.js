import React from 'react';
import { DropdownButton, Dropdown } from 'react-bootstrap';

const FORMAT_LABELS = {
  PDF: 'Download as PDF',
  JPG: 'Download as JPG',
  PNG: 'Download as PNG',
  pdf: 'Download as PDF',
  jpg: 'Download as JPG',
  png: 'Download as PNG',
};

const FormatDownloadDropdown = ({
  id,
  title,
  size = 'lg',
  variant = 'primary',
  disabled = false,
  formats = [],
  onSelect,
  ...props
}) => (
  <DropdownButton id={id} title={title} size={size} variant={variant} disabled={disabled} {...props}>
    {formats.map((format) => (
      <Dropdown.Item key={format} onClick={() => onSelect(format)}>
        {FORMAT_LABELS[format] || `Download as ${format}`}
      </Dropdown.Item>
    ))}
  </DropdownButton>
);

export default FormatDownloadDropdown;
