import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { loadRuntimeConfig } from '@ruflo/config';

async function bootstrap() {
  const config = loadRuntimeConfig();
  const connection = new Redis(config.redis.url, { maxRetriesPerRequest: null });
  const queue = new Queue('ai-tasks', { connection });

  const worker = new Worker(
    'ai-tasks',
    async (job) => {
      console.log(`AI placeholder processed ${job.name}`, job.data);
      return { status: 'placeholder-complete' };
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`AI job completed ${job?.id}`);
  });

  await queue.add('placeholder-ai-task', { mode: 'noop' });
  console.log(`AI worker started on queue "${queue.name}"`);
}

bootstrap().catch((error) => {
  console.error('AI worker failed to start', error);
  process.exitCode = 1;
});
