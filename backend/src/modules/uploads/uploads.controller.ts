// ============================================
// REUSA - Uploads Controller
// ============================================

import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CloudinaryService } from './cloudinary.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|heic)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const result = await this.cloudinaryService.uploadImage(base64, {
      folder: folder || 'reusa/uploads',
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(
    @UploadedFiles()
    files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(`File ${file.originalname} exceeds size limit`);
      }
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(`File ${file.originalname} has invalid type`);
      }
    }

    const sources = files.map(
      (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
    );

    const results = await this.cloudinaryService.uploadImages(sources, {
      folder: folder || 'reusa/uploads',
    });

    return {
      success: true,
      data: results,
    };
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB for avatars
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const result = await this.cloudinaryService.uploadAvatar(base64, user.id);

    return {
      success: true,
      data: result,
    };
  }

  @Post('product/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload product images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadProductImages(
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(`File ${file.originalname} exceeds size limit`);
      }
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(`File ${file.originalname} has invalid type`);
      }
    }

    const sources = files.map(
      (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
    );

    const results = await this.cloudinaryService.uploadProductImages(sources, productId);

    return {
      success: true,
      data: results,
    };
  }

  @Delete(':publicId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an image' })
  async deleteImage(@Param('publicId') publicId: string) {
    // Decode the public ID (it may be URL encoded)
    const decodedId = decodeURIComponent(publicId);

    const success = await this.cloudinaryService.deleteImage(decodedId);

    return {
      success,
      message: success ? 'Image deleted' : 'Failed to delete image',
    };
  }

  @Post('url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload image from URL' })
  async uploadFromUrl(
    @Body('url') url: string,
    @Body('folder') folder?: string,
  ) {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    const result = await this.cloudinaryService.uploadImage(url, {
      folder: folder || 'reusa/uploads',
    });

    return {
      success: true,
      data: result,
    };
  }
}
