import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MovieShowingsController } from './movie-showings.controller';
import { MovieShowingsService } from './movie-showings.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [MovieShowingsController],
  providers: [MovieShowingsService],
})
export class MovieShowingsModule {}
