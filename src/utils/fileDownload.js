import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to convert file data.'));
        return;
      }
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });

const isNative = () => Capacitor.isNativePlatform();

export const saveBlob = async (blob, filename, mimeType) => {
  if (!blob) throw new Error('No file data to download.');

  if (isNative()) {
    const safeName = filename.replace(/[^\w.-]/g, '_');
    const path = `${Date.now()}_${safeName}`;
    const base64Data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });
    const fileUri = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({
      title: 'Save file',
      text: filename,
      url: fileUri.uri,
      dialogTitle: 'Save or share file',
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const savePdf = async (pdfDoc, filename) => {
  if (isNative()) {
    const blob = pdfDoc.output('blob');
    await saveBlob(blob, filename, 'application/pdf');
    return;
  }
  pdfDoc.save(filename);
};

export const saveCanvasImage = async (canvas, format, filename, quality = 1) => {
  const mimeType = format === 'JPG' || format === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) throw new Error('Failed to render image.');
  await saveBlob(blob, filename, mimeType);
};
