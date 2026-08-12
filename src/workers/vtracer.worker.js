import initVTracer, { vectorize_bytes } from '../vendor/vtracer/vtracer_wasm.js';

let ready;

const prepareCarvingImage = async (buffer, mimeType, carving) => {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('Nameplate cleanup needs a newer browser. Update your browser and try again.');
  }

  const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }));
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The browser could not prepare this image for carving.');

    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      const red = (pixels[index] * alpha) + (255 * (1 - alpha));
      const green = (pixels[index + 1] * alpha) + (255 * (1 - alpha));
      const blue = (pixels[index + 2] * alpha) + (255 * (1 - alpha));
      const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);
      // Preserve edge coverage for VTracer's own binary threshold. Converting
      // to 1-bit here and thresholding again in VTracer thickened fine artwork.
      const value = Math.round(carving.invert ? 255 - luminance : luminance);
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
    const preparedBlob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await preparedBlob.arrayBuffer());
  } finally {
    bitmap.close();
  }
};

self.addEventListener('message', async ({ data }) => {
  try {
    ready ||= initVTracer();
    await ready;
    const bytes = data.carving
      ? await prepareCarvingImage(data.buffer, data.mimeType, data.carving)
      : new Uint8Array(data.buffer);
    const svg = vectorize_bytes(bytes, data.options);
    self.postMessage({ svg });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error || 'Vector conversion failed.'),
    });
  }
});
