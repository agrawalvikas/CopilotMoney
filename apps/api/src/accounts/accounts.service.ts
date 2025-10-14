import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    // Find the user by their clerk ID
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return [];
    }

    // Get all accounts for this user
    return this.prisma.account.findMany({
      where: { userId: user.id },
      include: {
        connection: {
          select: {
            institutionName: true,
            tellerId: true,
          },
        },
      },
      orderBy: {
        institutionName: 'asc',
      },
    });
  }
}
