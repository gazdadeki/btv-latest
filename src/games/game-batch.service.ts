import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';

@Injectable()
export class GameBatchService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  async getTotalGamesInBatch(
    generationBatchId: string | null,
  ): Promise<number> {
    if (!generationBatchId) {
      return 1;
    }
    return this.gameRepository.count({
      where: { generationBatchId },
    });
  }

  async getNextGameInBatch(game: Game): Promise<Game | null> {
    if (!game.generationBatchId || !game.gameIndex) {
      return null;
    }

    return this.gameRepository.findOne({
      where: {
        generationBatchId: game.generationBatchId,
        gameIndex: game.gameIndex + 1,
        status: GameStatus.CREATED,
      },
    });
  }
}
