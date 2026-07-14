import {
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateDefaultCinemaDto {
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  cinemaId: number | null;
}
