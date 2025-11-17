import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../project.service';
import { PrismaService } from '../../config/prisma.service';
import { ResourceNotFoundException } from '../../common/exceptions/custom-exceptions';

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: PrismaService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createDto = {
        title: 'Test Project',
        description: 'Test description',
        content: 'Test content',
        startDate: '2024-01-01',
        tags: ['React', 'TypeScript'],
        isPublished: true,
        order: 0,
      };

      const mockProject = {
        id: '1',
        ...createDto,
        startDate: new Date(createDto.startDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(createDto);

      expect(result).toEqual(mockProject);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createDto.title,
          description: createDto.description,
          content: createDto.content,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all published projects', async () => {
      const mockProjects = [
        { id: '1', title: 'Project 1', isPublished: true },
        { id: '2', title: 'Project 2', isPublished: true },
      ];

      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.findAll(true);

      expect(result).toEqual(mockProjects);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { isPublished: true },
        orderBy: { order: 'asc' },
      });
    });

    it('should return all projects when published filter is not provided', async () => {
      const mockProjects = [
        { id: '1', title: 'Project 1' },
        { id: '2', title: 'Project 2' },
      ];

      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.findAll();

      expect(result).toEqual(mockProjects);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      const mockProject = { id: '1', title: 'Test Project' };
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProject);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw ResourceNotFoundException if project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('findByTag', () => {
    it('should return projects with the specified tag', async () => {
      const mockProjects = [
        { id: '1', title: 'Project 1', tags: ['React', 'TypeScript'] },
      ];

      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.findByTag('React');

      expect(result).toEqual(mockProjects);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {
          tags: { has: 'React' },
          isPublished: true,
        },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const mockProject = { id: '1', title: 'Old Title' };
      const updateDto = { title: 'New Title' };
      const updatedProject = { id: '1', title: 'New Title' };

      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue(updatedProject);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedProject);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
    });

    it('should throw ResourceNotFoundException if project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.update('999', { title: 'New Title' })).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      const mockProject = { id: '1', title: 'Test Project' };
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project.delete.mockResolvedValue(mockProject);

      await service.remove('1');

      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw ResourceNotFoundException if project not found', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
