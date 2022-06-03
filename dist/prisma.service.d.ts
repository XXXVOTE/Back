import { INestApplication, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    onModuleInit(): Promise<void>;
    enableShutdownHooks(app: INestApplication): Promise<void>;
    findUserByMail(email: string): Promise<import(".prisma/client").User>;
    createUser(email: string, studentNum: string, enrollSecret: string): Promise<import(".prisma/client").User>;
    createElection(name: string, startDate: string, endDate: string, info: string, quorum: number, total: number): Promise<import(".prisma/client").Election>;
    createCandidate(candidateNumber: number, electionId: number, candidateName: string, profile: string, promise: string): Promise<import(".prisma/client").Candidate>;
    getElection(id: number): Promise<import(".prisma/client").Election>;
    editElection(id: number, endDate: string): Promise<import(".prisma/client").Election>;
    getAllElection(): Promise<import(".prisma/client").Election[]>;
    getCandidates(electionId: number): Promise<import(".prisma/client").Candidate[]>;
}
