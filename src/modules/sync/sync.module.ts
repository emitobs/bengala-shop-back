import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { BranchesController } from './branches.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SyncController, BranchesController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
