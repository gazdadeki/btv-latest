import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlotConfig } from './entities/slot-config.entity';
import { Team } from '../games/entities/slot.entity';

@Injectable()
export class SlotConfigService {
  constructor(
    @InjectRepository(SlotConfig)
    private slotConfigRepository: Repository<SlotConfig>,
  ) {}

  async create(data: Partial<SlotConfig>): Promise<SlotConfig> {
    const slotConfig = this.slotConfigRepository.create(data);
    return this.slotConfigRepository.save(slotConfig);
  }

  async createMany(configs: Partial<SlotConfig>[]): Promise<SlotConfig[]> {
    const slotConfigs = this.slotConfigRepository.create(configs);
    return this.slotConfigRepository.save(slotConfigs);
  }

  async findBySchedule(scheduleId: number): Promise<SlotConfig[]> {
    return this.slotConfigRepository.find({
      where: { scheduleId },
      relations: ['preAssignedUser'],
      order: { slotNumber: 'ASC', team: 'ASC' },
    });
  }

  async update(
    scheduleId: number,
    configs: Partial<SlotConfig>[],
  ): Promise<SlotConfig[]> {
    // Delete existing configs
    await this.slotConfigRepository.delete({ scheduleId });

    // Create new configs
    const newConfigs = configs.map((config) => ({
      ...config,
      scheduleId,
    }));
    return this.createMany(newConfigs);
  }

  async deleteBySchedule(scheduleId: number): Promise<void> {
    await this.slotConfigRepository.delete({ scheduleId });
  }

  async validateSlotConfigs(configs: Partial<SlotConfig>[]): Promise<void> {
    const teamACount = configs.filter((c) => c.team === Team.A).length;
    const teamBCount = configs.filter((c) => c.team === Team.B).length;

    if (teamACount !== teamBCount) {
      throw new BadRequestException('Teams must have equal number of slots');
    }
  }
}
