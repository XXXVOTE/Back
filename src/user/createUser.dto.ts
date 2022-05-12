import { IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  email: string;
  @IsString()
  studentNum: string;
  @IsString()
  enrollSecret: string;
}
