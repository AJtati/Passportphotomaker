import { jsPDF } from 'jspdf';
import { saveBlob, savePdf } from '../../utils/fileDownload';
import { A4_HEIGHT_MM, A4_PIXELS_EXPORT, A4_WIDTH_MM, EDITOR_DPI, EXPORT_DPI } from './constants';

export const buildCollageExportCanvas = (imagesToRender, orientation) => {
  const exportCanvas = document.createElement('canvas');
  const exportSize = A4_PIXELS_EXPORT[orientation];
  const scale = EXPORT_DPI / EDITOR_DPI;
  const exportCtx = exportCanvas.getContext('2d');

  exportCanvas.width = exportSize.width;
  exportCanvas.height = exportSize.height;

  exportCtx.fillStyle = 'white';
  exportCtx.fillRect(0, 0, exportSize.width, exportSize.height);
  exportCtx.strokeStyle = '#ddd';
  exportCtx.lineWidth = 2 * scale;
  exportCtx.strokeRect(0, 0, exportSize.width, exportSize.height);

  imagesToRender.forEach((img) => {
    const width = img.width * scale;
    const height = img.height * scale;
    const x = img.x * scale;
    const y = img.y * scale;

    exportCtx.save();
    exportCtx.translate(x + width / 2, y + height / 2);
    exportCtx.rotate((img.rotation * Math.PI) / 180);
    exportCtx.drawImage(img.imageObj, -width / 2, -height / 2, width, height);
    exportCtx.restore();
  });

  return exportCanvas;
};

export const downloadCollageDocument = async (imagesToRender, orientation, format) => {
  const exportCanvas = buildCollageExportCanvas(imagesToRender, orientation);

  if (format === 'png' || format === 'jpg') {
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpg' ? 0.95 : 1;
    const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, mimeType, quality));
    if (!blob) {
      throw new Error('Failed to generate image.');
    }
    await saveBlob(blob, `collage.${format}`, mimeType);
    return;
  }

  if (format === 'pdf') {
    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: 'a4',
    });
    const imgData = exportCanvas.toDataURL('image/png');
    const pageWidth = orientation === 'landscape' ? A4_HEIGHT_MM : A4_WIDTH_MM;
    const pageHeight = orientation === 'landscape' ? A4_WIDTH_MM : A4_HEIGHT_MM;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    await savePdf(pdf, 'collage.pdf');
  }
};
