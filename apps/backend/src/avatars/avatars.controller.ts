import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvatarsService } from './avatars.service';

@ApiTags('Avatars')
@ApiBearerAuth()
@Controller({ path: 'avatars', version: '1' })
@UseGuards(JwtAuthGuard)
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Get()
  @ApiOperation({
    summary: 'List avatars available to the current user (tier-filtered)',
  })
  @ApiResponse({ status: 200, description: 'List of avatars' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(@Request() req: any) {
    const avatars = await this.avatarsService.listForUser(req.user);
    return avatars.map((a) => ({
      id: a.id,
      key: a.key,
      filename: a.filename,
      url: AvatarsService.buildUrl(a.filename),
      tier: a.tier,
      displayName: a.displayName,
      sortOrder: a.sortOrder,
    }));
  }
}
