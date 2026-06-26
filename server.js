#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = __dirname;
const scriptDir = path.join(rootDir, 'script');

if (!fs.existsSync(scriptDir)) {
  fs.mkdirSync(scriptDir, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8'
};

function sanitizeFileName(name) {
  const base = path.basename(name || '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload';
  const ext = path.extname(base).toLowerCase();
  return ext === '.pdf' ? base : `${base}.pdf`;
}

function getUniqueFileName(fileName) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const ext = path.extname(fileName).toLowerCase();
  let candidate = fileName;
  let counter = 1;

  while (fs.existsSync(path.join(scriptDir, candidate))) {
    candidate = `${baseName}-${counter}${ext}`;
    counter += 1;
  }

  return candidate;
}

function parseMultipartFile(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)$/i);

        if (!boundaryMatch) {
          reject(new Error('Missing multipart boundary'));
          return;
        }

        const boundary = boundaryMatch[1].trim();
        const delimiter = Buffer.from(`--${boundary}`);
        const delimiterWithNewline = Buffer.from(`--${boundary}\r\n`);
        const closingDelimiter = Buffer.from(`--${boundary}--`);

        let start = body.indexOf(delimiter);
        if (start === -1) {
          reject(new Error('Invalid multipart body'));
          return;
        }

        start += delimiter.length;
        const multipartBody = body.slice(start);
        const parts = [];
        let searchIndex = 0;

        while (searchIndex < multipartBody.length) {
          const nextBoundary = multipartBody.indexOf(delimiter, searchIndex);
          if (nextBoundary === -1) {
            break;
          }

          const part = multipartBody.slice(searchIndex, nextBoundary);
          if (part.length > 0) {
            parts.push(part);
          }

          searchIndex = nextBoundary + delimiter.length;
          if (multipartBody.slice(searchIndex, searchIndex + 2).equals(Buffer.from('--'))) {
            break;
          }
        }

        const filePart = parts.find(part => part.toString('latin1').includes('filename='));
        if (!filePart) {
          reject(new Error('No file part found in upload'));
          return;
        }

        const headerSeparator = filePart.indexOf(Buffer.from('\r\n\r\n'));
        if (headerSeparator === -1) {
          reject(new Error('Malformed multipart part'));
          return;
        }

        const headers = filePart.slice(0, headerSeparator).toString('latin1');
        let fileBuffer = filePart.slice(headerSeparator + 4);
        if (fileBuffer.length >= 2 && fileBuffer.slice(-2).equals(Buffer.from('\r\n'))) {
          fileBuffer = fileBuffer.slice(0, -2);
        }

        const dispositionMatch = headers.match(/name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
        if (!dispositionMatch) {
          reject(new Error('Missing multipart disposition header'));
          return;
        }

        const fileName = dispositionMatch[2] ? sanitizeFileName(dispositionMatch[2]) : 'upload.pdf';
        resolve({ fileName: getUniqueFileName(fileName), fileBuffer });
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function updatePdfManifest() {
  execFileSync(process.execPath, [path.join(rootDir, 'generate-pdfs-list.js')], {
    cwd: rootDir,
    stdio: 'pipe'
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/api/upload-pdf') {
    try {
      const { fileName, fileBuffer } = await parseMultipartFile(req);
      const targetPath = path.join(scriptDir, fileName);
      fs.writeFileSync(targetPath, fileBuffer);
      updatePdfManifest();
      sendJson(res, 200, { ok: true, file: fileName, message: 'PDF uploaded successfully.' });
    } catch (error) {
      console.error('Upload failed:', error);
      sendJson(res, 400, { ok: false, error: error.message || 'Upload failed.' });
    }
    return;
  }

  let requestedPath = url.pathname;
  if (requestedPath === '/') {
    requestedPath = '/index.html';
  }

  const safePath = path.normalize(requestedPath).replace(/^\/+/, '');
  const absolutePath = path.join(rootDir, safePath);

  if (!absolutePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    const fallbackPath = path.join(rootDir, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      serveStaticFile(res, fallbackPath);
      return;
    }
  }

  serveStaticFile(res, absolutePath);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
