import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InvitesService } from '../invites/invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuditService } from '../common/audit.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    validateUser: jest.fn(),
  };

  const mockInvitesService = {
    validateInvite: jest.fn(),
    markAsUsed: jest.fn(),
    getInviteByToken: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    teamMember: {
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: InvitesService,
          useValue: mockInvitesService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return login result', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'member',
          organizationId: 'org1',
        },
      };

      mockAuthService.login.mockResolvedValue(mockResult);
      mockPrismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: '1',
      });

      const mockReq = {};
      const result = await controller.login(loginDto, mockReq);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        false,
      );
    });
  });

  // Registration endpoint has been removed from AuthController;
  // corresponding tests are no longer applicable.
});
