import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum PaymentType {
  CUSTOMER_RECEIPT = 'CUSTOMER_RECEIPT', // Customer se paisa mila (Khata/Udhaar wapsi)
  SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT', // Supplier ko paisa diya
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
  OTHER = 'OTHER',
}

export class CreatePaymentDto {
  @IsEnum(PaymentType, {
    message: 'type must be CUSTOMER_RECEIPT or SUPPLIER_PAYMENT',
  })
  type!: PaymentType;

  @IsNumber({}, { message: 'amount must be a valid number' })
  @IsPositive({ message: 'amount must be greater than 0' })
  amount!: number;

  @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
  method!: PaymentMethod;

  // customerId required only when receiving from a customer
  @ValidateIf((o) => o.type === PaymentType.CUSTOMER_RECEIPT)
  @IsUUID('4', { message: 'customerId must be a valid id' })
  customerId?: string;

  // supplierId required only when paying a supplier
  @ValidateIf((o) => o.type === PaymentType.SUPPLIER_PAYMENT)
  @IsUUID('4', { message: 'supplierId must be a valid id' })
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  // Wire this to req.user.id once the JwtAuthGuard is attached to this controller
  @IsOptional()
  @IsUUID('4')
  receivedBy?: string;
}