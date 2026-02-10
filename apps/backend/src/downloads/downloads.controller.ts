import { Controller, Get } from '@nestjs/common';
import { DownloadsService } from './downloads.service';

/**
 * Downloads Controller
 *
 * Public API controller for download-related data.
 * The downloads page is now served by the public-ui Next.js app.
 */
@Controller({ path: 'downloads', version: '1' })
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  /**
   * Get available downloads
   *
   * @returns Array of available download options
   */
  @Get()
  getAvailableDownloads() {
    return this.downloadsService.getAvailableDownloads();
  }
}
