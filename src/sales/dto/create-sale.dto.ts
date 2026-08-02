import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

class SaleItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1, { message: 'Quantity kam se kam 1 honi chahiye!' })
  quantity!: number;

  @IsNumber()
  @Min(0)
  salePrice!: number;

  @IsArray()
  @IsOptional()
  serialNumbers?: string[];
}

export class CreateSaleDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek item add karna zaroori hai!' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];
}