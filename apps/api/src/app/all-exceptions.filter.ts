import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof ZodError
          ? 400
          : exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002'
            ? 409
        : 500;

    console.error('Unhandled API exception', {
      path: request?.url,
      method: request?.method,
      correlationId: request?.headers?.['x-correlation-id'] ?? request?.id ?? null,
      status,
      exception
    });

    const body = {
      statusCode: status,
      message: exception instanceof Error ? exception.message : 'Internal server error',
      path: request?.url ?? null,
      correlationId: request?.headers?.['x-correlation-id'] ?? request?.id ?? null,
      timestamp: new Date().toISOString()
    } as Record<string, unknown>;

    if (exception instanceof ZodError) {
      body.message = 'Validation failed';
      body.errors = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message
      }));
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      body.message = 'A unique constraint would be violated by this request.';
      body.code = exception.code;
    }

    response.status(status).send(body);
  }
}
