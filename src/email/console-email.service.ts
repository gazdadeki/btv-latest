/**
 * Console email service implementation.
 * Logs emails to console instead of sending them - useful for development and testing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IEmailService } from './email.service.interface';
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
  getSubscriptionConfirmedEmailTemplate,
  getSubscriptionCancelledEmailTemplate,
  getPaymentReceiptEmailTemplate,
  formatDate,
  formatCurrency,
} from './templates';

/**
 * Development email service that logs emails to the console.
 * Implements all IEmailService methods for local testing without sending actual emails.
 * Uses the same templates as the production service to preview email content.
 */
@Injectable()
export class ConsoleEmailService implements IEmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);
  private readonly frontendUrl: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.logger.log('Console email service initialized (development mode)');
  }

  /**
   * Logs email details to the console.
   *
   * @param type - Type of email being sent
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param details - Additional details to log
   */
  private logEmail(
    type: string,
    to: string,
    subject: string,
    details: Record<string, unknown>,
  ): void {
    console.log('\n');
    console.log(
      '╔══════════════════════════════════════════════════════════════╗',
    );
    console.log(
      '║                    📧 EMAIL SERVICE (Console)                ║',
    );
    console.log(
      '╠══════════════════════════════════════════════════════════════╣',
    );
    console.log(`║ Type:    ${type.padEnd(52)}║`);
    console.log(`║ To:      ${to.padEnd(52)}║`);
    console.log(`║ Subject: ${subject.substring(0, 52).padEnd(52)}║`);
    console.log(
      '╠══════════════════════════════════════════════════════════════╣',
    );
    Object.entries(details).forEach(([key, value]) => {
      const displayValue = String(value).substring(0, 48);
      console.log(`║ ${key.padEnd(10)}: ${displayValue.padEnd(48)}║`);
    });
    console.log(
      '╚══════════════════════════════════════════════════════════════╝',
    );
    console.log('\n');
  }

  /**
   * Sends a verification code to the user's email (logged to console).
   *
   * @param email - Recipient email address
   * @param code - The verification code
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    this.logEmail('VERIFICATION_CODE', email, 'Verify Your Email - BTV', {
      Code: code,
      ExpiresIn: '15 minutes',
    });

    this.logger.debug(
      `Verification code email template generated for: ${email}`,
    );
    getVerificationEmailTemplate(code);
  }

  /**
   * Sends a password reset email with a reset token/link (logged to console).
   *
   * @param email - Recipient email address
   * @param resetToken - The unique reset token
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    this.logEmail('PASSWORD_RESET', email, 'Reset Your Password - BTV', {
      Token: resetToken.substring(0, 20) + '...',
      Link: resetLink.substring(0, 48),
      ExpiresIn: '1 hour',
    });

    this.logger.debug(`Password reset email template generated for: ${email}`);
    getPasswordResetEmailTemplate(resetToken, this.frontendUrl);
  }

  /**
   * Sends a welcome email to newly registered users (logged to console).
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param verificationCode - The verification code for email verification
   */
  async sendWelcomeEmail(
    email: string,
    username: string,
    verificationCode: string,
  ): Promise<void> {
    this.logEmail('WELCOME', email, 'Welcome to BTV!', {
      Username: username,
      Code: verificationCode,
      ExpiresIn: '15 minutes',
      AppUrl: this.frontendUrl,
    });

    this.logger.debug(`Welcome email template generated for: ${email}`);
    getWelcomeEmailTemplate(username, this.frontendUrl, verificationCode);
  }

  /**
   * Sends a subscription confirmation email (logged to console).
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param tier - The subscription tier
   * @param periodEnd - The end date of the current billing period
   */
  async sendSubscriptionConfirmedEmail(
    email: string,
    username: string,
    tier: string,
    periodEnd: Date,
  ): Promise<void> {
    this.logEmail(
      'SUBSCRIPTION_CONFIRMED',
      email,
      `Your ${tier} Subscription is Active`,
      {
        Username: username,
        Tier: tier,
        PeriodEnd: formatDate(periodEnd),
      },
    );

    this.logger.debug(
      `Subscription confirmed email template generated for: ${email}`,
    );
    getSubscriptionConfirmedEmailTemplate(
      username,
      tier,
      periodEnd,
      this.frontendUrl,
    );
  }

  /**
   * Sends a subscription cancellation confirmation email (logged to console).
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param expiresAt - The date when the subscription access will end
   */
  async sendSubscriptionCancelledEmail(
    email: string,
    username: string,
    expiresAt: Date,
  ): Promise<void> {
    this.logEmail(
      'SUBSCRIPTION_CANCELLED',
      email,
      'Your Subscription Has Been Cancelled',
      {
        Username: username,
        ExpiresAt: formatDate(expiresAt),
      },
    );

    this.logger.debug(
      `Subscription cancelled email template generated for: ${email}`,
    );
    getSubscriptionCancelledEmailTemplate(
      username,
      expiresAt,
      this.frontendUrl,
    );
  }

  /**
   * Sends a payment receipt email (logged to console).
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param amount - The payment amount in smallest currency unit
   * @param currency - The currency code
   * @param description - Description of the payment
   */
  async sendPaymentReceiptEmail(
    email: string,
    username: string,
    amount: number,
    currency: string,
    description: string,
  ): Promise<void> {
    this.logEmail('PAYMENT_RECEIPT', email, 'Payment Receipt - BTV', {
      Username: username,
      Amount: formatCurrency(amount, currency),
      Currency: currency.toUpperCase(),
      Desc: description,
    });

    this.logger.debug(`Payment receipt email template generated for: ${email}`);
    getPaymentReceiptEmailTemplate(
      username,
      amount,
      currency,
      description,
      new Date(),
      this.frontendUrl,
    );
  }
}
