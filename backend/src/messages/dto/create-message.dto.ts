import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(5000)
  body: string;

  @IsInt()
  cinemaId: number;

  @IsInt()
  senderId: number;

  @IsOptional()
  @IsInt()
  receiverId?: number | null;

  @IsBoolean()
  isBroadcast: boolean;
}