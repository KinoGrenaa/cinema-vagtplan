import {
  CinemaRole,
  PrismaClient,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword =
    await bcrypt.hash(
      "test123",
      10,
    );

  const cinema =
    await prisma.cinema.upsert({
      where: {
        id: 1,
      },
      update: {},
      create: {
        name: "Kino Grenaa",
      },
    });

  const admin =
    await prisma.user.upsert({
      where: {
        email: "admin@test.dk",
      },
      update: {
        defaultCinemaId:
          cinema.id,
      },
      create: {
        email: "admin@test.dk",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "Test",
        role: Role.ADMIN,
        defaultCinemaId:
          cinema.id,
      },
    });

  await prisma.userCinemaMembership.upsert({
    where: {
      userId_cinemaId: {
        userId: admin.id,
        cinemaId: cinema.id,
      },
    },
    update: {
      role: CinemaRole.ADMIN,
      isActive: true,
      deactivatedAt: null,
      canManageSchedule: true,
      canManageUsers: true,
      canManagePayroll: true,
      canManageLeaveRequests: true,
      canManageCinemaSettings: true,
      canSendBroadcastMessages: true,
    },
    create: {
      userId: admin.id,
      cinemaId: cinema.id,
      role: CinemaRole.ADMIN,
      canManageSchedule: true,
      canManageUsers: true,
      canManagePayroll: true,
      canManageLeaveRequests: true,
      canManageCinemaSettings: true,
      canSendBroadcastMessages: true,
    },
  });

  const workTypes = [
    {
      name: "Kiosk",
      color: "#2563eb",
    },
    {
      name: "Billetsalg",
      color: "#16a34a",
    },
    {
      name: "Rengøring",
      color: "#dc2626",
    },
    {
      name: "Maskinrum",
      color: "#9333ea",
    },
  ];

  for (const workType of workTypes) {
    await prisma.workType.create({
      data: {
        ...workType,
        cinemaId: cinema.id,
      },
    });
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
