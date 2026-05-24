import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiLearningService } from './ai-learning.service';

@Module({
  imports: [PrismaModule],
  providers: [AiLearningService],
  exports: [AiLearningService],
})
export class AiLearningModule {}
