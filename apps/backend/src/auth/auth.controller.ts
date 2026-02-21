import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  Request,
  Response,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  private extractIpAddress(req: any): string {
    // Try X-Forwarded-For header first (for proxies/load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = forwardedFor.split(',');
      return ips[0].trim();
    }

    // Try X-Real-IP header (common in nginx)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fall back to req.ip (requires trust proxy to be set)
    if (req.ip) {
      return req.ip;
    }

    // Last resort: connection remote address
    return (
      req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'
    );
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new player' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.log(
      `Registration request received for email: ${registerDto.email} from IP: ${ipAddress}`,
    );

    try {
      const result = await this.authService.register(
        registerDto,
        ipAddress,
        userAgent,
      );

      // Set HTTP-only cookies
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      // Set player-scoped HTTP-only cookies
      res.cookie('player_access_token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes (access token expiry)
      });

      res.cookie('player_refresh_token', result.refreshToken, cookieOptions);

      // Return user data only (no tokens in JSON)
      this.logger.log(
        `Registration request completed successfully for email: ${registerDto.email}`,
      );
      return res.json({
        user: result.user,
      });
    } catch (error) {
      this.logger.error(
        `Registration request failed for email: ${registerDto.email} from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.log(
      `Login request received for email: ${loginDto.email} from IP: ${ipAddress}`,
    );

    try {
      const result = await this.authService.login(
        loginDto,
        ipAddress,
        userAgent,
      );

      // Set HTTP-only cookies
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      // Set player-scoped HTTP-only cookies
      res.cookie('player_access_token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes (access token expiry)
      });

      res.cookie('player_refresh_token', result.refreshToken, cookieOptions);

      // Return user data only (no tokens in JSON)
      this.logger.log(
        `Login request completed successfully for email: ${loginDto.email}`,
      );
      return res.json({
        user: result.user,
      });
    } catch (error) {
      this.logger.error(
        `Login request failed for email: ${loginDto.email} from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('admin/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Admin login — restricted to users with ADMIN role' })
  @ApiResponse({
    status: 200,
    description: 'Admin login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access restricted to administrators',
  })
  async adminLogin(
    @Body() loginDto: LoginDto,
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.log(
      `Admin login request received for email: ${loginDto.email} from IP: ${ipAddress}`,
    );

    try {
      const result = await this.authService.adminLogin(
        loginDto,
        ipAddress,
        userAgent,
      );

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };

      res.cookie('admin_access_token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('admin_refresh_token', result.refreshToken, cookieOptions);

      this.logger.log(
        `Admin login request completed successfully for email: ${loginDto.email}`,
      );
      return res.json({
        user: result.user,
      });
    } catch (error) {
      this.logger.error(
        `Admin login request failed for email: ${loginDto.email} from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Request() req: any, @Response() res: ExpressResponse) {
    const ipAddress = this.extractIpAddress(req);

    // Detect whether this is a player or admin session by which cookie is present
    const isPlayerSession = !!req.cookies?.player_refresh_token;
    const refreshToken =
      req.cookies?.player_refresh_token ||
      req.cookies?.admin_refresh_token ||
      req.body?.refreshToken;
    const tokenPrefix = refreshToken
      ? refreshToken.substring(0, 10) + '...'
      : 'null';

    this.logger.log(
      `Token refresh request received (token prefix: ${tokenPrefix}, session: ${isPlayerSession ? 'player' : 'admin'}) from IP: ${ipAddress}`,
    );

    if (!refreshToken) {
      this.logger.warn(
        `Token refresh request failed: No refresh token provided from IP: ${ipAddress}`,
      );
      return res.status(401).json({ message: 'Refresh token required' });
    }

    try {
      const result = await this.authService.refresh(refreshToken);

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      const accessCookie = isPlayerSession ? 'player_access_token' : 'admin_access_token';
      const refreshCookie = isPlayerSession ? 'player_refresh_token' : 'admin_refresh_token';

      res.cookie(accessCookie, result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes (access token expiry)
      });

      if (result.refreshToken && result.refreshToken !== refreshToken) {
        res.cookie(refreshCookie, result.refreshToken, cookieOptions);
      }

      // Return user data only if available (no tokens in JSON)
      this.logger.log(
        `Token refresh request completed successfully from IP: ${ipAddress}`,
      );
      return res.json({
        user: result.user || undefined,
      });
    } catch (error) {
      this.logger.error(
        `Token refresh request failed (token prefix: ${tokenPrefix}) from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @Request() req: any,
    @Response() res: ExpressResponse,
    @Body() body?: { refreshToken?: string },
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userId = req.user?.id;

    // Get refresh token from either player or admin cookie
    const refreshToken =
      req.cookies?.player_refresh_token ||
      req.cookies?.admin_refresh_token ||
      body?.refreshToken;

    this.logger.log(
      `Logout request received for user ID: ${userId} from IP: ${ipAddress}`,
    );

    try {
      await this.authService.logout(userId, refreshToken);

      // Clear all session cookies (player and admin)
      res.clearCookie('player_access_token', { path: '/' });
      res.clearCookie('player_refresh_token', { path: '/' });
      res.clearCookie('player_user', { path: '/' });
      res.clearCookie('admin_access_token', { path: '/' });
      res.clearCookie('admin_refresh_token', { path: '/' });
      res.clearCookie('admin_user', { path: '/' });

      this.logger.log(
        `Logout request completed successfully for user ID: ${userId}`,
      );
      return res.json({ message: 'Logout successful' });
    } catch (error) {
      this.logger.error(
        `Logout request failed for user ID: ${userId} from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('websocket-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WebSocket authentication token' })
  @ApiResponse({ status: 200, description: 'WebSocket token returned' })
  async getWebSocketToken(@Request() req: any) {
    // Check player cookie first, then admin — both are valid for WebSocket auth.
    const token =
      req.cookies?.player_access_token || req.cookies?.admin_access_token;
    if (!token) {
      throw new UnauthorizedException('No access token found');
    }
    return { token };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if user exists)',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Request() req: any,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.log(
      `Password reset request received for email: ${forgotPasswordDto.email} from IP: ${ipAddress}`,
    );

    try {
      const result = await this.authService.forgotPassword(
        forgotPasswordDto,
        ipAddress,
        userAgent,
      );
      this.logger.log(
        `Password reset request completed for email: ${forgotPasswordDto.email}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Password reset request failed for email: ${forgotPasswordDto.email} from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Request() req: any,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.log(
      `Password reset attempt with token (prefix: ${resetPasswordDto.token.substring(0, 10)}...) from IP: ${ipAddress}`,
    );

    try {
      const result = await this.authService.resetPassword(
        resetPasswordDto,
        ipAddress,
        userAgent,
      );
      this.logger.log(
        `Password reset completed successfully from IP: ${ipAddress}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Password reset failed from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@Request() req: any) {
    const ipAddress = this.extractIpAddress(req);
    const user = req.user;

    this.logger.debug(
      `Get current user request for user ID: ${user.id} from IP: ${ipAddress}`,
    );

    return {
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
    };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @Request() req: any,
    @Body()
    body: {
      fullName?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      country?: string;
      zipcode?: string;
    },
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userId = req.user.id;

    this.logger.log(
      `Profile update request for user ID: ${userId} from IP: ${ipAddress}`,
    );

    try {
      const updatedUser = await this.authService.updateProfile(userId, body);
      this.logger.log(
        `Profile update completed successfully for user ID: ${userId}`,
      );
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        subscriptionTier: updatedUser.subscriptionTier,
        isVerified: updatedUser.isVerified,
        isBanned: updatedUser.isBanned,
        bannedUntil: updatedUser.bannedUntil
          ? updatedUser.bannedUntil.toISOString()
          : null,
        fullName: updatedUser.fullName,
        addressLine1: updatedUser.addressLine1,
        addressLine2: updatedUser.addressLine2,
        city: updatedUser.city,
        state: updatedUser.state,
        country: updatedUser.country,
        zipcode: updatedUser.zipcode,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Profile update failed for user ID: ${userId} from IP: ${ipAddress}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
