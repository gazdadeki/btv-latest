import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStatistics } from './entities/user-statistics.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(UserStatistics)
    private statisticsRepository: Repository<UserStatistics>,
  ) {}

  async createStatistics(userId: number): Promise<UserStatistics> {
    const statistics = this.statisticsRepository.create({
      userId,
      totalWins: 0,
      totalLosses: 0,
      totalCoinsSpent: 0,
      totalCoinsEarned: 0,
    });
    return this.statisticsRepository.save(statistics);
  }

  async findByUserId(userId: number): Promise<UserStatistics> {
    return this.statisticsRepository.findOne({ where: { userId } });
  }

  async incrementWins(userId: number): Promise<void> {
    await this.statisticsRepository.increment({ userId }, 'totalWins', 1);
  }

  async incrementLosses(userId: number): Promise<void> {
    await this.statisticsRepository.increment({ userId }, 'totalLosses', 1);
  }

  async addCoinsSpent(userId: number, amount: number): Promise<void> {
    await this.statisticsRepository.increment(
      { userId },
      'totalCoinsSpent',
      amount,
    );
  }

  async addCoinsEarned(userId: number, amount: number): Promise<void> {
    await this.statisticsRepository.increment(
      { userId },
      'totalCoinsEarned',
      amount,
    );
  }
}
