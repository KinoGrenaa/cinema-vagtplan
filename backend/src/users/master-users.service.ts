import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'MASTER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        address: true,
        birthDate: true,
        emergencyPhone: true,
        skills: true,
        notes: true,
        theme: true,
        role: true,
        createdAt: true,
        isActive: true,
        deactivatedAt: true,
        defaultCinemaId: true,
        defaultCinema: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    return users.map(({ defaultCinema, ...user }) => ({
      ...user,
      cinemaId: user.defaultCinemaId,
      cinema: defaultCinema,
    }));
  }
}
