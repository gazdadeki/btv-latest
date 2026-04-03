import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';
import { Stream, StreamStatus } from './entities/stream.entity';

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);

  constructor(
    @InjectRepository(Stream)
    private streamRepository: Repository<Stream>,
  ) {}

  async findActiveStream(): Promise<Stream | null> {
    return this.streamRepository.findOne({
      where: { status: Not(StreamStatus.ENDED) },
      relations: ['schedule'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find the stream visible to players: prefer LIVE, fall back to PENDING.
   */
  async findPlayerVisibleStream(): Promise<Stream | null> {
    const live = await this.streamRepository.findOne({
      where: { status: StreamStatus.LIVE },
      relations: ['schedule'],
      order: { createdAt: 'DESC' },
    });
    if (live) return live;
    return this.streamRepository.findOne({
      where: { status: StreamStatus.PENDING },
      relations: ['schedule'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveStreamWithGames(): Promise<Stream | null> {
    return this.streamRepository.findOne({
      where: { status: Not(StreamStatus.ENDED) },
      relations: ['schedule', 'games', 'games.slots'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneOrFail(id: number): Promise<Stream> {
    const stream = await this.streamRepository.findOne({
      where: { id },
      relations: ['schedule'],
    });
    if (!stream) {
      throw new NotFoundException(`Stream #${id} not found`);
    }
    return stream;
  }

  async activateStream(streamId: number): Promise<Stream> {
    const stream = await this.findOneOrFail(streamId);
    if (stream.status !== StreamStatus.PENDING) {
      throw new BadRequestException(
        `Cannot activate stream in ${stream.status} status. Only PENDING streams can be activated.`,
      );
    }
    stream.status = StreamStatus.LIVE;
    return this.streamRepository.save(stream);
  }

  async startStream(
    streamId: number,
    title: string | undefined,
    url: string,
  ): Promise<Stream> {
    const stream = await this.findOneOrFail(streamId);
    if (stream.status !== StreamStatus.PENDING) {
      throw new BadRequestException(
        `Cannot start stream in ${stream.status} status. Only PENDING streams can be started.`,
      );
    }
    const now = new Date();
    const dateStr = `${now.getUTCDate().toString().padStart(2, '0')}.${(now.getUTCMonth() + 1).toString().padStart(2, '0')}.${now.getUTCFullYear()}`;
    stream.title = title?.trim() || `Let's GO - ${dateStr}`;
    stream.url = url;
    stream.status = StreamStatus.LIVE;
    return this.streamRepository.save(stream);
  }

  async setUrl(streamId: number, url: string): Promise<Stream> {
    const stream = await this.findOneOrFail(streamId);
    stream.url = url || null;
    return this.streamRepository.save(stream);
  }

  async endStream(streamId: number): Promise<void> {
    const stream = await this.findOneOrFail(streamId);
    if (stream.status === StreamStatus.ENDED) {
      throw new BadRequestException('Stream is already ended.');
    }
    await this.streamRepository.update(streamId, {
      status: StreamStatus.ENDED,
    });
  }

  async createStreamInTransaction(
    manager: EntityManager,
    scheduleId: number,
  ): Promise<Stream> {
    // Auto-end any existing non-ENDED streams to enforce one-active-stream constraint
    const result = await manager
      .createQueryBuilder()
      .update(Stream)
      .set({ status: StreamStatus.ENDED })
      .where('status != :ended', { ended: StreamStatus.ENDED })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.warn(
        `Auto-ended ${result.affected} stale stream(s) before creating new stream for schedule #${scheduleId}`,
      );
    }

    const now = new Date();
    const dateStr = `${now.getUTCDate().toString().padStart(2, '0')}.${(now.getUTCMonth() + 1).toString().padStart(2, '0')}.${now.getUTCFullYear()}`;
    const stream = manager.create(Stream, {
      scheduleId,
      status: StreamStatus.PENDING,
      title: `Let's GO - ${dateStr}`,
    });
    return manager.save(stream);
  }
}
