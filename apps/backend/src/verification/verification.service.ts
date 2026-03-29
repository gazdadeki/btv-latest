import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { VerificationCode } from './entities/verification-code.entity';
import { UsersService } from '../users/users.service';
import { ConfigService } from '../config/config.service';
import { IEmailService } from '../email/email.service.interface';
import { Inject } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
    private usersService: UsersService,
    private configService: ConfigService,
    @Inject('IEmailService')
    private emailService: IEmailService,
    private auditService: AuditService,
  ) {}

  async generateUniqueCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const exists = await this.verificationCodeRepository.findOne({
        where: { code },
      });

      if (!exists) {
        return code;
      }
      attempts++;
    }

    throw new Error('Failed to generate unique verification code');
  }

  /**
   * Requests a new verification code for a user.
   * Implements rate limiting to prevent spam/abuse.
   *
   * @param userId - The user ID requesting verification
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @returns Object with success status and cooldown info
   * @throws BadRequestException if user is already verified
   * @throws HttpException with 429 status if rate limited
   */
  async requestVerification(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }

    // Check for rate limiting - find the most recent verification code
    const cooldownSeconds =
      this.configService.getVerificationCodeCooldownSeconds();
    const cooldownThreshold = new Date();
    cooldownThreshold.setSeconds(
      cooldownThreshold.getSeconds() - cooldownSeconds,
    );

    const recentCode = await this.verificationCodeRepository.findOne({
      where: {
        userId,
        createdAt: MoreThan(cooldownThreshold),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (recentCode) {
      const timeSinceLastCode = Math.floor(
        (Date.now() - recentCode.createdAt.getTime()) / 1000,
      );
      const remainingCooldown = cooldownSeconds - timeSinceLastCode;

      this.logger.warn(
        `Rate limit hit for user ID: ${userId}. Last code sent ${timeSinceLastCode}s ago. Cooldown remaining: ${remainingCooldown}s`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Please wait ${remainingCooldown} seconds before requesting a new code`,
          error: 'Too Many Requests',
          remainingCooldown,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = await this.generateUniqueCode();
    const expiryMinutes = this.configService.getVerificationCodeExpiryMinutes();
    const expiresAt = new Date();
    expiresAt.setUTCMinutes(expiresAt.getUTCMinutes() + expiryMinutes);

    await this.verificationCodeRepository.save({
      userId,
      code,
      expiresAt,
      isUsed: false,
    });

    await this.emailService.sendVerificationCode(user.email, code);

    this.logger.log(`Verification code sent to user ID: ${userId}`);

    await this.auditService.log({
      userId,
      userEmail: user.email,
      action: 'VERIFICATION_CODE_REQUESTED',
      entityType: 'User',
      entityId: userId.toString(),
      ipAddress,
      userAgent,
    });

    return { message: 'Verification code sent successfully' };
  }

  async verify(
    userId: number,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: { userId, code, isUsed: false },
    });

    if (!verificationCode) {
      await this.auditService.log({
        userId,
        action: 'VERIFICATION_FAILED',
        entityType: 'User',
        entityId: userId.toString(),
        details: { reason: 'Invalid code' },
        ipAddress,
        userAgent,
      });
      throw new BadRequestException('Invalid verification code');
    }

    if (verificationCode.expiresAt < new Date()) {
      await this.auditService.log({
        userId,
        action: 'VERIFICATION_FAILED',
        entityType: 'User',
        entityId: userId.toString(),
        details: { reason: 'Code expired' },
        ipAddress,
        userAgent,
      });
      throw new BadRequestException('Verification code has expired');
    }

    verificationCode.isUsed = true;
    verificationCode.usedAt = new Date();
    await this.verificationCodeRepository.save(verificationCode);

    await this.usersService.update(userId, { isVerified: true });

    await this.auditService.log({
      userId,
      action: 'USER_VERIFIED',
      entityType: 'User',
      entityId: userId.toString(),
      ipAddress,
      userAgent,
    });
  }

  async adminVerify(userId: number, adminId: number): Promise<void> {
    await this.usersService.update(userId, { isVerified: true });

    await this.auditService.log({
      userId: adminId,
      action: 'ADMIN_USER_VERIFIED',
      entityType: 'User',
      entityId: userId.toString(),
      details: { verifiedUserId: userId },
    });
  }

  /**
   * Get the latest unused, non-expired verification code for a user.
   * Used by admins to display verification codes in the dashboard.
   *
   * @param userId - User ID to get verification code for
   * @returns Verification code entity if found, null otherwise
   */
  async getLatestCode(userId: number): Promise<VerificationCode | null> {
    const code = await this.verificationCodeRepository.findOne({
      where: {
        userId,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!code) {
      return null;
    }

    // Check if code is expired
    if (code.expiresAt < new Date()) {
      return null;
    }

    return code;
  }
}
