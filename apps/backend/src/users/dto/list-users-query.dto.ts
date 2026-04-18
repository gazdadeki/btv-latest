import { IsOptional, IsEnum, IsBooleanString } from 'class-validator';
import { SearchPaginationDto } from '../../common/dto/pagination.dto';
import { UserRole, SubscriptionTier } from '../entities/user.entity';

export class ListUsersQueryDto extends SearchPaginationDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBooleanString()
  isVerified?: string;

  @IsOptional()
  @IsBooleanString()
  isBanned?: string;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;
}
