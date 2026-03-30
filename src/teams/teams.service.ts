import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  private readonly allowedTeamRoles = ['lead', 'member'] as const;

  findAll(user: any) {
    const orgRole = user?.role?.toLowerCase() || 'employee';
    const isGlobalAdmin = ['org_owner', 'admin'].includes(orgRole);

    const whereClause = isGlobalAdmin
      ? {} // Admins see everything
      : {
          members: {
            some: {
              userId: user.id,
            },
          },
        }; // Employees see only teams they are part of

    return this.prisma.team.findMany({
      where: whereClause,
      include: {
        members: {
          include: { user: true },
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
      },
    });
  }

  async create(data: {
    name: string;
    description?: string;
    organizationId?: string;
  }) {
    let organizationId = data.organizationId;
    if (!organizationId) {
      const defaultOrg = await this.prisma.organization.findFirst();
      if (!defaultOrg) {
        throw new Error(
          'No organization found. Please create an organization first.',
        );
      }
      organizationId = defaultOrg.id;
    }

    const team = await this.prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
      },
    });
    this.eventsGateway.emitTeamCreated(team);
    return team;
  }

  async update(
    id: string,
    data: { name?: string; description?: string },
    requester: any,
  ) {
    const exists = await this.prisma.team.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Team not found');
    }

    // Permission check
    const orgRole = requester.role?.toLowerCase() || 'employee';
    const isGlobalAdmin = ['org_owner'].includes(orgRole);
    if (!isGlobalAdmin) {
      const requesterMember = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: requester.id, teamId: id } },
      });
      if (!requesterMember || requesterMember.role !== 'lead') {
        throw new ForbiddenException(
          'You do not have permission to update this team',
        );
      }
    }

    const team = await this.prisma.team.update({ where: { id }, data });
    this.eventsGateway.emitTeamUpdated(team);
    return team;
  }

  async remove(id: string, requester: any) {
    const exists = await this.prisma.team.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Team not found');
    }

    // Permission check
    const orgRole = requester.role?.toLowerCase() || 'employee';
    const isGlobalAdmin = ['org_owner'].includes(orgRole);
    if (!isGlobalAdmin) {
      const requesterMember = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: requester.id, teamId: id } },
      });
      if (!requesterMember || requesterMember.role !== 'lead') {
        throw new ForbiddenException(
          'You do not have permission to delete this team',
        );
      }
    }

    // Delete all team members first to avoid foreign key constraint violation
    await this.prisma.teamMember.deleteMany({ where: { teamId: id } });
    await this.prisma.team.delete({ where: { id } });
    return { success: true };
  }

  async addMember(teamId: string, userId: string, role = 'member') {
    await this.ensureTeamAndUser(teamId, userId);
    const safeRole = this.sanitizeTeamRole(role);

    const member = await this.prisma.teamMember.upsert({
      where: {
        userId_teamId: { userId, teamId },
      },
      update: { role: safeRole },
      create: {
        teamId,
        userId,
        role: safeRole,
      },
      include: { user: true, team: true },
    });
    this.eventsGateway.emitTeamMemberAdded(teamId, member);
    return member;
  }

  listMembers(teamId: string, includeSystem = false) {
    return this.prisma.teamMember.findMany({
      where: {
        teamId,
        ...(includeSystem
          ? {}
          : {
              user: {
                role: {
                  not: 'system',
                },
              },
            }),
      },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    role: string,
    requester: any,
  ) {
    const safeRole = this.sanitizeTeamRole(role);

    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    // Permission check
    const orgRole = requester.role?.toLowerCase() || 'employee';
    const isGlobalAdmin = ['org_owner'].includes(orgRole);
    if (!isGlobalAdmin) {
      const requesterMember = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: requester.id, teamId } },
      });
      if (!requesterMember || requesterMember.role !== 'lead') {
        throw new ForbiddenException(
          'You do not have permission to manage roles in this team',
        );
      }
    }

    return this.prisma.teamMember.update({
      where: {
        userId_teamId: { userId, teamId },
      },
      data: {
        role: safeRole,
      },
      include: {
        user: true,
        team: true,
      },
    });
  }

  async removeMember(teamId: string, userId: string, requester: any) {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    // Permission check
    const orgRole = requester.role?.toLowerCase() || 'employee';
    const isGlobalAdminOrManager = ['org_owner'].includes(orgRole);
    if (!isGlobalAdminOrManager) {
      const requesterMember = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: requester.id, teamId } },
      });
      if (!requesterMember || requesterMember.role !== 'lead') {
        throw new ForbiddenException(
          'You do not have permission to remove members from this team',
        );
      }
    }

    if (member.role === 'lead') {
      const otherLeads = await this.prisma.teamMember.count({
        where: {
          teamId,
          role: 'lead',
          userId: { not: userId },
        },
      });

      if (otherLeads === 0) {
        throw new BadRequestException(
          'Cannot remove the only team lead. Assign another one first.',
        );
      }
    }

    await this.prisma.teamMember.delete({
      where: {
        userId_teamId: { userId, teamId },
      },
    });
    return { success: true };
  }

  private sanitizeTeamRole(
    role?: string,
  ): (typeof this.allowedTeamRoles)[number] {
    const value = String(role || 'member').toLowerCase();

    if (
      !this.allowedTeamRoles.includes(
        value as (typeof this.allowedTeamRoles)[number],
      )
    ) {
      return 'member';
    }

    return value as (typeof this.allowedTeamRoles)[number];
  }

  private async ensureTeamAndUser(teamId: string, userId: string) {
    const [team, user] = await Promise.all([
      this.prisma.team.findUnique({ where: { id: teamId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!team) throw new NotFoundException('Team not found');
    if (!user) throw new NotFoundException('User not found');
  }
}
