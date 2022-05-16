import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { identity } from 'rxjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async findUserByMail(email: string) {
    // console.log(`email`);
    return await this.user.findUnique({
      where: {
        email,
      },
    });
  }

  async createUser(email: string, studentNum: string, enrollSecret: string) {
    return await this.user.create({
      data: {
        email,
        studentNum,
        enrollSecret,
      },
    });
  }

  async createElection(
    name: string,
    startDate: string,
    endDate: string,
    info: string,
    quorum: number,
    total: number,
  ) {
    return await this.election.create({
      data: {
        name,
        startDate,
        endDate,
        info,
        quorum,
        total,
      },
    });
  }

  async createCandidate(
    candidateNumber: number,
    electionId: number,
    candidateName: string,
    profile: string,
    promise: string,
  ) {
    return this.candidate.create({
      data: {
        candidateName,
        candidateNumber,
        election: {
          connect: {
            id: electionId,
          },
        },
        profile,
        promise,
      },
    });
  }

  async getElection(id: number) {
    return await this.election.findUnique({
      where: {
        id,
      },
    });
  }

  async getAllElection() {
    return await this.election.findMany({
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getCandidates(electionId: number) {
    return await this.candidate.findMany({
      where: {
        electionId: electionId,
      },
    });
  }
}
