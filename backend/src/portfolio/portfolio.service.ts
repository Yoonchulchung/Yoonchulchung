import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async create(createPortfolioDto: CreatePortfolioDto) {
    return this.prisma.portfolio.create({ data: createPortfolioDto });
  }

  async findAll(isPublished?: boolean) {
    return this.prisma.portfolio.findMany({
      where: isPublished !== undefined ? { isPublished } : undefined,
    });
  }

  async findOne(id: string) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { id } });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }
    return portfolio;
  }

  async findPublished() {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { isPublished: true },
    });
    if (!portfolio) {
      throw new NotFoundException('No published portfolio found');
    }
    return portfolio;
  }

  async update(id: string, updatePortfolioDto: UpdatePortfolioDto) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { id } });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }
    return this.prisma.portfolio.update({ where: { id }, data: updatePortfolioDto });
  }

  async remove(id: string) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { id } });
    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }
    await this.prisma.portfolio.delete({ where: { id } });
  }
}
