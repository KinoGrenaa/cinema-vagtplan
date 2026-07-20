import { Logger, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { basename, resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

const cinemaLogoPathPrefix = '/uploads/cinema-logos/';
const logger = new Logger('CinemaLogoFlow');

function getManagedCinemaLogoPath(logoUrl: string | null) {
  if (!logoUrl?.startsWith(cinemaLogoPathPrefix)) {
    return null;
  }

  const relativeName = logoUrl.slice(cinemaLogoPathPrefix.length);
  const fileName = basename(relativeName);

  if (!fileName || fileName !== relativeName) {
    return null;
  }

  return resolve(process.cwd(), 'uploads', 'cinema-logos', fileName);
}

async function removeManagedCinemaLogo(logoUrl: string | null) {
  const filePath = getManagedCinemaLogoPath(logoUrl);

  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      logger.warn(`Kunne ikke slette tidligere biograflogo: ${filePath}`);
    }
  }
}

export async function updateCinemaLogo(
  prisma: PrismaService,
  id: number,
  logoUrl: string | null,
) {
  const cinema = await prisma.cinema.findUnique({
    where: { id },
    select: {
      id: true,
      logoUrl: true,
    },
  });

  if (!cinema) {
    throw new NotFoundException('Biograf blev ikke fundet');
  }

  const updatedCinema = await prisma.cinema.update({
    where: { id },
    data: { logoUrl },
  });

  if (cinema.logoUrl && cinema.logoUrl !== logoUrl) {
    await removeManagedCinemaLogo(cinema.logoUrl);
  }

  return updatedCinema;
}
