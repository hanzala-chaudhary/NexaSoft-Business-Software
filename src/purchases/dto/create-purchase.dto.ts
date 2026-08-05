import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1, { message: 'Quantity kam se kam 1 honi chahiye!' })
  quantity!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsArray()
  @IsOptional()
  serialNumbers?: string[];
}

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Supplier chunna zaroori hai!' })
  supplierId!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @IsIn(['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'])
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek item add karna zaroori hai!' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}