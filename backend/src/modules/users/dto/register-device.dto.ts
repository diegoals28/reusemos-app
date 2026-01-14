import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm-token-here' })
  @IsString()
  token: string;

  @ApiProperty({ enum: ['ios', 'android'] })
  @IsEnum(['ios', 'android'])
  deviceType: 'ios' | 'android';

  @ApiPropertyOptional({ example: 'iPhone 14 Pro' })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
