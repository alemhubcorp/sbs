import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext } from './auth-context.js';

export const CurrentAuthContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext | undefined => {
    const request = context.switchToHttp().getRequest<{ authContext?: AuthContext }>();
    return request.authContext;
  }
);
