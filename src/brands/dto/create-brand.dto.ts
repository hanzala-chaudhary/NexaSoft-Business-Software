import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty({ message: 'Brand ka naam zaroori hai! (e.g. Samsung, Seagate, WD)' })
  name!: string;

  @IsString()
  @IsOptional()
  country?: string;
}