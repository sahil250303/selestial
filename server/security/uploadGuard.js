import fs from 'fs';
import { extname } from 'path';
import { securityConfig } from './config.js';

const magicByType = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
  ],
  'image/webp': [
    // RIFF....WEBP — check bytes 0-3 (RIFF) and 8-11 (WEBP).
    [0x52, 0x49, 0x46, 0x46]
  ]
};

const allowedExtByMime = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

function bytesMatch(buffer, signature, offset = 0) {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

function detectMime(buffer) {
  if (bytesMatch(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (bytesMatch(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (bytesMatch(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])) return 'image/gif';
  if (bytesMatch(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return 'image/gif';
  if (bytesMatch(buffer, [0x52, 0x49, 0x46, 0x46]) && bytesMatch(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

export function multerFileFilter(req, file, cb) {
  const allowed = securityConfig.upload.allowedMimeTypes;
  const claimedMime = file.mimetype;
  if (!allowed.includes(claimedMime)) {
    return cb(new UploadRejectedError(`Unsupported mime type: ${claimedMime}`));
  }
  const ext = extname(file.originalname).toLowerCase();
  const okExts = allowedExtByMime[claimedMime] || [];
  if (!okExts.includes(ext)) {
    return cb(new UploadRejectedError(`Extension ${ext || '<none>'} does not match mime ${claimedMime}`));
  }
  cb(null, true);
}

export class UploadRejectedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UploadRejectedError';
    this.status = 400;
  }
}

export async function verifyUploadedFiles(files) {
  const cleanups = [];
  const check = (file) => {
    const fd = fs.openSync(file.path, 'r');
    try {
      const buffer = Buffer.alloc(16);
      fs.readSync(fd, buffer, 0, 16, 0);
      const detected = detectMime(buffer);
      if (!detected) throw new UploadRejectedError('Uploaded file is not a recognized image');
      if (detected !== file.mimetype) {
        throw new UploadRejectedError(`Content type mismatch: declared ${file.mimetype}, actual ${detected}`);
      }
      const stats = fs.fstatSync(fd);
      if (stats.size > securityConfig.upload.maxFileBytes) {
        throw new UploadRejectedError('Uploaded file exceeds size limit');
      }
    } finally {
      fs.closeSync(fd);
    }
  };

  try {
    for (const file of files) {
      cleanups.push(file.path);
      check(file);
    }
    return { ok: true };
  } catch (err) {
    for (const path of cleanups) {
      try { fs.unlinkSync(path); } catch { /* file already gone */ }
    }
    throw err;
  }
}
