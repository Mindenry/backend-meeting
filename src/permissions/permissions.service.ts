import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Default permission matrix
const DEFAULT_PERMISSIONS: {
  resource: string;
  action: string;
  roles: Record<string, boolean>;
}[] = [
  // Users
  {
    resource: 'users',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'users',
    action: 'create',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  {
    resource: 'users',
    action: 'edit',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  {
    resource: 'users',
    action: 'delete',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  // Teams
  {
    resource: 'teams',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'teams',
    action: 'create',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  {
    resource: 'teams',
    action: 'edit',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  {
    resource: 'teams',
    action: 'delete',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  // Meetings
  {
    resource: 'meetings',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'meetings',
    action: 'create',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'meetings',
    action: 'edit',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  {
    resource: 'meetings',
    action: 'delete',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  // Tasks
  {
    resource: 'tasks',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'tasks',
    action: 'create',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'tasks',
    action: 'edit',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'tasks',
    action: 'delete',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  // Channels
  {
    resource: 'channels',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'channels',
    action: 'create',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  {
    resource: 'channels',
    action: 'edit',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  {
    resource: 'channels',
    action: 'delete',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  // Reports
  {
    resource: 'reports',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  // Drive
  {
    resource: 'drive',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: true, employee: true },
  },
  {
    resource: 'drive',
    action: 'manage',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  // Settings
  {
    resource: 'settings',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  {
    resource: 'settings',
    action: 'manage',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  // Audit
  {
    resource: 'audit',
    action: 'view',
    roles: { org_owner: true, admin: true, manager: false, employee: false },
  },
  // Invites
  {
    resource: 'invites',
    action: 'manage',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
  // Announcements
  {
    resource: 'announcements',
    action: 'manage',
    roles: { org_owner: true, admin: true, manager: true, employee: false },
  },
];

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all permissions for an organization
   */
  async getPermissions(organizationId: string) {
    return this.prisma.rolePermission.findMany({
      where: { organizationId },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }, { role: 'asc' }],
    });
  }

  /**
   * Get permissions for a specific role in an organization
   */
  async getPermissionsByRole(organizationId: string, role: string) {
    return this.prisma.rolePermission.findMany({
      where: { organizationId, role },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(
    organizationId: string,
    role: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // org_owner always has all permissions
    if (role === 'org_owner') return true;

    const perm = await this.prisma.rolePermission.findUnique({
      where: {
        organizationId_role_resource_action: {
          organizationId,
          role,
          resource,
          action,
        },
      },
    });

    // If no record, fall back to default matrix
    if (!perm) {
      const def = DEFAULT_PERMISSIONS.find(
        (d) => d.resource === resource && d.action === action,
      );
      return def?.roles[role] ?? false;
    }

    return perm.allowed;
  }

  /**
   * Bulk upsert permissions
   */
  async updatePermissions(
    organizationId: string,
    permissions: {
      role: string;
      resource: string;
      action: string;
      allowed: boolean;
    }[],
  ) {
    const ops = permissions.map((p) =>
      this.prisma.rolePermission.upsert({
        where: {
          organizationId_role_resource_action: {
            organizationId,
            role: p.role,
            resource: p.resource,
            action: p.action,
          },
        },
        update: { allowed: p.allowed },
        create: {
          organizationId,
          role: p.role,
          resource: p.resource,
          action: p.action,
          allowed: p.allowed,
        },
      }),
    );

    await this.prisma.$transaction(ops);
    return { success: true, count: permissions.length };
  }

  /**
   * Seed default permissions for an organization
   */
  async seedDefaults(organizationId: string) {
    const records: {
      organizationId: string;
      role: string;
      resource: string;
      action: string;
      allowed: boolean;
    }[] = [];

    for (const entry of DEFAULT_PERMISSIONS) {
      for (const [role, allowed] of Object.entries(entry.roles)) {
        records.push({
          organizationId,
          role,
          resource: entry.resource,
          action: entry.action,
          allowed,
        });
      }
    }

    const ops = records.map((r) =>
      this.prisma.rolePermission.upsert({
        where: {
          organizationId_role_resource_action: {
            organizationId,
            role: r.role,
            resource: r.resource,
            action: r.action,
          },
        },
        update: { allowed: r.allowed },
        create: r,
      }),
    );

    await this.prisma.$transaction(ops);
    this.logger.log(
      `Seeded ${records.length} default permissions for org ${organizationId}`,
    );
    return { success: true, count: records.length };
  }
}
