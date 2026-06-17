const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

function getArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));

  return value ? value.slice(prefix.length).trim() : "";
}

async function main() {
  const email = getArg("email").toLowerCase();
  const password = getArg("password");
  const firstName = getArg("firstName") || "Master";
  const lastName = getArg("lastName") || "Bruger";

  if (!email) {
    throw new Error("Manglende --email");
  }

  if (!password || password.length < 8) {
    throw new Error("Manglende --password eller adgangskoden er under 8 tegn");
  }

  const existingMasterCount = await prisma.user.count({
    where: {
      role: "MASTER",
    },
  });

  if (existingMasterCount > 0) {
    console.log("Der findes allerede en MASTER-bruger. Bootstrap stoppet.");
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error(`Der findes allerede en bruger med email: ${email}`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const master = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "MASTER",
      cinemaId: null,
      employmentType: "SALARIED",
      canManageSchedule: true,
      canManageUsers: true,
      canManagePayroll: true,
      canManageLeaveRequests: true,
      canManageCinemaSettings: true,
      canSendBroadcastMessages: true,
      isActive: true,
      deactivatedAt: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      cinemaId: true,
      isActive: true,
    },
  });

  console.log("");
  console.log("MASTER-bruger oprettet:");
  console.log(master);
  console.log("");
  console.log("Du kan nu logge ind med den valgte email og adgangskode.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("Bootstrap fejlede:");
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });