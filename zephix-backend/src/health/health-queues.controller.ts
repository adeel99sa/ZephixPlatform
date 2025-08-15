import { Controller, Get } from '@nestjs/common'
import { QueueHealthService } from '../queue/queue.health'

@Controller('api/health')
export class HealthQueuesController {
  constructor(private readonly qh: QueueHealthService) {}
  
  @Get('queues')
  async queues() {
    return this.qh.check()
  }
}



