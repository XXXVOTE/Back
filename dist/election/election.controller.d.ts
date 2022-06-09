import { ElectionService } from './election.service';
export declare class ElectionController {
    private readonly electionService;
    constructor(electionService: ElectionService);
    createKey(req: any): Promise<string>;
    createElection(req: any): Promise<{
        encryption: string;
        id: number;
        name: string;
        startDate: string;
        endDate: string;
        info: string;
        quorum: number;
        total: number;
    }>;
    encryptionKey(electionId: any, req: any): Promise<{
        savedPK: string;
    }>;
    getBallots(electionId: any, req: any): Promise<any>;
    getBallot(electionId: any, req: any): Promise<any>;
    result(electionId: any, req: any): Promise<{
        result: any;
    }>;
    electionRes(electionId: any, req: any): Promise<string[]>;
    getVoterNum(electionId: any, req: any): Promise<any>;
    decrypt(electionId: any, req: any): Promise<Int32Array | Uint32Array>;
    vote(electionId: any, req: any): Promise<void>;
    editElection(electionId: any, req: any): Promise<void>;
    getElection(electionId: any, req: any): Promise<{
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
    getElections(req: any): Promise<import(".prisma/client").Election[]>;
}
