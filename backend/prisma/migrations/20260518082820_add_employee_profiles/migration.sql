-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "skills" TEXT;
