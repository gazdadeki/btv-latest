import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Config')
@ApiBearerAuth()
@Controller({ path: 'admin/config', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all configuration' })
  @ApiResponse({ status: 200, description: 'All configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getAll() {
    const keys = [
      'jwt_access_token_expiry',
      'jwt_refresh_token_expiry',
      'verification_code_expiry_minutes',
      'cache_ttl_seconds',
      'gold_discount_percentage',
      'subscription_grace_period_days',
      'subscription_upgrade_policy',
      'subscription_downgrade_policy',
      'audit_log_retention_days',
      'user_idle_minutes',
      'user_away_minutes',
    ];
    const config: Record<string, string> = {};
    for (const key of keys) {
      config[key] = await this.configService.get(key);
    }
    return config;
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get specific configuration' })
  @ApiResponse({ status: 200, description: 'Configuration value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Config key not found' })
  async get(@Param('key') key: string) {
    return { key, value: await this.configService.get(key) };
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Config key not found' })
  async update(
    @Param('key') key: string,
    @Body() body: { value: string; description?: string },
  ) {
    await this.configService.set(key, body.value, body.description);
    return { key, value: body.value };
  }
}
