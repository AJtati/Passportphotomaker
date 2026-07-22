import { jsPDF } from 'jspdf';
import { saveCanvasImage, savePdf } from './fileDownload';

const getCanvasOrientation = (canvas) => (canvas.width > canvas.height ? 'l' : 'p');

export const saveCanvasAsPdf = async (canvas, { filename, unit, width, height, orientation } = {}) => {
  if (!canvas) {
    throw new Error('Preview canvas not ready.');
  }

  const pdf = new jsPDF(
    orientation || getCanvasOrientation(canvas),
    unit,
    [width, height]
  );
  pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, width, height);
  await savePdf(pdf, filename);
};

export const saveCanvasDocument = async (
  canvas,
  format,
  {
    filename,
    quality = 1,
    dpi,
    pdfOptions,
  } = {}
) => {
  if (!canvas) {
    throw new Error('Preview canvas not ready.');
  }

  if (format === 'PDF') {
    await saveCanvasAsPdf(canvas, { filename, ...pdfOptions });
    return;
  }

  await saveCanvasImage(canvas, format, filename, quality, dpi);
};
