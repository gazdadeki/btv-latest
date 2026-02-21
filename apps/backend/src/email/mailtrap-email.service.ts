/**
 * Mailtrap email service implementation.
 * Sends transactional emails via SMTP using Nodemailer with Mailtrap configuration.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { IEmailService } from './email.service.interface';
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
  getSubscriptionConfirmedEmailTemplate,
  getSubscriptionCancelledEmailTemplate,
  getPaymentReceiptEmailTemplate,
} from './templates';

/**
 * Email service that uses Mailtrap SMTP for sending transactional emails.
 * Implements the IEmailService interface with Nodemailer transport.
 *
 * Configuration is read from environment variables:
 * - MAILTRAP_HOST: SMTP server host
 * - MAILTRAP_PORT: SMTP server port
 * - MAILTRAP_USER: SMTP username
 * - MAILTRAP_PASS: SMTP password
 * - EMAIL_FROM_NAME: Sender display name
 * - EMAIL_FROM_ADDRESS: Sender email address
 * - FRONTEND_URL: Frontend URL for email links
 */
@Injectable()
export class MailtrapEmailService implements IEmailService, OnModuleInit {
  private readonly logger = new Logger(MailtrapEmailService.name);
  private transporter: Transporter;
  private readonly fromName: string;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor() {
    this.fromName = process.env.EMAIL_FROM_NAME || 'BTV';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@btv.com';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT || '2525', 10),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });

    this.logger.log('Mailtrap email service initialized');
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error(
        `SMTP connection verification failed: ${error.message}. Emails will not be delivered.`,
      );
    }
  }

  /**
   * Sends an email using the configured transporter.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param html - HTML email content
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to,
        subject,
        html,
      });

      this.logger.log(
        `Email sent successfully to: ${to}, messageId: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to: ${to}, error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Sends a verification code to the user's email.
   *
   * @param email - Recipient email address
   * @param code - The verification code
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    this.logger.log(`Sending verification code to: ${email}`);

    const html = getVerificationEmailTemplate(code);

    await this.sendEmail(email, 'Verify Your Email - BTV', html);
  }

  /**
   * Sends a password reset email with a reset token/link.
   *
   * @param email - Recipient email address
   * @param resetToken - The unique reset token
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    this.logger.log(`Sending password reset email to: ${email}`);

    const html = getPasswordResetEmailTemplate(resetToken, this.frontendUrl);

    await this.sendEmail(email, 'Reset Your Password - BTV', html);
  }

  /**
   * Sends a welcome email to newly registered users.
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
    this.logger.log(`Sending welcome email to: ${email}`);

    const html = getWelcomeEmailTemplate(
      username,
      this.frontendUrl,
      verificationCode,
    );

    await this.sendEmail(email, 'Welcome to BTV!', html);
  }

  /**
   * Sends a subscription confirmation email when subscription becomes active.
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
    this.logger.log(
      `Sending subscription confirmed email to: ${email}, tier: ${tier}`,
    );

    const html = getSubscriptionConfirmedEmailTemplate(
      username,
      tier,
      periodEnd,
      this.frontendUrl,
    );

    await this.sendEmail(
      email,
      `Your ${tier} Subscription is Active - BTV`,
      html,
    );
  }

  /**
   * Sends a subscription cancellation confirmation email.
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
    this.logger.log(`Sending subscription cancelled email to: ${email}`);

    const html = getSubscriptionCancelledEmailTemplate(
      username,
      expiresAt,
      this.frontendUrl,
    );

    await this.sendEmail(
      email,
      'Your Subscription Has Been Cancelled - BTV',
      html,
    );
  }

  /**
   * Sends a payment receipt email after successful payment.
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
    this.logger.log(
      `Sending payment receipt email to: ${email}, amount: ${amount} ${currency}`,
    );

    const html = getPaymentReceiptEmailTemplate(
      username,
      amount,
      currency,
      description,
      new Date(),
      this.frontendUrl,
    );

    await this.sendEmail(email, 'Payment Receipt - BTV', html);
  }
}
