import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Verification')
@ApiBearerAuth()
@Controller({ path: 'verification', version: '1' })
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request verification code' })
  async request(@Request() req: any) {
    return this.verificationService.requestVerification(
      req.user.id,
      req.ip,
      req.get('user-agent'),
    );
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify with code' })
  @ApiBody({ schema: { properties: { code: { type: 'string' } } } })
  async verify(@Request() req: any, @Body() body: { code: string }) {
    return this.verificationService.verify(
      req.user.id,
      body.code,
      req.ip,
      req.get('user-agent'),
    );
  }

  @Post('admin/users/:id/request-verification')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Request verification for user (admin only)' })
  async adminRequest(@Param('id') userId: string, @Request() req: any) {
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.connection?.remoteAddress ||
      'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    await this.verificationService.requestVerification(
      +userId,
      ipAddress,
      userAgent,
    );
    return { success: true, message: 'Verification code requested' };
  }

  @Put('admin/users/:id/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually verify user (admin only)' })
  async adminVerify(@Param('id') userId: string, @Request() req: any) {
    await this.verificationService.adminVerify(+userId, req.user.id);
    return { success: true, message: 'User verified successfully' };
  }

  @Get('admin/users/:id/latest-code')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get latest verification code for user (admin only)',
  })
  async getLatestCode(@Param('id') userId: string) {
    const code = await this.verificationService.getLatestCode(+userId);
    if (!code) {
      return { code: null, expiresAt: null };
    }
    return {
      code: code.code,
      expiresAt: code.expiresAt,
      createdAt: code.createdAt,
    };
  }
}
