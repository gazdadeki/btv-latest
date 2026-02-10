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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserRole, SubscriptionTier } from './entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { StripeService } from '../stripe/stripe.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Extract IP address from request for audit logging
   */
  private extractIpAddress(req: any): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.split(',');
      return ips[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }
    if (req.ip) {
      return req.ip;
    }
    return (
      req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'isBanned', required: false, type: Boolean })
  @ApiQuery({
    name: 'subscriptionTier',
    required: false,
    enum: SubscriptionTier,
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('role') role?: UserRole,
    @Query('isVerified') isVerified?: string,
    @Query('isBanned') isBanned?: string,
    @Query('subscriptionTier') subscriptionTier?: SubscriptionTier,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (role) filters.role = role;
    if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
    if (isBanned !== undefined) filters.isBanned = isBanned === 'true';
    if (subscriptionTier) filters.subscriptionTier = subscriptionTier;
    if (search) filters.search = search;
    return this.usersService.findAll(filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (admin only)' })
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
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(+id, body);
  }

  @Put(':id/role')
  @ApiOperation({ summary: 'Change user role' })
  async updateRole(@Param('id') id: string, @Body() body: { role: UserRole }) {
    return this.usersService.update(+id, { role: body.role });
  }

  @Put(':id/ban')
  @ApiOperation({ summary: 'Ban user' })
  async ban(
    @Param('id') id: string,
    @Body() body: { isBanned: boolean; bannedUntil?: string },
  ) {
    return this.usersService.update(+id, {
      isBanned: body.isBanned,
      bannedUntil: body.bannedUntil ? new Date(body.bannedUntil) : null,
    });
  }

  @Put(':id/unban')
  @ApiOperation({ summary: 'Unban user' })
  async unban(@Param('id') id: string) {
    return this.usersService.update(+id, {
      isBanned: false,
      bannedUntil: null,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (void) user (soft delete)' })
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
  async unlinkStripeCustomer(@Param('id') id: string) {
    return this.usersService.update(+id, {
      stripeCustomerId: null,
    });
  }

  @Post(':id/stripe/create-customer')
  @ApiOperation({ summary: 'Create new Stripe customer for user' })
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
