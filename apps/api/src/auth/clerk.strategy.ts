import { Injectable, Inject, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import type { Request } from 'express';
import { verifyToken, type ClerkClient, type User } from '@clerk/backend';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  private readonly logger = new Logger(ClerkStrategy.name);

  constructor(
    @Inject('ClerkClient')
    private readonly clerkClient: ClerkClient,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async validate(req: Request): Promise<User> {
    const token = req.headers.authorization?.split(' ').pop();

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const claims = await verifyToken(token, {
        secretKey: this.configService.get('CLERK_SECRET_KEY'),
      });

      const user = await this.clerkClient.users.getUser(claims.sub);
      return user;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}