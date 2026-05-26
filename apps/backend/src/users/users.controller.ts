import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserRole, SubscriptionTier } from './entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { StripeService } from '../stripe/stripe.service';
import { ReservationsService } from '../reservations/reservations.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly stripeService: StripeService,
    private readonly reservationsService: ReservationsService,
  ) {}

  /**
   * Extract IP address from request for audit logging
   */
  private extractIpAddress(req: any): string {
    return req.ip ?? 'unknown';
  }

  @Get()
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'isBanned', required: false, type: Boolean })
  @ApiQuery({
    name: 'subscriptionTier',
    required: false,
    enum: SubscriptionTier,
  })
  async findAll(@Query() query: ListUsersQueryDto) {
    const filters: {
      role?: UserRole;
      isVerified?: boolean;
      isBanned?: boolean;
      subscriptionTier?: SubscriptionTier;
      search?: string;
    } = {};
    if (query.role) filters.role = query.role;
    if (query.isVerified !== undefined)
      filters.isVerified = query.isVerified === 'true';
    if (query.isBanned !== undefined)
      filters.isBanned = query.isBanned === 'true';
    if (query.subscriptionTier)
      filters.subscriptionTier = query.subscriptionTier;
    if (query.search) filters.search = query.search;
    return this.usersService.findAllPaginated(
      filters,
      query.page ?? 1,
      query.limit ?? 25,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Request() req: any, @Body() createUserDto: CreateUserDto) {
    const ipAddress = this.extractIpAddress(req);
    const adminId = req.user?.id;
    return this.usersService.createUserWithRelations(
      createUserDto,
      adminId,
      ipAddress,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(+id, body);
  }

  @Put(':id/role')
  @ApiOperation({ summary: 'Change user role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(@Param('id') id: string, @Body() body: { role: UserRole }) {
    return this.usersService.update(+id, { role: body.role });
  }

  @Put(':id/ban')
  @ApiOperation({ summary: 'Ban user' })
  @ApiResponse({ status: 200, description: 'User banned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async ban(
    @Param('id') id: string,
    @Body() body: { isBanned: boolean; bannedUntil?: string },
  ) {
    const updated = await this.usersService.update(+id, {
      isBanned: body.isBanned,
      bannedUntil: body.bannedUntil ? new Date(body.bannedUntil) : null,
    });

    if (body.isBanned) {
      // The ban itself has committed; releasing the user's active-stream slots
      // is best-effort cleanup and must not turn a successful ban into a 500.
      // Log loudly so an operator can reconcile — and note that stream-end
      // cleanup (cancelGamesForEndedStreams) also cancels leftover CREATED/OPEN
      // games, so a missed release self-heals when the stream ends.
      try {
        const released =
          await this.reservationsService.releaseUserFromActiveStream(
            +id,
            'admin_ban',
          );
        if (released > 0) {
          this.logger.log(
            `Released ${released} reservation(s) for banned user ${id}`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Ban for user ${id} committed, but releasing reservations failed: ${message}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }

    return updated;
  }

  @Put(':id/unban')
  @ApiOperation({ summary: 'Unban user' })
  @ApiResponse({ status: 200, description: 'User unbanned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unban(@Param('id') id: string) {
    return this.usersService.update(+id, {
      isBanned: false,
      bannedUntil: null,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (void) user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const adminId = req.user?.id;
    const ipAddress = this.extractIpAddress(req);
    return this.usersService.voidUser(
      +id,
      adminId,
      body.reason || null,
      ipAddress,
    );
  }

  @Get(':id/stripe')
  @ApiOperation({ summary: 'Get Stripe customer information for user' })
  @ApiResponse({ status: 200, description: 'Stripe customer info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getStripeInfo(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    if (!user.stripeCustomerId) {
      return { linked: false, customer: null };
    }

    try {
      const customer = await this.stripeService.getCustomerInfo(
        user.stripeCustomerId,
      );
      return { linked: true, customer };
    } catch {
      return {
        linked: true,
        customer: null,
        error: 'Customer not found in Stripe',
      };
    }
  }

  @Post(':id/stripe/link')
  @ApiOperation({ summary: 'Link user to Stripe customer' })
  @ApiResponse({ status: 200, description: 'Stripe customer linked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async linkStripeCustomer(
    @Param('id') id: string,
    @Body() body: { customerId: string },
  ) {
    await this.usersService.findOne(+id);

    // Verify customer exists in Stripe
    await this.stripeService.getCustomerInfo(body.customerId);

    return this.usersService.update(+id, {
      stripeCustomerId: body.customerId,
    });
  }

  @Post(':id/stripe/unlink')
  @ApiOperation({ summary: 'Unlink Stripe customer from user' })
  @ApiResponse({ status: 200, description: 'Stripe customer unlinked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unlinkStripeCustomer(@Param('id') id: string) {
    return this.usersService.update(+id, {
      stripeCustomerId: null,
    });
  }

  @Post(':id/stripe/create-customer')
  @ApiOperation({ summary: 'Create new Stripe customer for user' })
  @ApiResponse({ status: 201, description: 'Stripe customer created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createStripeCustomer(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);

    if (user.stripeCustomerId) {
      throw new BadRequestException('User already has a Stripe customer');
    }

    const customerId = await this.stripeService.createCustomerForUser(
      user.id,
      user.email,
    );

    return this.usersService.update(+id, {
      stripeCustomerId: customerId,
    });
  }
}
