import { Controller, Post } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { RequirePermissions } from './permissions.decorator.js';

@Controller('jobs')
@RequirePermissions('admin.access')
export class JobsController {
  constructor(private readonly queueService: QueueService) {}

  @Post('demo')
  async enqueueDemoJob() {
    const job = await this.queueService.enqueueDemoJob();

    return {
      status: 'queued',
      queue: 'system',
      jobId: job.id
    };
  }
}
