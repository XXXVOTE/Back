import { PrismaService } from 'src/prisma.service';
import { HyperledgerService } from 'src/hyperledger.service';
import { Contract } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
export declare class ElectionService {
    private prisma;
    private fabric;
    constructor(prisma: PrismaService, fabric: HyperledgerService);
    createElection(email: string, createElectionDTO: CreateElectionrDto, candidates: [candidateDTO]): Promise<import(".prisma/client").Election>;
    checkElectionValidity(contract: Contract): Promise<void>;
    checkCandidateValidity(contract: Contract, electionId: number): Promise<void>;
    getElectionFromLedger(email: string, electionID: number): Promise<{
        id: number;
        electionName: string;
        startDate: string;
        endDate: string;
    }>;
    getAllElection(): Promise<any[]>;
    createKey(electionID: number): Promise<void>;
    saveKey(electionID: number): Promise<void>;
    vote(email: string, electionId: number, hash: string): Promise<void>;
    getBallots(email: string, electionId: number): Promise<any>;
    getMyBallot(email: string, electionId: number): Promise<any>;
}
