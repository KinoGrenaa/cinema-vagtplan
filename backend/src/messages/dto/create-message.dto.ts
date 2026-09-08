import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
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

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  recipientIds?: number[];

  @IsBoolean()
  isBroadcast: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  replyToMessageId?: number | null;

  @IsOptional()
  @IsIn(['REPLY', 'REPLY_ALL'])
  replyMode?: 'REPLY' | 'REPLY_ALL';
}
