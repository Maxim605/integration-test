import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'login should not be empty' })
  login!: string;

  @IsString()
  @IsNotEmpty({ message: 'password should not be empty' })
  password!: string;
}