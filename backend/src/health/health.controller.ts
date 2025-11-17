import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check() {
    return this.healthService.check();
  }

  @Public()
  @Get('ready')
  ready() {
    return this.healthService.checkReadiness();
  }

  @Public()
  @Get('live')
  live() {
    return this.healthService.checkLiveness();
  }
}
