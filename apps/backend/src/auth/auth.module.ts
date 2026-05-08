import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { VerificationCode } from '../verification/entities/verification-code.entity';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { ConfigModule } from '../config/config.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { ProfanityModule } from '../common/profanity/profanity.module';
import { AvatarsModule } from '../avatars/avatars.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        // @ts-expect-error env var allows human-readable duration strings
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY!,
      },
    }),
    TypeOrmModule.forFeature([
      RefreshToken,
      PasswordResetToken,
      VerificationCode,
    ]),
    UsersModule,
    WalletModule,
    StatisticsModule,
    ConfigModule,
    AuditModule,
    EmailModule,
    ProfanityModule,
    AvatarsModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  onModuleInit() {
    const jwtAccessExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRY!;
    const jwtRefreshExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRY!;

    this.logger.log(`JWT Configuration:`);
    this.logger.log(`  - Access Token Expiry: ${jwtAccessExpiry}`);
    this.logger.log(`  - Refresh Token Expiry: ${jwtRefreshExpiry}`);
    this.logger.log(`  - Secret: ***configured***`);
  }
}
