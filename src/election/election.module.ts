import { Module } from '@nestjs/common';
import { HyperledgerService } from 'src/hyperledger.service';
import { PrismaService } from 'src/prisma.service';
import { ElectionController } from './election.controller';
import { ElectionService } from './election.service';

@Module({
  controllers: [ElectionController],
  providers: [PrismaService, HyperledgerService, ElectionService],
})
export class ElectionModule {}
