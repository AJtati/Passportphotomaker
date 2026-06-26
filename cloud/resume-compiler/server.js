const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 1024 * 1024,
    fields: 16,
    files: 0,
  },
});

const PORT = Number(process.env.PORT || 8090);
const COMPILE_TIMEOUT_MS = Number(process.env.COMPILE_TIMEOUT_MS || 20000);
const ALLOWED_ENGINES = new Set(['pdflatex', 'xelatex', 'lualatex']);

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['Content-Disposition', 'Content-Type'],
}));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post(['/', '/compile'], upload.none(), async (req, res) => {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-compile-'));

  try {
    const latexCode = firstValue(req.body['filecontents[]'] || req.body.filecontents);
    const requestedName = firstValue(req.body['filename[]'] || req.body.filename) || 'document.tex';
    const engine = ALLOWED_ENGINES.has(req.body.engine) ? req.body.engine : 'pdflatex';

    if (!latexCode || typeof latexCode !== 'string') {
      res.status(400).type('text/plain').send('Missing filecontents[] field.');
      return;
    }

    const texFile = safeTexFilename(requestedName);
    const texPath = path.join(workDir, texFile);
    const pdfPath = path.join(workDir, texFile.replace(/\.tex$/i, '.pdf'));

    await fs.writeFile(texPath, latexCode, 'utf8');

    const firstRun = await runLatex(engine, texFile, workDir);
    if (firstRun.code === 0) {
      await runLatex(engine, texFile, workDir);
    }

    if (firstRun.code !== 0 || !(await fileExists(pdfPath))) {
      res.status(422).type('text/plain').send(firstRun.output || 'LaTeX compilation failed.');
      return;
    }

    const pdf = await fs.readFile(pdfPath);
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="resume.pdf"',
        'Cache-Control': 'no-store',
      })
      .send(pdf);
  } catch (error) {
    res.status(500).type('text/plain').send(error.stack || error.message);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
});

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function safeTexFilename(filename) {
  const base = path.basename(filename || 'document.tex').replace(/[^\w.-]/g, '_');
  return base.toLowerCase().endsWith('.tex') ? base : 'document.tex';
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runLatex(engine, texFile, cwd) {
  return new Promise((resolve) => {
    const child = spawn(engine, [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-file-line-error',
      '-no-shell-escape',
      texFile,
    ], { cwd });

    let output = '';
    const capture = (chunk) => {
      output += chunk.toString();
      if (output.length > 200000) {
        output = output.slice(-200000);
      }
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, COMPILE_TIMEOUT_MS);

    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: 1, output: error.stack || error.message });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (signal === 'SIGKILL') {
        resolve({ code: 124, output: `LaTeX compilation timed out after ${COMPILE_TIMEOUT_MS}ms.\n${output}` });
        return;
      }
      resolve({ code, output });
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Resume compiler listening on ${PORT}`);
});
