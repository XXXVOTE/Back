import { PrismaService } from 'src/prisma.service';
import { HyperledgerService } from 'src/hyperledger.service';
import { Contract } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
export declare class ElectionService {
    private prisma;
    private fabric;
    constructor(prisma: PrismaService, fabric: HyperledgerService);
    pinata: any;
    createElection(email: string, createElectionDTO: CreateElectionrDto, candidates: [candidateDTO]): Promise<import(".prisma/client").Election>;
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
    createKey(electionID: number): Promise<void>;
    saveKey(electionID: number): Promise<void>;
    vote(email: string, electionId: number, selected: number): Promise<void>;
    getBallots(email: string, electionId: number): Promise<any>;
    getMyBallot(email: string, electionId: number): Promise<any>;
    getVoterNum(email: string, electionId: number): Promise<any>;
    addBallots(email: string, electionId: number): Promise<void>;
    pushResult(email: string, electionId: number, hash: string): Promise<void>;
    decryptResult(electionId: number): Promise<string[]>;
    getResult(email: string, electionId: number): Promise<any>;
}
