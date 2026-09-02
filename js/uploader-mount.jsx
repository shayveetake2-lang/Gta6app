import React from 'react';
import { createRoot } from 'react-dom/client';
import GtaContentUploader from './GtaContentUploader.jsx';

window.mountGtaUploader = function(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    const root = createRoot(container);
    root.render(<GtaContentUploader />);
  }
};
