import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TransactionType } from './entities/transaction.entity';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller({ version: '1' })
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('players/wallet')
  @ApiOperation({ summary: 'Get player wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBalance(@Request() req: any) {
    const wallet = await this.walletService.getBalance(req.user.id);
    return { balance: wallet };
  }

  @Get('players/wallet/transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const wallet = await this.walletService.getWallet(req.user.id);
    return this.walletService.getTransactionHistory(
      wallet.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Extract IP address from request for audit logging
   */
  private extractIpAddress(req: any): string {
    return req.ip ?? 'unknown';
  }

  @Put('admin/users/:id/wallet/grant')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Grant coins to user (admin only)' })
  @ApiResponse({ status: 200, description: 'Coins granted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async grantCoins(
    @Param('id') userId: string,
    @Body() body: { amount: number; description?: string },
    @Request() req: any,
  ) {
    const adminId = req.user?.id;
    const ipAddress = this.extractIpAddress(req);
    const wallet = await this.walletService.grantCoinsToUser(
      +userId,
      body.amount,
      body.description,
      adminId,
      ipAddress,
    );
    return {
      message: 'Coins granted successfully',
      wallet: {
        id: wallet.id,
        userId: wallet.userId,
        balance: parseFloat(wallet.balance.toString()),
      },
    };
  }

  @Get('admin/users/:id/wallet/transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user wallet transactions (admin only)' })
  @ApiResponse({ status: 200, description: 'User transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getAdminTransactions(@Param('id') userId: string) {
    const wallet = await this.walletService.getWallet(+userId);
    return this.walletService.getTransactionHistory(wallet.id, 1, 50);
  }

  @Get('admin/transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all transactions with filters (admin only)' })
  @ApiResponse({ status: 200, description: 'All transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: TransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};
    if (userId) filters.userId = parseInt(userId, 10);
    if (type) filters.type = type;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.walletService.getAllTransactions(
      filters,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
