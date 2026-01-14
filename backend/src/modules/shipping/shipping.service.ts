// ============================================
// REUSA - Shipping Service (Chilexpress Integration)
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import axios, { AxiosInstance } from 'axios';
import {
  CreateTransportOrderDto,
  ChilexpressTransportOrderResponseDto,
  RequestShippingLabelDto,
  ShippingLabelResponseDto,
  CoverageResponseDto,
  ShippingQuoteResponseDto,
} from './dto/chilexpress.dto';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly tcc: string; // Tarjeta Cliente Chilexpress
  private readonly marketplaceRut: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // URLs de Chilexpress
    this.apiUrl = this.isProduction
      ? 'https://services.wschilexpress.com'
      : 'https://testservices.wschilexpress.com';

    this.apiKey = this.configService.get<string>('CHILEXPRESS_API_KEY') || '';
    this.tcc = this.configService.get<string>('CHILEXPRESS_TCC') || '18578680'; // Test TCC
    this.marketplaceRut = this.configService.get<string>('CHILEXPRESS_MARKETPLACE_RUT') || '96756430';

    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Generate shipping label for a transaction
   */
  async generateShippingLabel(
    userId: string,
    dto: RequestShippingLabelDto,
  ): Promise<ShippingLabelResponseDto> {
    // Get transaction with all related data
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      include: {
        product: true,
        buyer: true,
        seller: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    // Only seller can generate shipping label
    if (transaction.sellerId !== userId) {
      throw new ForbiddenException('Solo el vendedor puede generar la etiqueta de envío');
    }

    // Must be in PAID status to generate label
    if (transaction.status !== TransactionStatus.PAID) {
      throw new BadRequestException(
        'La transacción debe estar pagada para generar la etiqueta de envío',
      );
    }

    // Must be shipping delivery method
    if (transaction.deliveryMethod !== 'shipping') {
      throw new BadRequestException(
        'Esta transacción no requiere envío',
      );
    }

    // Check if label already exists
    if (transaction.shippingOrderNumber) {
      return {
        success: true,
        transportOrderNumber: transaction.shippingOrderNumber,
        barcode: transaction.shippingBarcode || undefined,
        trackingUrl: transaction.trackingUrl || undefined,
        labelUrl: transaction.shippingLabelUrl || undefined,
        labelBase64: transaction.shippingLabelData || undefined,
        labelType: transaction.shippingLabelType || undefined,
      };
    }

    // Extract destination street number from address
    const destStreetNumber = this.extractStreetNumber(transaction.shippingAddress || '');

    // Build Chilexpress request with correct structure
    const transportOrderRequest: CreateTransportOrderDto = {
      header: {
        certificateNumber: 0,
        customerCardNumber: this.tcc,
        countyOfOriginCoverageCode: dto.originCountyCode,
        labelType: 1, // 1 = IMAGE (PNG), 2 = EPL
        marketplaceRut: this.marketplaceRut,
        sellerRut: 'DEFAULT',
      },
      details: [
        {
          addresses: [
            // Destinatario (comprador)
            {
              addressId: 0,
              countyCoverageCode: transaction.shippingCountyCode || 'STGO',
              streetName: this.extractStreetName(transaction.shippingAddress || ''),
              streetNumber: destStreetNumber,
              supplement: transaction.shippingNotes || '',
              addressType: 'DEST',
              deliveryOnCommercialOffice: dto.deliveryOnCommercialOffice || false,
              commercialOfficeId: dto.commercialOfficeId || undefined,
              observation: `Pedido REUSA ${transaction.id.slice(0, 8)}`,
            },
            // Devolución (vendedor/remitente)
            {
              addressId: 0,
              countyCoverageCode: dto.originCountyCode,
              streetName: dto.originAddress,
              streetNumber: dto.originStreetNumber,
              supplement: dto.originSupplement || '',
              addressType: 'DEV',
              deliveryOnCommercialOffice: false,
              observation: 'Remitente',
            },
          ],
          contacts: [
            // Remitente (vendedor)
            {
              name: dto.senderName,
              phoneNumber: this.formatPhoneNumber(dto.senderPhone),
              mail: dto.senderEmail,
              contactType: 'R',
            },
            // Destinatario (comprador)
            {
              name: transaction.buyer.displayName,
              phoneNumber: this.formatPhoneNumber(transaction.buyer.phoneNumber || ''),
              mail: transaction.buyer.email,
              contactType: 'D',
            },
          ],
          packages: [
            {
              weight: dto.packageWeight.toString(),
              height: dto.packageHeight.toString(),
              width: dto.packageWidth.toString(),
              length: dto.packageLength.toString(),
              serviceDeliveryCode: '3', // Día hábil siguiente
              productCode: '3', // Encomienda
              deliveryReference: `REUSA-${transaction.id.slice(0, 8)}-${Date.now()}`,
              groupReference: 'REUSA',
              declaredValue: (dto.declaredValue || transaction.amount || 10000).toString(),
              declaredContent: '1', // Código contenido: 1=Otros
              receivableAmountInDelivery: 0, // Sin cobro contra entrega
            },
          ],
        },
      ],
    };

    try {
      // Call Chilexpress API
      const response = await this.createTransportOrder(transportOrderRequest);

      // Check for errors at package level (statusCode 99 means some packages failed)
      const packageData = response.data?.detail?.[0];

      if (!packageData) {
        throw new BadRequestException('No se recibió respuesta del paquete');
      }

      // Check package-level status
      if (packageData.statusCode !== 0) {
        throw new BadRequestException(
          `Error de Chilexpress: ${packageData.statusDescription || response.statusDescription}`,
        );
      }

      const orderNumber = packageData.transportOrderNumber.toString();
      const barcode = packageData.barcode;
      const labelData = packageData.label?.labelData;

      // Update transaction with shipping data
      await this.prisma.transaction.update({
        where: { id: dto.transactionId },
        data: {
          shippingCarrier: 'Chilexpress',
          shippingOrderNumber: orderNumber,
          shippingBarcode: barcode,
          trackingNumber: orderNumber,
          trackingUrl: `https://www.chilexpress.cl/seguimiento/?n_orden=${orderNumber}`,
          shippingLabelData: labelData,
          shippingLabelType: 'IMAGE',
        },
      });

      this.logger.log(
        `Shipping label generated for transaction ${dto.transactionId}: OT ${orderNumber}`,
      );

      return {
        success: true,
        transportOrderNumber: orderNumber,
        barcode: barcode,
        trackingUrl: `https://www.chilexpress.cl/seguimiento/?n_orden=${orderNumber}`,
        labelBase64: labelData,
        labelType: 'IMAGE',
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate shipping label: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Error al generar etiqueta de envío: ${error.message}`,
      );
    }
  }

  /**
   * Create transport order in Chilexpress
   */
  private async createTransportOrder(
    dto: CreateTransportOrderDto,
  ): Promise<ChilexpressTransportOrderResponseDto> {
    try {
      this.logger.debug('Chilexpress request:', JSON.stringify(dto, null, 2));

      const response = await this.httpClient.post<ChilexpressTransportOrderResponseDto>(
        '/transport-orders/api/v1.0/transport-orders',
        dto,
      );

      this.logger.debug('Chilexpress response:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Chilexpress API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(
          error.response?.data?.statusDescription || 'Error en la API de Chilexpress',
        );
      }
      throw error;
    }
  }

  /**
   * Get coverage areas (comunas) for shipping
   */
  async getCoverageAreas(regionCode?: string): Promise<CoverageResponseDto[]> {
    try {
      const url = regionCode
        ? `/coverage/api/v1.0/coverage/areas?RegionCode=${regionCode}&type=0`
        : '/coverage/api/v1.0/coverage/areas?type=0';

      const response = await this.httpClient.get(url);

      return response.data.coverageAreas || [];
    } catch (error) {
      this.logger.error(`Failed to get coverage areas: ${error.message}`);

      // Return mock data for development
      if (!this.isProduction && !this.apiKey) {
        return this.getMockCoverageAreas();
      }

      throw new BadRequestException('Error al obtener áreas de cobertura');
    }
  }

  /**
   * Calculate shipping quote
   */
  async calculateShippingQuote(
    originCountyCode: string,
    destinationCountyCode: string,
    weight: number,
    height: number,
    width: number,
    length: number,
  ): Promise<ShippingQuoteResponseDto[]> {
    try {
      const response = await this.httpClient.post('/rating/api/v1.0/rates/courier', {
        originCountyCode,
        destinationCountyCode,
        package: {
          weight: weight.toString(),
          height: height.toString(),
          width: width.toString(),
          length: length.toString(),
        },
        productType: 3, // Encomienda
        contentType: 1, // Otro
        declaredWorth: 0,
        deliveryTime: 0,
      });

      return response.data.courierServiceOptions || [];
    } catch (error) {
      this.logger.error(`Failed to calculate shipping quote: ${error.message}`);

      // Return mock data for development
      if (!this.isProduction && !this.apiKey) {
        return this.getMockShippingQuotes();
      }

      throw new BadRequestException('Error al calcular tarifa de envío');
    }
  }

  /**
   * Get shipping label for existing transaction
   */
  async getShippingLabel(
    userId: string,
    transactionId: string,
  ): Promise<ShippingLabelResponseDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    // Both buyer and seller can view the label
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    if (!transaction.shippingOrderNumber) {
      throw new NotFoundException('No hay etiqueta de envío generada para esta transacción');
    }

    return {
      success: true,
      transportOrderNumber: transaction.shippingOrderNumber,
      barcode: transaction.shippingBarcode || undefined,
      trackingUrl: transaction.trackingUrl || undefined,
      labelUrl: transaction.shippingLabelUrl || undefined,
      labelBase64: transaction.shippingLabelData || undefined,
      labelType: transaction.shippingLabelType || undefined,
    };
  }

  /**
   * Track shipment status
   */
  async trackShipment(
    trackingNumber: string,
  ): Promise<{
    status: string;
    events: { date: string; description: string; location: string }[];
  }> {
    try {
      const response = await this.httpClient.get(
        `/tracking/api/v1.0/tracking/${trackingNumber}`,
      );

      return {
        status: response.data.status || 'UNKNOWN',
        events: response.data.events || [],
      };
    } catch (error) {
      this.logger.error(`Failed to track shipment: ${error.message}`);

      // Return mock data for development
      if (!this.isProduction && !this.apiKey) {
        return this.getMockTrackingData();
      }

      throw new BadRequestException('Error al consultar estado del envío');
    }
  }

  // Helper methods
  private extractStreetName(address: string): string {
    // Remove numbers at the end (street number)
    return address.replace(/\s*\d+\s*$/, '').trim() || address;
  }

  private extractStreetNumber(address: string): number {
    const match = address.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // If starts with 56 (Chile), keep it, otherwise add it
    if (cleaned.startsWith('56')) {
      return cleaned;
    }

    // If starts with 9 (mobile), add 56
    if (cleaned.startsWith('9') && cleaned.length === 9) {
      return `56${cleaned}`;
    }

    return cleaned || '999999999';
  }

  // Mock data for development
  private getMockCoverageAreas(): CoverageResponseDto[] {
    return [
      {
        countyCode: 'STGO',
        countyName: 'Santiago',
        regionCode: 'RM',
        regionName: 'Región Metropolitana',
        ineCountyCode: '13101',
        queryMode: 0,
      },
      {
        countyCode: 'PROV',
        countyName: 'Providencia',
        regionCode: 'RM',
        regionName: 'Región Metropolitana',
        ineCountyCode: '13123',
        queryMode: 0,
      },
      {
        countyCode: 'LASC',
        countyName: 'Las Condes',
        regionCode: 'RM',
        regionName: 'Región Metropolitana',
        ineCountyCode: '13114',
        queryMode: 0,
      },
      {
        countyCode: 'NUNO',
        countyName: 'Ñuñoa',
        regionCode: 'RM',
        regionName: 'Región Metropolitana',
        ineCountyCode: '13120',
        queryMode: 0,
      },
      {
        countyCode: 'VINA',
        countyName: 'Viña del Mar',
        regionCode: 'V',
        regionName: 'Región de Valparaíso',
        ineCountyCode: '05109',
        queryMode: 0,
      },
      {
        countyCode: 'CONC',
        countyName: 'Concepción',
        regionCode: 'VIII',
        regionName: 'Región del Biobío',
        ineCountyCode: '08101',
        queryMode: 0,
      },
      {
        countyCode: 'PUDA',
        countyName: 'Pudahuel',
        regionCode: 'RM',
        regionName: 'Región Metropolitana',
        ineCountyCode: '13124',
        queryMode: 0,
      },
      {
        countyCode: 'MAIP',
        countyName: 'Maipú',
        regionCode: 'RM',
        regionName: 'Región Metropolitana',
        ineCountyCode: '13119',
        queryMode: 0,
      },
    ];
  }

  private getMockShippingQuotes(): ShippingQuoteResponseDto[] {
    return [
      {
        serviceCode: '3',
        serviceName: 'Día Hábil Siguiente',
        serviceDescription: 'Entrega al día hábil siguiente',
        deliveryTime: '1-2 días hábiles',
        totalPrice: 4990,
        currencyCode: 'CLP',
      },
      {
        serviceCode: '4',
        serviceName: 'Día Hábil Subsiguiente',
        serviceDescription: 'Entrega en 2-3 días hábiles',
        deliveryTime: '2-3 días hábiles',
        totalPrice: 3990,
        currencyCode: 'CLP',
      },
      {
        serviceCode: '5',
        serviceName: 'Prioritario',
        serviceDescription: 'Servicio económico',
        deliveryTime: '3-5 días hábiles',
        totalPrice: 2990,
        currencyCode: 'CLP',
      },
    ];
  }

  private getMockTrackingData() {
    return {
      status: 'EN_TRANSITO',
      events: [
        {
          date: new Date().toISOString(),
          description: 'Envío en tránsito',
          location: 'Centro de Distribución Santiago',
        },
        {
          date: new Date(Date.now() - 86400000).toISOString(),
          description: 'Envío recibido en origen',
          location: 'Sucursal Providencia',
        },
      ],
    };
  }
}
