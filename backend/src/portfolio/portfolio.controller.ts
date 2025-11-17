import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('portfolios')
@UseGuards(RolesGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createPortfolioDto: CreatePortfolioDto) {
    return this.portfolioService.create(createPortfolioDto);
  }

  @Public()
  @Get()
  findAll(@Query('published') published?: string) {
    const isPublished = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.portfolioService.findAll(isPublished);
  }

  @Public()
  @Get('published')
  findPublished() {
    return this.portfolioService.findPublished();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portfolioService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updatePortfolioDto: UpdatePortfolioDto) {
    return this.portfolioService.update(id, updatePortfolioDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.portfolioService.remove(id);
  }
}
