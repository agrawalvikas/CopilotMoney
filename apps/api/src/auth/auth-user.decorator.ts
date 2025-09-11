import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // The user object is attached to the request by the ClerkAuthGuard
    return { userId: request.user.id };
  },
);
