import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Adgangskode skal være mindst 8 tegn.' })
  password: string;
}