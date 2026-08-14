import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSupplierDto {
  @IsString({ message: 'Supplier name must be a string' })
  @IsNotEmpty({ message: 'Supplier ka naam zaroori hai!' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsString({ message: 'Email must be a string' })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    let cleaned = value.trim().toLowerCase();
    // Intelligent auto-correction: replacing common comma typo with dot
    cleaned = cleaned.replace(/,com$/, '.com');
    cleaned = cleaned.replace(/,/, '.'); // replaces any other accidental comma in domain
    return cleaned;
  })
  email?: string;

  @IsString({ message: 'Company must be a string' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  company?: string;

  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  address?: string;
}