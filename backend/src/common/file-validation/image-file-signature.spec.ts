import { BadRequestException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import {
  hasExpectedImageSignature,
  validateUploadedImageFile,
} from './image-file-signature';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('image file signature validation', () => {
  beforeEach(() => {
    mockedReadFile.mockReset();
  });

  it('accepts matching JPG, PNG and WEBP signatures', () => {
    expect(
      hasExpectedImageSignature(
        Buffer.from([0xff, 0xd8, 0xff, 0x00]),
        'image/jpeg',
      ),
    ).toBe(true);

    expect(
      hasExpectedImageSignature(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'image/png',
      ),
    ).toBe(true);

    expect(
      hasExpectedImageSignature(
        Buffer.from('RIFF0000WEBP', 'ascii'),
        'image/webp',
      ),
    ).toBe(true);
  });

  it('rejects content that does not match the claimed MIME type', () => {
    expect(
      hasExpectedImageSignature(
        Buffer.from('<html>not an image</html>'),
        'image/png',
      ),
    ).toBe(false);
  });

  it('rejects an uploaded file when the signature is invalid', async () => {
    mockedReadFile.mockResolvedValue(Buffer.from('not an image'));

    await expect(
      validateUploadedImageFile({
        path: '/tmp/fake.png',
        mimetype: 'image/png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
