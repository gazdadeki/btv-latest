/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { StatisticsService } from '../statistics/statistics.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { VerificationCode } from '../verification/entities/verification-code.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { User, SubscriptionTier } from '../users/entities/user.entity';
import { Inject } from '@nestjs/common';
import { IEmailService } from '../email/email.service.interface';
import * as crypto from 'crypto';
import { ProfanityService } from '../common/profanity/profanity.service';
import { AvatarsService } from '../avatars/avatars.service';

/**
 * Service for handling user authentication and authorization.
 * Manages user registration, login, logout, and JWT token generation/refresh.
 *
 * Features:
 * - User registration with password hashing
 * - Login with credential validation
 * - JWT access and refresh token generation
 * - Token refresh mechanism
 * - Audit logging for all authentication events
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private walletService: WalletService,
    private statisticsService: StatisticsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
    @Inject('IEmailService')
    private emailService: IEmailService,
    private profanityService: ProfanityService,
    private avatarsService: AvatarsService,
  ) {}

  /**
   * Registers a new user account.
   * Creates user, wallet, and statistics records, then generates authentication tokens.
   *
   * @param registerDto - Registration data (email, username, password)
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @returns Authentication tokens and user information
   * @throws ConflictException if user with email or username already exists
   */
  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    this.logger.log(
      `Registration attempt for email: ${registerDto.email}, username: ${registerDto.username} from IP: ${ipAddress || 'unknown'}`,
    );

    const existingUserByEmail = await this.usersService.findByEmail(
      registerDto.email,
    );
    if (existingUserByEmail) {
      this.logger.warn(
        `Registration failed: User already exists with email: ${registerDto.email} from IP: ${ipAddress || 'unknown'}`,
      );
      throw new ConflictException(
        `User with email ${registerDto.email} already exists`,
      );
    }

    const existingUserByUsername = await this.usersService.findByUsername(
      registerDto.username,
    );
    if (existingUserByUsername) {
      this.logger.warn(
        `Registration failed: User already exists with username: ${registerDto.username} from IP: ${ipAddress || 'unknown'}`,
      );
      throw new ConflictException(
        `User with username ${registerDto.username} already exists`,
      );
    }

    if (this.profanityService.isProfane(registerDto.username)) {
      this.logger.warn(
        `Registration failed: Username rejected by profanity filter: ${registerDto.username} from IP: ${ipAddress || 'unknown'}`,
      );
      throw new BadRequestException('Username is not allowed');
    }

    this.logger.debug(
      `Creating new user account for email: ${registerDto.email}, username: ${registerDto.username}`,
    );
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      username: registerDto.username,
      password: hashedPassword,
      subscriptionTier: SubscriptionTier.FREE,
    });

    this.logger.debug(
      `User created with ID: ${user.id}, creating wallet and statistics`,
    );
    await this.walletService.createWallet(user.id);
    await this.statisticsService.createStatistics(user.id);

    await this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id.toString(),
      ipAddress,
      userAgent,
    });

    // Generate verification code for the welcome email
    const verificationCode = await this.generateUniqueVerificationCode();
    const expiryMinutes = this.configService.getVerificationCodeExpiryMinutes();
    const expiresAt = new Date();
    expiresAt.setUTCMinutes(expiresAt.getUTCMinutes() + expiryMinutes);

    await this.verificationCodeRepository.save({
      userId: user.id,
      code: verificationCode,
      expiresAt,
      isUsed: false,
    });

    this.logger.debug(
      `Verification code generated for user ID: ${user.id}, expires at: ${expiresAt.toISOString()}`,
    );

    // Send welcome email with verification code (non-blocking)
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.username,
        verificationCode,
      );
      this.logger.log(
        `Welcome email with verification code sent to: ${user.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to: ${user.email}, error: ${error.message}`,
      );
    }

    this.logger.debug(`Generating tokens for user ID: ${user.id}`);
    const tokens = await this.generateTokens(user);

    this.logger.log(
      `Registration successful for user ID: ${user.id}, email: ${user.email} from IP: ${ipAddress || 'unknown'}`,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        bannedUntil: user.bannedUntil ? user.bannedUntil.toISOString() : null,
        fullName: user.fullName,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        state: user.state,
        country: user.country,
        zipcode: user.zipcode,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Authenticates a user and generates access/refresh tokens.
   * Validates credentials and logs authentication attempts (successful and failed).
   *
   * @param loginDto - Login credentials (email or username, password)
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @returns Authentication tokens and user information
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    this.logger.log(
      `Login attempt for identifier: ${loginDto.email} from IP: ${ipAddress || 'unknown'}, User-Agent: ${userAgent || 'unknown'}`,
    );

    const user = await this.usersService.findByEmailOrUsername(loginDto.email);
    if (!user) {
      this.logger.warn(
        `Login failed: User not found with email or username: ${loginDto.email} from IP: ${ipAddress || 'unknown'}`,
      );
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        details: {
          identifier: loginDto.email,
          reason: 'User not found',
        },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.debug(`User found with ID: ${user.id}, validating password`);
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      this.logger.warn(
        `Login failed: Invalid password for user ID: ${user.id}, email: ${user.email}, username: ${user.username || 'N/A'} from IP: ${ipAddress || 'unknown'}`,
      );
      await this.auditService.log({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id.toString(),
        details: { reason: 'Invalid password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.debug(
      `Password validated successfully for user ID: ${user.id}, generating tokens`,
    );
    await this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id.toString(),
      details: { role: user.role },
      ipAddress,
      userAgent,
    });

    // Send verification code if user is not yet verified
    if (!user.isVerified) {
      try {
        const verificationCode = await this.generateUniqueVerificationCode();
        const expiryMinutes =
          this.configService.getVerificationCodeExpiryMinutes();
        const expiresAt = new Date();
        expiresAt.setUTCMinutes(expiresAt.getUTCMinutes() + expiryMinutes);

        await this.verificationCodeRepository.save({
          userId: user.id,
          code: verificationCode,
          expiresAt,
          isUsed: false,
        });

        await this.emailService.sendVerificationCode(
          user.email,
          verificationCode,
        );
        this.logger.log(
          `Verification code sent on login to unverified user ID: ${user.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send verification code on login to: ${user.email}, error: ${error.message}`,
        );
      }
    }

    const tokens = await this.generateTokens(user);
    this.logger.log(
      `Login successful for user ID: ${user.id}, email: ${user.email} from IP: ${ipAddress || 'unknown'}`,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        bannedUntil: user.bannedUntil ? user.bannedUntil.toISOString() : null,
        fullName: user.fullName,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        state: user.state,
        country: user.country,
        zipcode: user.zipcode,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Refreshes an access token using a valid refresh token.
   * Only generates a new access token, reusing the refresh token unless it's close to expiring.
   *
   * @param refreshToken - The refresh token string
   * @returns New access token and optionally a new refresh token (only if old one is expiring soon)
   * @throws UnauthorizedException if refresh token is invalid or expired
   */
  async refresh(refreshToken: string): Promise<any> {
    const tokenPrefix = refreshToken
      ? refreshToken.substring(0, 10) + '...'
      : 'null';
    this.logger.debug(
      `Token refresh attempt with token prefix: ${tokenPrefix}`,
    );

    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!token) {
      this.logger.warn(
        `Token refresh failed: Refresh token not found (prefix: ${tokenPrefix})`,
      );
      throw new UnauthorizedException(
        'Refresh token not found or has been revoked',
      );
    }

    if (token.expiresAt < new Date()) {
      this.logger.warn(
        `Token refresh failed: Refresh token expired for token ID: ${token.id}, user ID: ${token.userId}, expired at: ${token.expiresAt.toISOString()}`,
      );
      throw new UnauthorizedException(
        `Refresh token expired at ${token.expiresAt.toISOString()}`,
      );
    }

    this.logger.debug(
      `Refresh token validated for token ID: ${token.id}, user ID: ${token.userId}`,
    );

    // Check if refresh token is close to expiring (less than 1 day remaining)
    const oneDayFromNow = new Date();
    oneDayFromNow.setUTCDate(oneDayFromNow.getUTCDate() + 1);
    const shouldRegenerateRefreshToken = token.expiresAt < oneDayFromNow;

    if (shouldRegenerateRefreshToken) {
      this.logger.debug(
        `Refresh token expires soon (${token.expiresAt.toISOString()}), regenerating refresh token`,
      );
      // Revoke old refresh token and generate new tokens
      token.isRevoked = true;
      token.revokedAt = new Date();
      await this.refreshTokenRepository.save(token);

      const newTokens = await this.generateTokens(token.user);
      this.logger.log(
        `Token refresh successful (with new refresh token) for user ID: ${token.userId}, old token ID: ${token.id}`,
      );
      return {
        ...newTokens,
        user: {
          id: token.user.id,
          email: token.user.email,
          username: token.user.username,
          role: token.user.role,
          subscriptionTier: token.user.subscriptionTier,
          isVerified: token.user.isVerified,
          isBanned: token.user.isBanned,
          bannedUntil: token.user.bannedUntil
            ? token.user.bannedUntil.toISOString()
            : null,
          fullName: token.user.fullName,
          addressLine1: token.user.addressLine1,
          addressLine2: token.user.addressLine2,
          city: token.user.city,
          state: token.user.state,
          country: token.user.country,
          zipcode: token.user.zipcode,
          createdAt: token.user.createdAt.toISOString(),
          updatedAt: token.user.updatedAt.toISOString(),
        },
      };
    } else {
      // Only generate new access token, reuse refresh token
      this.logger.debug(
        `Refresh token still valid, generating only access token for user ID: ${token.userId}`,
      );
      const accessToken = await this.generateAccessToken(token.user);

      this.logger.log(
        `Token refresh successful (reusing refresh token) for user ID: ${token.userId}, refresh token ID: ${token.id}`,
      );
      return {
        accessToken,
        refreshToken: refreshToken, // Return the same refresh token
        user: {
          id: token.user.id,
          email: token.user.email,
          username: token.user.username,
          role: token.user.role,
          subscriptionTier: token.user.subscriptionTier,
          isVerified: token.user.isVerified,
          isBanned: token.user.isBanned,
          bannedUntil: token.user.bannedUntil
            ? token.user.bannedUntil.toISOString()
            : null,
          fullName: token.user.fullName,
          addressLine1: token.user.addressLine1,
          addressLine2: token.user.addressLine2,
          city: token.user.city,
          state: token.user.state,
          country: token.user.country,
          zipcode: token.user.zipcode,
          createdAt: token.user.createdAt.toISOString(),
          updatedAt: token.user.updatedAt.toISOString(),
        },
      };
    }
  }

  /**
   * Logs out a user by revoking refresh tokens.
   * If a specific refresh token is provided, only that token is revoked.
   * Otherwise, all active refresh tokens for the user are revoked.
   *
   * @param userId - The user ID to logout
   * @param refreshToken - Optional specific refresh token to revoke
   */
  async logout(userId: number, refreshToken?: string): Promise<void> {
    this.logger.log(
      `Logout request for user ID: ${userId}${refreshToken ? ' with specific refresh token' : ' (all tokens)'}`,
    );

    if (refreshToken) {
      const tokenPrefix = refreshToken.substring(0, 10) + '...';
      this.logger.debug(
        `Revoking specific refresh token (prefix: ${tokenPrefix}) for user ID: ${userId}`,
      );
      const token = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, userId },
      });
      if (token) {
        token.isRevoked = true;
        token.revokedAt = new Date();
        await this.refreshTokenRepository.save(token);
        this.logger.debug(
          `Refresh token revoked successfully, token ID: ${token.id}`,
        );
      } else {
        this.logger.warn(
          `Refresh token not found for user ID: ${userId} (prefix: ${tokenPrefix})`,
        );
      }
    } else {
      this.logger.debug(`Revoking all refresh tokens for user ID: ${userId}`);
      const result = await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() },
      );
      this.logger.debug(
        `Revoked ${result.affected || 0} refresh tokens for user ID: ${userId}`,
      );
    }

    await this.auditService.log({
      userId,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: userId.toString(),
    });

    this.logger.log(`Logout completed for user ID: ${userId}`);
  }

  /**
   * Generates only an access token for a user.
   * Used when refreshing tokens without regenerating the refresh token.
   *
   * @param user - The user entity to generate access token for
   * @returns Access token string
   * @private
   */
  private async generateAccessToken(user: User): Promise<string> {
    this.logger.debug(
      `Generating access token for user ID: ${user.id}, email: ${user.email}, role: ${user.role}`,
    );

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessTokenExpiry = this.configService.getJwtAccessTokenExpiry();

    this.logger.debug(
      `Access token expiry configuration: ${accessTokenExpiry}`,
    );

    // Sign access token with configured expiry
    // @ts-ignore
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry as string,
    });

    const accessTokenPrefix = accessToken.substring(0, 10) + '...';
    this.logger.debug(`Access token generated - prefix: ${accessTokenPrefix}`);

    return accessToken;
  }

  /**
   * Generates JWT access and refresh tokens for a user.
   * Access token expires quickly (default 15m), refresh token lasts longer (default 7d).
   * Refresh token is stored in database for revocation capability.
   *
   * @param user - The user entity to generate tokens for
   * @returns Object containing accessToken and refreshToken strings
   * @private
   */
  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.debug(
      `Generating tokens for user ID: ${user.id}, email: ${user.email}, role: ${user.role}`,
    );

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessTokenExpiry = this.configService.getJwtAccessTokenExpiry();
    const refreshTokenExpiry = this.configService.getJwtRefreshTokenExpiry();

    this.logger.debug(
      `Token expiry configuration - Access: ${accessTokenExpiry}, Refresh: ${refreshTokenExpiry}`,
    );

    // Sign access token with configured expiry
    // @ts-ignore
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry as string,
    });

    // Sign refresh token with configured expiry
    // @ts-ignore
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTokenExpiry as string,
    });

    const accessTokenPrefix = accessToken.substring(0, 10) + '...';
    const refreshTokenPrefix = refreshToken.substring(0, 10) + '...';
    this.logger.debug(
      `Tokens generated - Access token prefix: ${accessTokenPrefix}, Refresh token prefix: ${refreshTokenPrefix}`,
    );

    // Calculate expiration date for refresh token storage
    const expiresAt = new Date();
    const refreshTokenDays = parseInt(refreshTokenExpiry.replace('d', '')) || 7;
    expiresAt.setUTCDate(expiresAt.getUTCDate() + refreshTokenDays);

    this.logger.debug(
      `Storing refresh token in database, expires at: ${expiresAt.toISOString()}`,
    );
    // Store refresh token in database for revocation tracking
    const savedToken = await this.refreshTokenRepository.save({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      isRevoked: false,
    });

    this.logger.debug(
      `Refresh token stored successfully, token ID: ${savedToken.id}`,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Requests a password reset for a user by email.
   * Generates a secure reset token, stores it in the database, and sends it via email.
   *
   * @param forgotPasswordDto - DTO containing the user's email
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @returns Success message (always returns success to prevent email enumeration)
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Password reset request for email: ${forgotPasswordDto.email} from IP: ${ipAddress || 'unknown'}`,
    );

    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    // Always return success to prevent email enumeration attacks
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${forgotPasswordDto.email} from IP: ${ipAddress || 'unknown'}`,
      );
      await this.auditService.log({
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        details: {
          email: forgotPasswordDto.email,
          reason: 'User not found',
        },
        ipAddress,
        userAgent,
      });
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Revoke any existing unused reset tokens for this user
    await this.passwordResetTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true, usedAt: new Date() },
    );

    // Generate secure reset token
    const resetToken = this.generateResetToken();
    const expiresAt = new Date();
    expiresAt.setUTCHours(expiresAt.getUTCHours() + 1); // Token expires in 1 hour

    // Store reset token in database
    await this.passwordResetTokenRepository.save({
      userId: user.id,
      token: resetToken,
      expiresAt,
      isUsed: false,
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      this.logger.log(
        `Password reset email sent to: ${user.email} for user ID: ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to: ${user.email}, error: ${error.message}`,
      );
      // Continue even if email fails - token is still valid
    }

    await this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id.toString(),
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Password reset token generated for user ID: ${user.id}, email: ${user.email}`,
    );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Resets a user's password using a valid reset token.
   * Validates the token, checks expiration, and updates the password.
   *
   * @param resetPasswordDto - DTO containing the reset token and new password
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @returns Success message
   * @throws UnauthorizedException if token is invalid, expired, or already used
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Password reset attempt with token (prefix: ${resetPasswordDto.token.substring(0, 10)}...) from IP: ${ipAddress || 'unknown'}`,
    );

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token: resetPasswordDto.token, isUsed: false },
      relations: ['user'],
    });

    if (!resetToken) {
      this.logger.warn(
        `Password reset failed: Invalid or already used token (prefix: ${resetPasswordDto.token.substring(0, 10)}...) from IP: ${ipAddress || 'unknown'}`,
      );
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      this.logger.warn(
        `Password reset failed: Token expired for token ID: ${resetToken.id}, user ID: ${resetToken.userId}, expired at: ${resetToken.expiresAt.toISOString()}`,
      );
      // Mark token as used even though it expired
      resetToken.isUsed = true;
      resetToken.usedAt = new Date();
      await this.passwordResetTokenRepository.save(resetToken);
      throw new UnauthorizedException('Reset token has expired');
    }

    this.logger.debug(
      `Reset token validated for token ID: ${resetToken.id}, user ID: ${resetToken.userId}`,
    );

    // Update user password (usersService.update handles password hashing)
    await this.usersService.update(resetToken.userId, {
      password: resetPasswordDto.password,
    });

    // Mark token as used
    resetToken.isUsed = true;
    resetToken.usedAt = new Date();
    await this.passwordResetTokenRepository.save(resetToken);

    // Revoke all refresh tokens for security
    await this.refreshTokenRepository.update(
      { userId: resetToken.userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    await this.auditService.log({
      userId: resetToken.userId,
      userEmail: resetToken.user.email,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: resetToken.userId.toString(),
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Password reset successful for user ID: ${resetToken.userId}, email: ${resetToken.user.email}`,
    );

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Updates the current user's profile information.
   * Allows users to update their personal information (name, address, etc.).
   *
   * @param userId - The ID of the user to update
   * @param data - Profile data to update (fullName, address fields, etc.)
   * @returns Updated user entity
   * @throws NotFoundException if user is not found
   */
  async updateProfile(userId: number, data: UpdateProfileDto): Promise<User> {
    this.logger.log(`Updating profile for user ID: ${userId}`);

    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (data.fullName && this.profanityService.isProfane(data.fullName)) {
      this.logger.warn(
        `Profile update rejected: Display name rejected by profanity filter for user ID: ${userId}`,
      );
      throw new BadRequestException('Display name is not allowed');
    }

    const updatedUser = await this.usersService.update(userId, data);

    await this.auditService.log({
      userId,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: typeof userId === 'number' ? userId.toString() : userId,
      details: {
        updatedFields: Object.keys(data),
      },
    });

    this.logger.log(`Profile updated successfully for user ID: ${userId}`);
    return updatedUser;
  }

  /**
   * Updates the current user's avatar selection. Validates tier eligibility
   * (free → FREE avatars only, gold → FREE+GOLD, admin → ADMIN) before saving.
   */
  async updateMyAvatar(userId: number, avatarId: number): Promise<User> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.avatarsService.assertSelectable(user, avatarId);

    const updatedUser = await this.usersService.updateAvatar(userId, avatarId);

    await this.auditService.log({
      userId,
      action: 'AVATAR_SELECTED',
      entityType: 'User',
      entityId: userId.toString(),
      details: { avatarId },
    });

    this.logger.log(
      `Avatar updated for user ID: ${userId}, avatarId: ${avatarId}`,
    );
    return updatedUser;
  }

  /**
   * Generates a secure random token for password reset.
   * Uses crypto.randomBytes for cryptographically secure random generation.
   *
   * @returns Secure random token string (hex encoded, 64 characters)
   * @private
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generates a unique 6-digit verification code.
   * Checks database to ensure uniqueness before returning.
   *
   * @returns Unique 6-digit verification code string
   * @private
   */
  private async generateUniqueVerificationCode(): Promise<string> {
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
}
