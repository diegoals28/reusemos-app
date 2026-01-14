import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInterestsDto {
  @ApiProperty({ example: ['ropa', 'electronica', 'hogar'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  interests: string[];
}
