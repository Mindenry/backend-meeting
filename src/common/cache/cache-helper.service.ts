import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheHelperService {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Invalidate dashboard cache for a user
   */
  async invalidateUserDashboard(userId: string): Promise<void> {
    await this.cacheService.del(`dashboard:${userId}`);
  }

  /**
   * Invalidate dashboard cache for all users in a team
   */
  async invalidateTeamDashboards(teamId: string): Promise<void> {
    // This would require getting all team members
    // For now, we'll use a pattern-based approach if Redis is available
    // Otherwise, cache will expire naturally
    try {
      await this.cacheService.invalidatePattern(`dashboard:*`);
    } catch (err) {
      // Pattern invalidation not supported, cache will expire naturally
    }
  }

  /**
   * Invalidate all dashboard caches
   */
  async invalidateAllDashboards(): Promise<void> {
    try {
      await this.cacheService.invalidatePattern(`dashboard:*`);
    } catch (err) {
      // Pattern invalidation not supported
    }
  }

  /**
   * Invalidate cache for a specific entity
   */
  async invalidateEntityCache(entityType: string, entityId: string): Promise<void> {
    await this.cacheService.del(`${entityType}:${entityId}`);
  }
}
