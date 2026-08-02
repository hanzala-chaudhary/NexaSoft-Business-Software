import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer ka naam zaroori hai!' })
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'Email sahi format mein honi chahiye!' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;
}