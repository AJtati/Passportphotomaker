import React from 'react';
import { Nav, Tab } from 'react-bootstrap';
import ImageResizer from './ImageResizer';
import ImageVectorizer from './ImageVectorizer';

const ImageTools = () => (
  <Tab.Container defaultActiveKey="resize" mountOnEnter unmountOnExit>
    <Nav variant="pills" className="image-tools-switcher" aria-label="Image tools">
      <Nav.Item>
        <Nav.Link eventKey="resize">Resize & Compress</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey="vector">Convert to Vector</Nav.Link>
      </Nav.Item>
    </Nav>
    <Tab.Content>
      <Tab.Pane eventKey="resize"><ImageResizer /></Tab.Pane>
      <Tab.Pane eventKey="vector"><ImageVectorizer /></Tab.Pane>
    </Tab.Content>
  </Tab.Container>
);

export default ImageTools;
