let pdfjsPromise = null;

export const loadPdfJs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/build/pdf'),
      import('pdfjs-dist/build/pdf.worker.entry'),
    ]).then(([pdfjsModule]) => {
      const pdfjsLib = pdfjsModule.default || pdfjsModule;
      if (pdfjsLib.PDFWorkerUtil) {
        pdfjsLib.PDFWorkerUtil.isWorkerDisabled = true;
      }
      return pdfjsLib;
    });
  }

  return pdfjsPromise;
};
