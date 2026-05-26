import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireVerified } from '../common/decorators/require-verified.decorator';
import { VerifiedGuard } from '../auth/guards/verified.guard';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('players/subscription')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @ApiOperation({ summary: 'Get current subscription status and details' })
  @ApiResponse({ status: 200, description: 'Subscription status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Account not verified or banned' })
  async getSubscription(@Request() req: any) {
    const subscription = await this.subscriptionsService.getCurrentSubscription(
      req.user.id,
    );
    return { subscription };
  }

  @Get('players/subscription/history')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @ApiOperation({ summary: 'Get subscription history' })
  @ApiResponse({ status: 200, description: 'Subscription history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getSubscriptionHistory(@Request() req: any) {
    const subscriptions =
      await this.subscriptionsService.getSubscriptionHistory(req.user.id);
    return { subscriptions };
  }

  @Post('players/subscription/subscribe')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @ApiOperation({ summary: 'Subscribe to Gold tier' })
  @ApiResponse({ status: 201, description: 'Subscribed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async subscribe(@Request() req: any, @Body() body: { productId: number }) {
    const subscription = await this.subscriptionsService.createSubscription(
      req.user.id,
      body.productId,
    );
    return { message: 'Subscription created successfully', subscription };
  }

  @Post('players/subscription/cancel')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async cancel(@Request() req: any) {
    await this.subscriptionsService.cancelSubscription(req.user.id);
    return { message: 'Subscription cancelled successfully' };
  }

  @Get('admin/subscriptions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all subscriptions (admin only)' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async findAllAdmin() {
    const subscriptions = await this.subscriptionsService.findAll();
    return { subscriptions };
  }

  @Get('admin/subscriptions/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user subscription details (admin only)' })
  @ApiResponse({ status: 200, description: 'User subscription' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserSubscription(@Param('userId') userId: string) {
    const subscription = await this.subscriptionsService.findByUserId(+userId);
    return { subscription };
  }

  @Post('admin/subscriptions/:userId/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel user subscription (admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async cancelAdmin(@Param('userId') userId: string) {
    await this.subscriptionsService.cancelSubscription(+userId);
    return { message: 'Subscription cancelled successfully' };
  }
}
