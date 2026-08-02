import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ka naam zaroori hai!' })
  name!: string;

  @IsNumber({}, { message: 'Sale price number honi chahiye!' })
  @Min(0)
  salePrice!: number;

  @IsNumber({}, { message: 'Purchase price (asal khareed value) zaroori hai!' })
  @Min(0)
  purchasePrice!: number;

  @IsString()
  @IsOptional()
  masterBarcode?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  openingStock?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsBoolean()
  @IsOptional()
  isSerialized?: boolean;
}