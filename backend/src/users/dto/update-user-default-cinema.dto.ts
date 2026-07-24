import {
  IsInt,
  Min,
} from 'class-validator';

export class UpdateUserDefaultCinemaDto {
  @IsInt()
  @Min(1)
  cinemaId: number;
}
