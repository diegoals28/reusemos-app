// ============================================
// REUSA - Chilexpress DTOs
// Basado en la documentación oficial de la API
// ============================================

import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// Request DTOs - Estructura real de la API
// ============================================

export class ChilexpressHeaderDto {
  @IsNumber()
  @IsOptional()
  certificateNumber?: number;

  @IsString()
  customerCardNumber: string; // TCC - Tarjeta Cliente Chilexpress

  @IsString()
  countyOfOriginCoverageCode: string; // Código comuna origen (ej: "PUDA")

  @IsNumber()
  labelType: number; // 1 = IMAGE, 2 = EPL

  @IsString()
  @IsOptional()
  marketplaceRut?: string;

  @IsString()
  @IsOptional()
  sellerRut?: string;
}

export class ChilexpressAddressDto {
  @IsNumber()
  @IsOptional()
  addressId?: number;

  @IsString()
  countyCoverageCode: string; // Código comuna (ej: "PROV", "STGO")

  @IsString()
  streetName: string;

  @IsNumber()
  streetNumber: number;

  @IsString()
  @IsOptional()
  supplement?: string; // Depto, oficina, etc.

  @IsString()
  addressType: 'DEST' | 'DEV'; // DEST = Destinatario, DEV = Devolución/Remitente

  @IsBoolean()
  @IsOptional()
  deliveryOnCommercialOffice?: boolean; // Entrega en sucursal

  @IsString()
  @IsOptional()
  commercialOfficeId?: string; // ID sucursal si deliveryOnCommercialOffice = true

  @IsString()
  @IsOptional()
  observation?: string;
}

export class ChilexpressContactDto {
  @IsString()
  name: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  mail: string;

  @IsString()
  contactType: 'R' | 'D'; // R = Remitente, D = Destinatario
}

export class ChilexpressPackageDto {
  @IsString()
  weight: string; // en kg

  @IsString()
  height: string; // en cm

  @IsString()
  width: string; // en cm

  @IsString()
  length: string; // en cm

  @IsString()
  serviceDeliveryCode: string; // "3" = Día hábil siguiente

  @IsString()
  productCode: string; // "3" = Encomienda

  @IsString()
  deliveryReference: string; // Referencia única del envío

  @IsString()
  @IsOptional()
  groupReference?: string;

  @IsString()
  @IsOptional()
  declaredValue?: string; // Valor declarado en pesos

  @IsString()
  @IsOptional()
  declaredContent?: string; // Descripción del contenido

  @IsNumber()
  @IsOptional()
  receivableAmountInDelivery?: number; // Monto a cobrar contra entrega
}

export class ChilexpressDetailDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChilexpressAddressDto)
  addresses: ChilexpressAddressDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChilexpressContactDto)
  contacts: ChilexpressContactDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChilexpressPackageDto)
  packages: ChilexpressPackageDto[];
}

// Request principal para crear orden de transporte
export class CreateTransportOrderDto {
  @ValidateNested()
  @Type(() => ChilexpressHeaderDto)
  header: ChilexpressHeaderDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChilexpressDetailDto)
  details: ChilexpressDetailDto[];
}

// ============================================
// Response DTOs
// ============================================

export class ChilexpressLabelDto {
  labelData: string; // base64
  labelType: string;
}

export class ChilexpressPackageResponseDto {
  transportOrderNumber: number;
  reference: string;
  productDescription: string;
  serviceDescription: string;
  barcode: string;
  recipient: string;
  address: string;
  groupReference: string;
  statusCode: number;
  statusDescription: string;
  label: ChilexpressLabelDto;
}

export class ChilexpressHeaderResponseDto {
  certificateNumber: number;
  countOfGeneratedOrders: number;
}

export class ChilexpressTransportOrderResponseDto {
  statusCode: number;
  statusDescription: string;
  errors?: string[];
  data?: {
    header: ChilexpressHeaderResponseDto;
    detail: ChilexpressPackageResponseDto[]; // Note: "detail" not "details"
  };
}

// ============================================
// DTOs para uso interno / Frontend
// ============================================

// DTO para solicitar etiqueta desde frontend
export class RequestShippingLabelDto {
  @IsString()
  transactionId: string;

  // Dirección de origen (vendedor)
  @IsString()
  originAddress: string;

  @IsNumber()
  originStreetNumber: number;

  @IsString()
  originCountyCode: string; // Código comuna (ej: "STGO", "PROV")

  @IsString()
  @IsOptional()
  originSupplement?: string; // Depto, oficina, etc.

  // Contacto remitente
  @IsString()
  senderName: string;

  @IsString()
  senderPhone: string;

  @IsString()
  senderEmail: string;

  // Datos del paquete
  @IsNumber()
  packageWeight: number; // kg

  @IsNumber()
  packageHeight: number; // cm

  @IsNumber()
  packageWidth: number; // cm

  @IsNumber()
  packageLength: number; // cm

  @IsString()
  @IsOptional()
  packageContent?: string;

  @IsNumber()
  @IsOptional()
  declaredValue?: number;

  // Entrega en sucursal (opcional)
  @IsBoolean()
  @IsOptional()
  deliveryOnCommercialOffice?: boolean;

  @IsString()
  @IsOptional()
  commercialOfficeId?: string;
}

// Response para el frontend
export class ShippingLabelResponseDto {
  success: boolean;
  transportOrderNumber?: string;
  barcode?: string;
  trackingUrl?: string;
  labelUrl?: string;
  labelBase64?: string;
  labelType?: string;
  error?: string;
}

// DTO para consultar cobertura
export class CoverageQueryDto {
  @IsString()
  @IsOptional()
  regionCode?: string;

  @IsString()
  @IsOptional()
  countyName?: string;
}

export class CoverageResponseDto {
  countyCode: string;
  countyName: string;
  regionCode: string;
  regionName: string;
  ineCountyCode: string;
  queryMode: number;
}

// DTO para cotización
export class ShippingQuoteRequestDto {
  @IsString()
  originCountyCode: string;

  @IsString()
  destinationCountyCode: string;

  @IsNumber()
  weight: number;

  @IsNumber()
  height: number;

  @IsNumber()
  width: number;

  @IsNumber()
  length: number;

  @IsNumber()
  @IsOptional()
  declaredValue?: number;
}

export class ShippingQuoteResponseDto {
  serviceCode: string;
  serviceName: string;
  serviceDescription: string;
  deliveryTime: string;
  totalPrice: number;
  currencyCode: string;
}
