import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  elapsedMilliseconds,
  formatStartupDuration,
} from '../common/startup-timing';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const startedAt = performance.now();
    await this.$connect();
    this.logger.log(
      `Databaseforbindelsen blev klar på ${formatStartupDuration(
        elapsedMilliseconds(startedAt),
      )}.`,
    );
  }
}
