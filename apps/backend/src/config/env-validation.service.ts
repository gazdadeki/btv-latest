import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for validating environment variables at application startup.
 * Ensures all required environment variables are present and non-empty.
 * Aborts application startup if validation fails.
 */
export class EnvValidationService {
  private readonly logger = new Logger(EnvValidationService.name);

  /**
   * List of required environment variables.
   * These must be present and non-empty for the application to start.
   */
  private readonly requiredEnvVars: string[] = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'JWT_SECRET',
    'JWT_ACCESS_TOKEN_EXPIRY',
    'JWT_REFRESH_TOKEN_EXPIRY',
    'PORT',
    'NODE_ENV',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  /**
   * Validates that the .env file exists and all required environment variables are present.
   * Throws an error and aborts startup if validation fails.
   *
   * @throws Error if .env file is missing or required environment variables are missing/empty
   */
  validate(): void {
    this.logger.log('Validating environment variables...');

    // Check if .env file exists
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      const errorMessage = `.env file not found at ${envPath}. Please create a .env file based on env.example.`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('.env file found');

    // Validate required environment variables
    const missingVars: string[] = [];
    const emptyVars: string[] = [];

    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar];

      if (value === undefined) {
        missingVars.push(envVar);
      } else if (value.trim() === '') {
        emptyVars.push(envVar);
      }
    }

    // Report validation errors
    if (missingVars.length > 0 || emptyVars.length > 0) {
      let errorMessage = 'Environment variable validation failed:\n';

      if (missingVars.length > 0) {
        errorMessage += `\nMissing required environment variables:\n${missingVars.map((v) => `  - ${v}`).join('\n')}`;
      }

      if (emptyVars.length > 0) {
        errorMessage += `\n\nEmpty required environment variables:\n${emptyVars.map((v) => `  - ${v}`).join('\n')}`;
      }

      errorMessage +=
        '\n\nPlease ensure all required environment variables are set in your .env file.';
      errorMessage += '\nSee env.example for reference.';

      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Log actual values for debugging (mask sensitive values)
    this.logger.log('All required environment variables are present and valid');
    this.logger.debug(`DB_HOST: ${process.env.DB_HOST}`);
    this.logger.debug(`DB_PORT: ${process.env.DB_PORT}`);
    this.logger.debug(
      `DB_USERNAME: ${process.env.DB_USERNAME ? '***' : 'MISSING'}`,
    );
    this.logger.debug(`DB_DATABASE: ${process.env.DB_DATABASE}`);

    // Validate specific format requirements
    this.validateFormats();
  }

  /**
   * Validates format requirements for specific environment variables.
   * Throws an error if validation fails.
   *
   * @private
   */
  private validateFormats(): void {
    // Validate DB_PORT is a valid number
    const dbPort = process.env.DB_PORT;
    if (
      dbPort &&
      (isNaN(parseInt(dbPort, 10)) ||
        parseInt(dbPort, 10) < 1 ||
        parseInt(dbPort, 10) > 65535)
    ) {
      throw new Error(
        `DB_PORT must be a valid port number (1-65535), got: ${dbPort}`,
      );
    }

    // Validate PORT is a valid number
    const port = process.env.PORT;
    if (
      port &&
      (isNaN(parseInt(port, 10)) ||
        parseInt(port, 10) < 1 ||
        parseInt(port, 10) > 65535)
    ) {
      throw new Error(
        `PORT must be a valid port number (1-65535), got: ${port}`,
      );
    }

    // Validate NODE_ENV is a valid value
    const nodeEnv = process.env.NODE_ENV;
    const validNodeEnvs = ['development', 'production', 'test'];
    if (nodeEnv && !validNodeEnvs.includes(nodeEnv)) {
      this.logger.warn(
        `NODE_ENV should be one of: ${validNodeEnvs.join(', ')}, got: ${nodeEnv}`,
      );
    }

    // Validate JWT_SECRET is not a default value
    const jwtSecret = process.env.JWT_SECRET;
    if (
      jwtSecret === 'lorem1' ||
      jwtSecret === 'your-secret-key-change-in-production'
    ) {
      throw new Error(
        'JWT_SECRET must be changed from the default value. Please set a secure secret key.',
      );
    }
  }
}
