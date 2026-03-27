import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Platform } from './entities/device-token.entity';

@ApiTags('Firebase')
@ApiBearerAuth()
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post('players/devices/register')
  @ApiOperation({ summary: 'Register device token' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerDevice(
    @Request() req: any,
    @Body() body: { token: string; platform: Platform; deviceId?: string },
  ) {
    return this.firebaseService.registerDeviceToken(
      req.user.id,
      body.token,
      body.platform,
      body.deviceId,
    );
  }

  @Get('players/devices')
  @ApiOperation({ summary: 'List registered devices' })
  @ApiResponse({ status: 200, description: 'List of devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDevices() {
    // Implementation would list devices
    return { devices: [] };
  }

  @Delete('players/devices/:tokenId')
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiResponse({ status: 200, description: 'Device unregistered' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async unregisterDevice(
    @Param('tokenId') tokenId: string,
    @Request() req: any,
  ) {
    return this.firebaseService.unregisterDeviceToken(+tokenId, req.user.id);
  }

  @Get('players/notifications/preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req: any) {
    return this.firebaseService.getNotificationPreferences(req.user.id);
  }

  @Put('players/notifications/preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(@Request() req: any, @Body() body: any) {
    return this.firebaseService.updateNotificationPreferences(
      req.user.id,
      body,
    );
  }
}
