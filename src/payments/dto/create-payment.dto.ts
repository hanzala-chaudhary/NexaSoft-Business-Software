import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsOptional()
  saleId?: string;

  @IsString()
  @IsOptional()
  purchaseId?: string;

  @IsNumber()
  @Min(0.01, { message: 'Payment amount 0 se zyada honi chahiye!' })
  amount!: number;

  @IsIn(['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'])
  @IsOptional()
  method?: string;

  @IsIn(['SALE_PAYMENT', 'PURCHASE_PAYMENT', 'EXPENSE_PAYMENT'])
  @IsNotEmpty({ message: 'Payment type zaroori hai!' })
  type!: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}