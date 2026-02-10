import { Module } from '@nestjs/common';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';

/**
 * Downloads Module
 *
 * Module for handling public downloads functionality.
 * Provides a public page for client/app downloads.
 */
@Module({
  controllers: [DownloadsController],
  providers: [DownloadsService],
  exports: [DownloadsService],
})
export class DownloadsModule {}
