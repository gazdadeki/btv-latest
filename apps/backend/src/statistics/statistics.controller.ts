import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Statistics')
@ApiBearerAuth()
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('players/statistics/my')
  @ApiOperation({ summary: 'Get player statistics' })
  async getMyStatistics(@Request() req: any) {
    return this.statisticsService.findByUserId(req.user.id);
  }

  @Get('admin/statistics/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user statistics (admin only)' })
  async getUserStatistics(@Param('userId') userId: string) {
    return this.statisticsService.findByUserId(+userId);
  }
}
