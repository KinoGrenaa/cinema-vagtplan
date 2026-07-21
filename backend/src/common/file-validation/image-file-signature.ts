import { BadRequestException } from '@nestjs/common';
import { readFile } from 'fs/promises';

type UploadedImageFile = {
  path: string;
  mimetype: string;
};

const invalidImageMessage = 'Kun gyldige JPG-, PNG- og WEBP-filer er tilladt';

function hasJpegSignature(buffer: Buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function hasPngSignature(buffer: Buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  return (
    buffer.length >= signature.length &&
    signature.every((byte, index) => buffer[index] === byte)
  );
}

function hasWebpSignature(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export function hasExpectedImageSignature(
  buffer: Buffer,
  mimetype: string,
) {
  switch (mimetype) {
    case 'image/jpeg':
      return hasJpegSignature(buffer);
    case 'image/png':
      return hasPngSignature(buffer);
    case 'image/webp':
      return hasWebpSignature(buffer);
    default:
      return false;
  }
}

export async function validateUploadedImageFile(
  file: UploadedImageFile,
) {
  let buffer: Buffer;

  try {
    buffer = await readFile(file.path);
  } catch {
    throw new BadRequestException(invalidImageMessage);
  }

  if (!hasExpectedImageSignature(buffer, file.mimetype)) {
    throw new BadRequestException(invalidImageMessage);
  }
}
