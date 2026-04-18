import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StreamsService } from './streams.service';
import { StartStreamDto } from './dto/start-stream.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SearchPaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Streams')
@ApiBearerAuth()
@Controller({ path: 'admin/streams', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Get()
  @ApiOperation({ summary: 'List streams (newest first, paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of streams' })
  async findAll(@Query() pagination: SearchPaginationDto) {
    return this.streamsService.findAll(
      pagination.page ?? 1,
      pagination.limit ?? 20,
      pagination.search,
    );
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the active stream with its games' })
  @ApiResponse({ status: 200, description: 'Active stream or null' })
  async getActive() {
    return this.streamsService.findActiveStreamWithGames();
  }

  @Put(':id/start')
  @ApiOperation({
    summary: 'Start a stream — set title/URL and activate (PENDING → LIVE)',
  })
  @ApiResponse({ status: 200, description: 'Stream started' })
  @ApiResponse({ status: 400, description: 'Stream is not in PENDING status' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  async start(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartStreamDto,
  ) {
    return this.streamsService.startStream(id, dto.title, dto.url);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate a pending stream (PENDING → LIVE)' })
  @ApiResponse({ status: 200, description: 'Stream activated' })
  @ApiResponse({ status: 400, description: 'Stream is not in PENDING status' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.streamsService.activateStream(id);
  }

  @Put(':id/url')
  @ApiOperation({ summary: 'Set the stream URL' })
  @ApiResponse({ status: 200, description: 'URL updated' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  async setUrl(
    @Param('id', ParseIntPipe) id: number,
    @Body('url') url: string,
  ) {
    return this.streamsService.setUrl(id, url);
  }

  @Put(':id/end')
  @ApiOperation({ summary: 'End a stream (PENDING/LIVE → ENDED)' })
  @ApiResponse({ status: 200, description: 'Stream ended' })
  @ApiResponse({ status: 400, description: 'Stream is already ended' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  async end(@Param('id', ParseIntPipe) id: number) {
    await this.streamsService.endStream(id);
    return { success: true };
  }
}
