import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number;
  canManagePayroll?: boolean;
};

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  private ensurePayrollAccess(user: AuthUser) {
    if (user.role === 'MASTER') return;
    if (user.role === 'ADMIN') return;

    throw new ForbiddenException('Du har ikke adgang til løndata');
  }

  private ensureMaster(user: AuthUser) {
    if (user.role !== 'MASTER') {
      throw new ForbiddenException('Kun MASTER kan låse op igen');
    }
  }

  private getCinemaFilter(user: AuthUser) {
    if (user.role === 'MASTER') return {};
    return { cinemaId: user.cinemaId };
  }

  private getPeriodDates(startDate: string, endDate: string) {
    return {
      start: new Date(`${startDate}T00:00:00.000Z`),
      end: new Date(`${endDate}T23:59:59.999Z`),
    };
  }

  async getPayrollReport(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    this.ensurePayrollAccess(user);

    const { start, end } = this.getPeriodDates(startDate, endDate);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        ...this.getCinemaFilter(user),
        ...(userId ? { userId: Number(userId) } : {}),
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
      },
      include: {
        user: true,
        payrollPeriod: true,
        shift: {
          include: {
            workType: true,
          },
        },
      },
      orderBy: {
        clockIn: 'asc',
      },
    });

    const grouped = new Map<
      number,
      {
        userId: number;
        name: string;
        email: string;
        totalHours: number;
        entries: {
          id: number;
          date: string;
          clockIn: string;
          clockOut: string;
          hours: number;
          workType: string;
          status: string;
          note: string | null;
          adminNote: string | null;
          payrollLocked: boolean;
          payrollUnlockedByMaster: boolean;
          payrollPeriodId: number | null;
        }[];
      }
    >();

    for (const entry of entries) {
      if (!entry.clockOut) continue;

      const hours =
        (entry.clockOut.getTime() - entry.clockIn.getTime()) / 1000 / 60 / 60;

      if (!grouped.has(entry.userId)) {
        grouped.set(entry.userId, {
          userId: entry.userId,
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          email: entry.user.email,
          totalHours: 0,
          entries: [],
        });
      }

      const userGroup = grouped.get(entry.userId);
      if (!userGroup) continue;

      userGroup.totalHours += hours;

      userGroup.entries.push({
        id: entry.id,
        date: entry.clockIn.toISOString().slice(0, 10),
        clockIn: entry.clockIn.toISOString(),
        clockOut: entry.clockOut.toISOString(),
        hours: Number(hours.toFixed(2)),
        workType: entry.shift?.workType?.name || '-',
        status: entry.status,
        note: entry.note,
        adminNote: entry.adminNote,
        payrollLocked: entry.payrollLocked,
        payrollUnlockedByMaster: entry.payrollUnlockedByMaster,
        payrollPeriodId: entry.payrollPeriodId,
      });
    }

    return Array.from(grouped.values()).map((employee) => ({
      ...employee,
      totalHours: Number(employee.totalHours.toFixed(2)),
    }));
  }

  async getPeriod(user: AuthUser, startDate: string, endDate: string) {
    this.ensurePayrollAccess(user);

    const { start, end } = this.getPeriodDates(startDate, endDate);

    return this.prisma.payrollPeriod.findFirst({
      where: {
        ...this.getCinemaFilter(user),
        startDate: start,
        endDate: end,
      },
      include: {
        timeEntries: true,
      },
    });
  }

  async lockPeriod(user: AuthUser, startDate: string, endDate: string) {
    this.ensurePayrollAccess(user);

    if (user.role !== 'MASTER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Du har ikke adgang til at låse lønperioder',
      );
    }

    const { start, end } = this.getPeriodDates(startDate, endDate);

    const cinemaId = user.cinemaId;

    const existingPeriod = await this.prisma.payrollPeriod.findFirst({
      where: {
        cinemaId,
        startDate: start,
        endDate: end,
      },
    });

    if (
      existingPeriod?.status === 'LOCKED' ||
      existingPeriod?.status === 'EXPORTED'
    ) {
      throw new BadRequestException('Lønperioden er allerede låst');
    }

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        cinemaId,
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
      },
    });

    const period = existingPeriod
      ? await this.prisma.payrollPeriod.update({
          where: { id: existingPeriod.id },
          data: {
            status: 'LOCKED',
            lockedAt: new Date(),
            lockedByUserId: user.sub,
            unlockedAt: null,
            unlockedByUserId: null,
            unlockNote: null,
          },
        })
      : await this.prisma.payrollPeriod.create({
          data: {
            cinemaId,
            startDate: start,
            endDate: end,
            status: 'LOCKED',
            lockedAt: new Date(),
            lockedByUserId: user.sub,
          },
        });

    await this.prisma.timeEntry.updateMany({
      where: {
        id: {
          in: entries.map((entry) => entry.id),
        },
      },
      data: {
        payrollPeriodId: period.id,
        payrollLocked: true,
        payrollUnlockedByMaster: false,
        payrollUnlockedAt: null,
        payrollLockNote: null,
      },
    });

    return period;
  }

  async unlockPeriod(user: AuthUser, periodId: number, note?: string) {
    this.ensurePayrollAccess(user);
    this.ensureMaster(user);

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Lønperioden blev ikke fundet');
    }

    const updatedPeriod = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: 'UNLOCKED',
        unlockedAt: new Date(),
        unlockedByUserId: user.sub,
        unlockNote: note || null,
      },
    });

    await this.prisma.timeEntry.updateMany({
      where: {
        payrollPeriodId: periodId,
      },
      data: {
        payrollLocked: false,
        payrollUnlockedByMaster: true,
        payrollUnlockedAt: new Date(),
        payrollLockNote: note || null,
      },
    });

    return updatedPeriod;
  }

  async unlockTimeEntry(user: AuthUser, timeEntryId: number, note?: string) {
    this.ensurePayrollAccess(user);
    this.ensureMaster(user);

    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!entry) {
      throw new NotFoundException('Tidsregistreringen blev ikke fundet');
    }

    return this.prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        payrollLocked: false,
        payrollUnlockedByMaster: true,
        payrollUnlockedAt: new Date(),
        payrollLockNote: note || null,
      },
    });
  }

  async exportPayrollCsv(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    const { start, end } = this.getPeriodDates(startDate, endDate);

    const unapprovedEntries = await this.prisma.timeEntry.findMany({
      where: {
        ...this.getCinemaFilter(user),
        ...(userId ? { userId: Number(userId) } : {}),
        clockIn: {
          gte: start,
          lte: end,
        },
        clockOut: {
          not: null,
        },
        status: {
          not: 'APPROVED',
        },
      },
      include: {
        user: true,
      },
    });

    if (unapprovedEntries.length > 0) {
      const names = unapprovedEntries
        .map((entry) => `${entry.user.firstName} ${entry.user.lastName}`)
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .join(', ');

      throw new BadRequestException(
        `Kan ikke eksportere. Der findes ${unapprovedEntries.length} ikke-godkendte tidsregistreringer i perioden: ${names}`,
      );
    }

    if (user.role !== 'MASTER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Du har ikke adgang til eksport');
    }

    if (!userId) {
      const period = await this.prisma.payrollPeriod.findFirst({
        where: {
          cinemaId: user.cinemaId,
          startDate: start,
          endDate: end,
        },
      });

      if (period) {
        await this.prisma.payrollPeriod.update({
          where: { id: period.id },
          data: {
            status: 'EXPORTED',
            exportedAt: new Date(),
            exportedByUserId: user.sub,
          },
        });
      }
    }

    const rows = [
      [
        'Medarbejder',
        'Email',
        'Dato',
        'Ind',
        'Ud',
        'Timer',
        'Arbejdstype',
        'Status',
        'Note',
        'Admin note',
        'Låst',
        'Låst op af MASTER',
      ],
    ];

    for (const employee of report) {
      for (const entry of employee.entries) {
        rows.push([
          employee.name,
          employee.email,
          entry.date,
          entry.clockIn,
          entry.clockOut,
          entry.hours.toString().replace('.', ','),
          entry.workType,
          entry.status,
          entry.note || '',
          entry.adminNote || '',
          entry.payrollLocked ? 'Ja' : 'Nej',
          entry.payrollUnlockedByMaster ? 'Ja' : 'Nej',
        ]);
      }
    }

    return rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'),
      )
      .join('\n');
  }
  async exportPayrollXlsx(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet('Payroll');

    sheet.columns = [
      { header: 'Medarbejder', key: 'employee', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Dato', key: 'date', width: 15 },
      { header: 'Ind', key: 'clockIn', width: 25 },
      { header: 'Ud', key: 'clockOut', width: 25 },
      { header: 'Timer', key: 'hours', width: 12 },
      { header: 'Arbejdstype', key: 'workType', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Note', key: 'note', width: 30 },
      { header: 'Admin note', key: 'adminNote', width: 30 },
      { header: 'Låst', key: 'locked', width: 12 },
    ];

    for (const employee of report) {
      for (const entry of employee.entries) {
        sheet.addRow({
          employee: employee.name,
          email: employee.email,
          date: entry.date,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
          hours: entry.hours,
          workType: entry.workType,
          status: entry.status,
          note: entry.note || '',
          adminNote: entry.adminNote || '',
          locked: entry.payrollLocked ? 'Ja' : 'Nej',
        });
      }
    }

    sheet.getRow(1).font = {
      bold: true,
    };

    return workbook.xlsx.writeBuffer();
  }

  async exportPayrollPdf(
    user: AuthUser,
    startDate: string,
    endDate: string,
    userId?: string,
  ): Promise<Buffer> {
    const report = await this.getPayrollReport(
      user,
      startDate,
      endDate,
      userId,
    );

    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(20).text('Lønrapport', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(11).text(`Periode: ${startDate} til ${endDate}`);

    doc.text(`Eksporteret: ${new Date().toLocaleString('da-DK')}`);

    doc.moveDown();

    for (const employee of report) {
      doc.fontSize(14).text(employee.name, {
        underline: true,
      });

      doc.fontSize(10).text(employee.email);

      doc.text(`Timer i alt: ${employee.totalHours.toFixed(2)}`);

      doc.moveDown(0.5);

      for (const entry of employee.entries) {
        doc
          .fontSize(9)
          .text(
            `${entry.date} | ${entry.hours.toFixed(
              2,
            )} timer | ${entry.workType} | ${entry.status}`,
          );

        if (entry.note || entry.adminNote) {
          doc.fontSize(8).text(`Note: ${entry.adminNote || entry.note}`);
        }
      }

      doc.moveDown();
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  async getPayrollAuditHistory(
    user: AuthUser,
    startDate: string,
    endDate: string,
  ) {
    this.ensurePayrollAccess(user);

    const { start, end } = this.getPeriodDates(startDate, endDate);

    const periods = await this.prisma.payrollPeriod.findMany({
      where: {
        ...this.getCinemaFilter(user),
        startDate: {
          gte: start,
        },
        endDate: {
          lte: end,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return periods.map((period) => ({
      id: period.id,
      status: period.status,
      startDate: period.startDate,
      endDate: period.endDate,
      lockedAt: period.lockedAt,
      lockedByUserId: period.lockedByUserId,
      exportedAt: period.exportedAt,
      exportedByUserId: period.exportedByUserId,
      unlockedAt: period.unlockedAt,
      unlockedByUserId: period.unlockedByUserId,
      unlockNote: period.unlockNote,
    }));
  }
}
