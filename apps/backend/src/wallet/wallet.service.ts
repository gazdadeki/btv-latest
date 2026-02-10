import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { StatisticsService } from '../statistics/statistics.service';

/**
 * Service for managing user wallets and transactions.
 * Handles coin deposits, withdrawals, and transaction history.
 *
 * All financial operations use database transactions to ensure atomicity.
 * Balance calculations are performed with proper decimal precision handling.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
    private auditService: AuditService,
    private cacheService: CacheService,
    private statisticsService: StatisticsService,
  ) {}

  async createWallet(userId: number): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      userId,
      balance: 0,
    });
    return this.walletRepository.save(wallet);
  }

  async getWallet(userId: number): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }
    return wallet;
  }

  async getWalletsByUserIds(userIds: number[]): Promise<Wallet[]> {
    if (userIds.length === 0) {
      return [];
    }
    return this.walletRepository.find({
      where: { userId: In(userIds) },
    });
  }

  async getBalance(userId: number): Promise<number> {
    const wallet = await this.getWallet(userId);
    return parseFloat(wallet.balance.toString());
  }

  private async applyDeposit(
    manager: EntityManager,
    walletId: number,
    amount: number,
    description?: string,
  ): Promise<number> {
    const wallet = await manager.findOne(Wallet, {
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => 'balance + :amount' })
      .where('id = :walletId', { walletId })
      .setParameters({ amount })
      .execute();

    await manager.save(
      manager.create(Transaction, {
        walletId,
        type: TransactionType.DEPOSIT,
        amount,
        description,
      }),
    );

    return wallet.userId;
  }

  async deposit(
    walletId: number,
    amount: number,
    description?: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (manager) {
      await this.applyDeposit(manager, walletId, amount, description);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userId = await this.applyDeposit(
        queryRunner.manager,
        walletId,
        amount,
        description,
      );

      await queryRunner.commitTransaction();

      // Update statistics for coins earned (after transaction commit)
      await this.statisticsService.addCoinsEarned(userId, amount);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withdraw(
    walletId: number,
    amount: number,
    description?: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (manager) {
      await this.withdrawWithManager(manager, walletId, amount, description);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.withdrawWithManager(
        queryRunner.manager,
        walletId,
        amount,
        description,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withdrawWithManager(
    manager: EntityManager,
    walletId: number,
    amount: number,
    description?: string,
  ): Promise<void> {
    const updateResult = await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => 'balance - :amount' })
      .where('id = :walletId', { walletId })
      .andWhere('balance >= :amount', { amount })
      .execute();

    if (!updateResult.affected) {
      const wallet = await manager.findOne(Wallet, { where: { id: walletId } });
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }
      throw new BadRequestException('Insufficient balance');
    }

    await manager.save(
      manager.create(Transaction, {
        walletId,
        type: TransactionType.WITHDRAWAL,
        amount,
        description,
      }),
    );
  }

  /**
   * Get transaction history for a wallet with relations.
   * Includes related entities like stripePayment and reservation for complete transaction details.
   * Transforms decimal amounts to numbers for proper JSON serialization.
   *
   * @param walletId - Wallet ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated list of transactions with relations
   */
  async getTransactionHistory(walletId: number, page = 1, limit = 10) {
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { walletId },
      relations: ['stripePayment', 'reservation', 'wallet'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Transform transactions to ensure amounts are numbers (TypeORM decimal returns as string)
    const transformedData = data.map((transaction) => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString()),
    }));

    return { data: transformedData, total, page, limit };
  }

  /**
   * Get all transactions with optional filters (admin function).
   *
   * @param filters - Optional filters for transactions
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated list of transactions
   */
  async getAllTransactions(
    filters?: {
      userId?: number;
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.wallet', 'wallet')
      .leftJoinAndSelect('transaction.reservation', 'reservation')
      .leftJoinAndSelect('transaction.stripePayment', 'stripePayment');

    if (filters?.userId) {
      query.andWhere('wallet.userId = :userId', { userId: filters.userId });
    }
    if (filters?.type) {
      query.andWhere('transaction.type = :type', { type: filters.type });
    }
    if (filters?.startDate) {
      query.andWhere('transaction.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters?.endDate) {
      query.andWhere('transaction.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    query
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Grant coins to a user by userId (admin function).
   * Creates a deposit transaction and logs audit trail.
   *
   * @param userId - User ID to grant coins to
   * @param amount - Amount of coins to grant
   * @param description - Optional description for the transaction
   * @param adminId - ID of admin granting coins (for audit logging)
   * @param ipAddress - IP address for audit logging (optional)
   * @returns Updated wallet with new balance
   */
  async grantCoinsToUser(
    userId: number,
    amount: number,
    description?: string,
    adminId?: number,
    ipAddress?: string,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWallet(userId);
    const oldBalance = parseFloat(wallet.balance.toString());

    // Use deposit method which handles transactions
    await this.deposit(wallet.id, amount, description || 'Admin coin grant');

    // Get updated wallet for new balance
    const updatedWallet = await this.getWallet(userId);
    const newBalance = parseFloat(updatedWallet.balance.toString());

    // Audit log
    await this.auditService.log({
      userId: adminId,
      action: 'ADMIN_COINS_GRANTED',
      entityType: 'Wallet',
      entityId: wallet.id.toString(),
      details: {
        grantedToUserId: userId,
        amount,
        description: description || 'Admin coin grant',
        oldBalance,
        newBalance,
      },
      ipAddress,
    });

    this.logger.log(
      `Coins granted: ${amount} to user ID ${userId} by admin ID ${adminId}. Balance: ${oldBalance} -> ${newBalance}`,
    );

    // Invalidate user cache so the updated wallet balance is reflected
    this.cacheService.del(this.cacheService.getUserKey(userId));

    // Return updated wallet
    return updatedWallet;
  }
}
