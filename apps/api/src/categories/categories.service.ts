
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Return categories that are either default (userId is null) or belong to the user
    return this.prisma.category.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: user.id },
        ],
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
