import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avatar, AvatarTier } from './entities/avatar.entity';
import {
  User,
  UserRole,
  SubscriptionTier,
} from '../users/entities/user.entity';

@Injectable()
export class AvatarsService {
  constructor(
    @InjectRepository(Avatar)
    private avatarsRepository: Repository<Avatar>,
  ) {}

  /**
   * Build the relative public URL for an avatar file.
   * Backend serves /apps/backend/public at prefix `/`, so files live at `/avatars/<filename>`.
   */
  static buildUrl(filename: string): string {
    return `/avatars/${filename}`;
  }

  /**
   * Tiers a user is allowed to select from, given role + subscription.
   * - Admin → ADMIN only
   * - Gold player → FREE + GOLD
   * - Free player → FREE only
   */
  static allowedTiersFor(user: User): AvatarTier[] {
    if (user.role === UserRole.ADMIN) {
      return [AvatarTier.ADMIN];
    }
    if (user.subscriptionTier === SubscriptionTier.GOLD) {
      return [AvatarTier.FREE, AvatarTier.GOLD];
    }
    return [AvatarTier.FREE];
  }

  async listForUser(user: User): Promise<Avatar[]> {
    const tiers = AvatarsService.allowedTiersFor(user);
    return this.avatarsRepository
      .createQueryBuilder('avatar')
      .where('avatar.isActive = :isActive', { isActive: true })
      .andWhere('avatar.tier IN (:...tiers)', { tiers })
      .orderBy('avatar.tier', 'ASC')
      .addOrderBy('avatar.sortOrder', 'ASC')
      .addOrderBy('avatar.id', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Avatar> {
    const avatar = await this.avatarsRepository.findOne({ where: { id } });
    if (!avatar) {
      throw new NotFoundException(`Avatar with ID ${id} not found`);
    }
    return avatar;
  }

  /**
   * Validate that the user's role + subscription permits selecting this avatar.
   * Throws BadRequestException on any mismatch.
   */
  async assertSelectable(user: User, avatarId: number): Promise<Avatar> {
    const avatar = await this.findOne(avatarId);
    if (!avatar.isActive) {
      throw new BadRequestException('Avatar is not available');
    }
    const allowed = AvatarsService.allowedTiersFor(user);
    if (!allowed.includes(avatar.tier)) {
      throw new BadRequestException(
        `Avatar tier ${avatar.tier} is not available for your account`,
      );
    }
    return avatar;
  }
}
