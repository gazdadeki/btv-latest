import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CalendarService } from './calendar.service';
import { AdminService } from './admin.service';
import { SchedulerService } from '../scheduler/scheduler.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private calendarService: CalendarService,
    private adminService: AdminService,
    private schedulerService: SchedulerService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar view' })
  async getCalendar(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    return this.calendarService.generateCalendar(start, end);
  }

  @Get('scheduler/status')
  @ApiOperation({ summary: 'Get cron scheduler execution status' })
  async getSchedulerStatus() {
    return this.schedulerService.getStatus();
  }
}
