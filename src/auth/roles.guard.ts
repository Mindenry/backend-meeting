import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = String(user.role || '').toLowerCase();
    const hasRole = requiredRoles.some(
      (role) => userRole === String(role).toLowerCase(),
    );
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// ============================================
// Granular Permission Guard
// ============================================
// Usage: @UseGuards(JwtAuthGuard, PermissionGuard)
//        @RequirePermission('tasks', 'delete')

export const PERMISSION_KEY = 'required_permission';

export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action });

/**
 * PermissionGuard checks the database-backed RolePermission table.
 * Falls back to a sensible default when no record is found.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{
      resource: string;
      action: string;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!meta) {
      return true; // No permission requirement set
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = String(user.role || '').toLowerCase();

    // org_owner always has full access
    if (userRole === 'org_owner') {
      return true;
    }

    // Check database permissions strictly via PrismaService
    if (user.organizationId) {
      const perm = await this.prisma.rolePermission.findUnique({
        where: {
          organizationId_role_resource_action: {
            organizationId: user.organizationId,
            role: userRole,
            resource: meta.resource,
            action: meta.action,
          },
        },
      });

      if (perm) {
        if (!perm.allowed) {
          throw new ForbiddenException(
            `You do not have permission to ${meta.action} ${meta.resource}`,
          );
        }
        return true;
      }
    }

    // Fallback: use basic role hierarchy if no explicit DB record exists
    const roleHierarchy: Record<string, number> = {
      org_owner: 4,
      admin: 3,
      manager: 2,
      employee: 1,
    };

    const userLevel = roleHierarchy[userRole] ?? 0;

    // Default minimum levels per action
    const actionMinLevel: Record<string, number> = {
      view: 0,
      create: 1,
      edit: 2,
      delete: 3,
      manage: 3,
    };

    const requiredLevel = actionMinLevel[meta.action] ?? 2;
    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `You do not have permission to ${meta.action} ${meta.resource}`,
      );
    }

    return true;
  }
}
