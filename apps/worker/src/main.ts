import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { loadRuntimeConfig } from '@ruflo/config';

async function bootstrap() {
  const config = loadRuntimeConfig();
  const connection = new Redis(config.redis.url, { maxRetriesPerRequest: null });
  const queue = new Queue('system', { connection });

  const worker = new Worker(
    'system',
    async (job) => {
      console.log(`Processed job ${job.name}`, job.data);
      return { processedAt: new Date().toISOString() };
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`Completed job ${job?.id}`);
  });

  await queue.add('startup-check', { source: 'worker-bootstrap' });
  console.log(`Worker started on queue "${queue.name}"`);
}

bootstrap().catch((error) => {
  console.error('Worker failed to start', error);
  process.exitCode = 1;
});
