import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ResourceNotFoundException } from '../common/exceptions/custom-exceptions';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    const data: any = { ...createProjectDto };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    return this.prisma.project.create({ data });
  }

  async findAll(isPublished?: boolean) {
    return this.prisma.project.findMany({
      where: isPublished !== undefined ? { isPublished } : undefined,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new ResourceNotFoundException('Project', id);
    }
    return project;
  }

  async findByTag(tag: string) {
    return this.prisma.project.findMany({
      where: {
        tags: { has: tag },
        isPublished: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new ResourceNotFoundException('Project', id);
    }

    const data: any = { ...updateProjectDto };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    return this.prisma.project.update({ where: { id }, data });
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new ResourceNotFoundException('Project', id);
    }
    await this.prisma.project.delete({ where: { id } });
  }
}
