import {
  Controller,
  Get,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import { AuditLog } from '../audit/entities/audit-log.entity';

/**
 * Controller for managing audit logs in the admin dashboard.
 *
 * Provides endpoints for viewing audit logs with filtering and pagination.
 * All endpoints require admin role authentication.
 *
 * Audit logs track all significant actions in the system including:
 * - User authentication events (login, logout, registration)
 * - Admin actions (user management, configuration changes)
 * - Financial transactions (payments, refunds)
 * - CRUD operations on entities
 * - Security events (failed login attempts, bans)
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get paginated list of audit logs with optional filters.
   *
   * Supports filtering by:
   * - userId: Filter logs for a specific user
   * - action: Filter by action type (e.g., 'USER_LOGIN', 'RESERVATION_CREATED')
   * - entityType: Filter by entity type (e.g., 'User', 'Reservation')
   * - startDate: Filter logs created after this date
   * - endDate: Filter logs created before this date
   *
   * Results are ordered by creation date (newest first) and paginated.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @param userId - Optional user ID filter
   * @param action - Optional action type filter
   * @param entityType - Optional entity type filter
   * @param startDate - Optional start date filter (ISO date string)
   * @param endDate - Optional end date filter (ISO date string)
   * @returns Paginated audit logs with metadata
   */
  @Get('audit-logs')
  @ApiOperation({
    summary: 'Get audit logs',
    description:
      'Retrieve paginated audit logs with optional filters. Results are ordered by creation date (newest first).',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: Number,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    type: String,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    type: String,
    description: 'Filter by entity type',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved audit logs',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              userId: { type: 'number', nullable: true },
              userEmail: { type: 'string', nullable: true },
              action: { type: 'string' },
              entityType: { type: 'string' },
              entityId: { type: 'string', nullable: true },
              details: { type: 'object', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: number,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Parse and validate pagination parameters
    const pageNum = page ? Math.max(1, parseInt(page.toString(), 10)) : 1;
    const limitNum = limit
      ? Math.min(100, Math.max(1, parseInt(limit.toString(), 10)))
      : 10;

    // Parse date filters
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    // Validate dates
    if (startDate && isNaN(startDateObj.getTime())) {
      throw new BadRequestException(
        'Invalid startDate format. Use ISO date string.',
      );
    }
    if (endDate && isNaN(endDateObj.getTime())) {
      throw new BadRequestException(
        'Invalid endDate format. Use ISO date string.',
      );
    }

    // Parse userId if provided
    const userIdNum = userId ? parseInt(userId.toString(), 10) : undefined;

    const result = await this.auditService.findAll({
      userId: userIdNum,
      action,
      entityType,
      startDate: startDateObj,
      endDate: endDateObj,
      page: pageNum,
      limit: limitNum,
    });

    return result;
  }

  /**
   * Get a specific audit log by ID.
   *
   * Returns full details of a single audit log entry including:
   * - User information (if applicable)
   * - Action details
   * - Entity information
   * - Request metadata (IP address, user agent)
   * - Timestamp
   *
   * @param id - Audit log ID
   * @returns Audit log entry with full details
   */
  @Get('audit-logs/:id')
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieve a specific audit log entry with full details.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Audit log ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved audit log',
    type: AuditLog,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLog(@Param('id', ParseIntPipe) id: number): Promise<AuditLog> {
    const log = await this.auditService.findOne(id);
    if (!log) {
      throw new NotFoundException('Audit log not found');
    }
    return log;
  }
}
