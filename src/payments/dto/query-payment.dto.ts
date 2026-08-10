import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
  OTHER = 'OTHER',
}

export class QueryPaymentDto {
  @IsOptional()
  @IsString()
  search?: string;

  // This is a DIRECTION filter (money in vs money out) — not the raw `type` column
  // in the DB, which has several legacy values depending on which part of the app
  // created the row (CUSTOMER_PAYMENT, CUSTOMER_ADVANCE, SALE_PAYMENT, etc).
  @IsOptional()
  @IsIn(['CUSTOMER_RECEIPT', 'SUPPLIER_PAYMENT'])
  type?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  // Expected format: YYYY-MM-DD
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}