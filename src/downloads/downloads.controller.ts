import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { DownloadsService } from './downloads.service';

/**
 * Downloads Controller
 *
 * Public controller for serving the downloads page.
 * Accessible at /downloads (not /api/downloads) without authentication.
 */
@Controller({ path: 'downloads' })
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  /**
   * Serve the downloads page
   *
   * @param res Express response object
   * @returns HTML page for downloads
   */
  @Get()
  getDownloadsPage(@Res() res: Response) {
    const htmlPath = join(process.cwd(), 'public', 'downloads.html');
    return res.sendFile(htmlPath);
  }
}
