import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { RequireNotBanned } from '../common/decorators/require-not-banned.decorator';
import { VerifiedGuard } from '../auth/guards/verified.guard';
import { NotBannedGuard } from '../auth/guards/not-banned.guard';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('players/subscription')
  @UseGuards(VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiOperation({ summary: 'Get current subscription status and details' })
  async getSubscription(@Request() req: any) {
    const subscription = await this.subscriptionsService.getCurrentSubscription(
      req.user.id,
    );
    return { subscription };
  }

  @Get('players/subscription/history')
  @UseGuards(VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiOperation({ summary: 'Get subscription history' })
  async getSubscriptionHistory(@Request() req: any) {
    const subscriptions =
      await this.subscriptionsService.getSubscriptionHistory(req.user.id);
    return { subscriptions };
  }

  @Post('players/subscription/subscribe')
  @UseGuards(VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiOperation({ summary: 'Subscribe to Gold tier' })
  async subscribe(@Request() req: any, @Body() body: { productId: number }) {
    const subscription = await this.subscriptionsService.createSubscription(
      req.user.id,
      body.productId,
    );
    return { message: 'Subscription created successfully', subscription };
  }

  @Post('players/subscription/cancel')
  @UseGuards(VerifiedGuard, NotBannedGuard)
  @RequireVerified()
  @RequireNotBanned()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancel(@Request() req: any) {
    await this.subscriptionsService.cancelSubscription(req.user.id);
    return { message: 'Subscription cancelled successfully' };
  }

  @Get('admin/subscriptions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all subscriptions (admin only)' })
  async findAllAdmin() {
    const subscriptions = await this.subscriptionsService.findAll();
    return { subscriptions };
  }

  @Get('admin/subscriptions/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user subscription details (admin only)' })
  async getUserSubscription(@Param('userId') userId: string) {
    const subscription = await this.subscriptionsService.findByUserId(+userId);
    return { subscription };
  }

  @Post('admin/subscriptions/:userId/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel user subscription (admin only)' })
  async cancelAdmin(@Param('userId') userId: string) {
    await this.subscriptionsService.cancelSubscription(+userId);
    return { message: 'Subscription cancelled successfully' };
  }
}
