import { PrismaService } from 'src/prisma.service';
import { HyperledgerService } from 'src/hyperledger.service';
import { Contract } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
import { S3 } from 'aws-sdk';
export declare class ElectionService {
    private prisma;
    private fabric;
    constructor(prisma: PrismaService, fabric: HyperledgerService);
    pinata: any;
    s3: S3;
    createElection(email: string, createElectionDTO: CreateElectionrDto, candidates: [candidateDTO]): Promise<{
        encryption: string;
        id: number;
        name: string;
        startDate: string;
        endDate: string;
        info: string;
        quorum: number;
        total: number;
    }>;
    checkElectionValidity(contract: Contract): Promise<void>;
    checkCandidateValidity(contract: Contract, electionId: number): Promise<void>;
    getElection(email: string, electionId: number): Promise<{
        candidates: import(".prisma/client").Candidate[];
        now: any;
        id: number;
        name: string;
        startDate: string;
        endDate: string;
        info: string;
        quorum: number;
        total: number;
    }>;
    getAllElection(email: string): Promise<import(".prisma/client").Election[]>;
    makeContext(seal: any): Promise<any>;
    createKey(electionID: number): Promise<string>;
    saveKey(electionID: number): Promise<void>;
    vote(email: string, electionId: number, ballot: string): Promise<void>;
    checkValidDate(election: any): Promise<boolean>;
    getBallots(email: string, electionId: number): Promise<any>;
    getMyBallot(email: string, electionId: number): Promise<any>;
    getVoterNum(email: string, electionId: number): Promise<any>;
    addBallots(email: string, electionId: number, ballot: string): Promise<void>;
    pushResult(email: string, electionId: number, hash: string): Promise<void>;
    decryptResult(email: string, electionId: number): Promise<Int32Array | Uint32Array>;
    getElectionResult(electionId: number): Promise<string[]>;
    getResult(email: string, electionId: number): Promise<{
        result: any;
    }>;
    extendEndDate(email: string, electionId: number, newEndDate: string): Promise<void>;
}
