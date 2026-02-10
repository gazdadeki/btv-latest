/**
 * Email module providing email service functionality.
 * Dynamically selects email provider based on EMAIL_SERVICE_PROVIDER environment variable.
 *
 * Supported providers:
 * - 'console': Logs emails to console (development)
 * - 'mailtrap': Sends emails via Mailtrap SMTP (staging/production)
 */

import { Module, Logger } from '@nestjs/common';
import { ConsoleEmailService } from './console-email.service';
import { MailtrapEmailService } from './mailtrap-email.service';

const logger = new Logger('EmailModule');

/**
 * Factory function to determine which email service to use based on environment.
 * Defaults to ConsoleEmailService if EMAIL_SERVICE_PROVIDER is not set or is 'console'.
 */
const emailServiceProvider = {
  provide: 'IEmailService',
  useFactory: () => {
    const provider = process.env.EMAIL_SERVICE_PROVIDER || 'console';

    switch (provider.toLowerCase()) {
      case 'mailtrap':
        logger.log('Using MailtrapEmailService for email delivery');
        return new MailtrapEmailService();

      case 'console':
      default:
        logger.log(
          'Using ConsoleEmailService for email logging (development mode)',
        );
        return new ConsoleEmailService();
    }
  },
};

@Module({
  providers: [emailServiceProvider],
  exports: [emailServiceProvider],
})
export class EmailModule {}
