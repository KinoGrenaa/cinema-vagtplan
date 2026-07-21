import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Emne skal udfyldes' })
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Besked skal udfyldes' })
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  receiverId?: number | null;

  @IsBoolean()
  isBroadcast: boolean;
}
