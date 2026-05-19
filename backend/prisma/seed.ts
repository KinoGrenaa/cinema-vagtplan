import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("test123", 10);

  const cinema = await prisma.cinema.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Kino Grenaa",
    },
  });

  await prisma.user.upsert({
    where: {
      email: "admin@test.dk",
    },
    update: {},
    create: {
      email: "admin@test.dk",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "Test",
      role: Role.ADMIN,
      cinemaId: cinema.id,
    },
  });

  const workTypes = [
    { name: "Kiosk", color: "#2563eb" },
    { name: "Billetsalg", color: "#16a34a" },
    { name: "Rengøring", color: "#dc2626" },
    { name: "Maskinrum", color: "#9333ea" },
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