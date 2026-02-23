import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  async subscribe(dto: SubscribeDto) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Este email ya esta suscrito');
      }
      // Re-subscribe
      return this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { isActive: true, unsubscribedAt: null },
      });
    }

    return this.prisma.newsletterSubscriber.create({
      data: { email: dto.email.toLowerCase() },
    });
  }

  async unsubscribe(email: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!subscriber || !subscriber.isActive) {
      return { message: 'Unsubscribed' };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    return { message: 'Unsubscribed' };
  }

  async findAllActive(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [subscribers, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where: { isActive: true },
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    ]);

    return {
      data: subscribers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
