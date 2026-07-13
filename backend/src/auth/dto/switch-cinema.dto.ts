import { IsInt, Min } from 'class-validator';

export class SwitchCinemaDto {
  @IsInt()
  @Min(1)
  cinemaId: number;
}
