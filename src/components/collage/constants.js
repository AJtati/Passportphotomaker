import { toPixels } from './helpers';

export const EDITOR_DPI = 150;
export const EXPORT_DPI = 300;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const A4_PIXELS_EDITOR = {
  portrait: {
    width: toPixels(A4_WIDTH_MM, EDITOR_DPI),
    height: toPixels(A4_HEIGHT_MM, EDITOR_DPI),
  },
  landscape: {
    width: toPixels(A4_HEIGHT_MM, EDITOR_DPI),
    height: toPixels(A4_WIDTH_MM, EDITOR_DPI),
  },
};

export const A4_PIXELS_EXPORT = {
  portrait: {
    width: toPixels(A4_WIDTH_MM, EXPORT_DPI),
    height: toPixels(A4_HEIGHT_MM, EXPORT_DPI),
  },
  landscape: {
    width: toPixels(A4_HEIGHT_MM, EXPORT_DPI),
    height: toPixels(A4_WIDTH_MM, EXPORT_DPI),
  },
};
