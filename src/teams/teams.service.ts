import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  findAll() {
    return this.prisma.team.findMany({
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

  async create(data: { name: string; description?: string; organizationId?: string }) {
    // Get default organization if not provided
    let organizationId = data.organizationId;
    if (!organizationId) {
      const defaultOrg = await this.prisma.organization.findFirst();
      if (!defaultOrg) {
        throw new Error('No organization found. Please create an organization first.');
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

  async update(id: string, data: { name?: string }) {
    const exists = await this.prisma.team.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Team not found');
    }
    const team = await this.prisma.team.update({ where: { id }, data });
    this.eventsGateway.emitTeamUpdated(team);
    return team;
  }

  async remove(id: string) {
    const exists = await this.prisma.team.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Team not found');
    }
    await this.prisma.team.delete({ where: { id } });
    return { success: true };
  }

  // --- team members ---

  async addMember(teamId: string, userId: string, role = 'member') {
    await this.ensureTeamAndUser(teamId, userId);
    const member = await this.prisma.teamMember.upsert({
      where: {
        userId_teamId: { userId, teamId },
      },
      update: { role },
      create: {
        teamId,
        userId,
        role,
      },
      include: { user: true, team: true },
    });
    this.eventsGateway.emitTeamMemberAdded(teamId, member);
    return member;
  }

  listMembers(teamId: string) {
    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });
  }

  async removeMember(teamId: string, userId: string) {
    await this.prisma.teamMember.delete({
      where: {
        userId_teamId: { userId, teamId },
      },
    });
    return { success: true };
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


