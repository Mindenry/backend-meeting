import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheHelperService {
  private readonly CACHE_TTL = 60; // 60 seconds default TTL

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Get or set cached data
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.CACHE_TTL,
  ): Promise<T> {
    try {
      const cached = await this.cacheService.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch (err) {
      // Cache miss or error, proceed to fetch
    }

    const data = await fetchFn();
    try {
      await this.cacheService.set(key, data, ttl);
    } catch (err) {
      // Cache set failed, continue without caching
    }
    return data;
  }

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
  async invalidateEntityCache(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.cacheService.del(`${entityType}:${entityId}`);
  }

  /**
   * Invalidate teams list cache for an organization
   */
  async invalidateTeamsCache(organizationId: string): Promise<void> {
    await this.cacheService.del(`teams:org:${organizationId}`);
  }

  /**
   * Invalidate users list cache for an organization
   */
  async invalidateUsersCache(organizationId: string): Promise<void> {
    await this.cacheService.del(`users:org:${organizationId}`);
  }

  /**
   * Invalidate channels cache for a team
   */
  async invalidateChannelsCache(teamId: string): Promise<void> {
    await this.cacheService.del(`channels:team:${teamId}`);
  }
}
