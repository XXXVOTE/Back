import { ElectionService } from './election.service';
export declare class ElectionController {
    private readonly electionService;
    constructor(electionService: ElectionService);
    createElection(req: any): Promise<import(".prisma/client").Election>;
    getBallots(electionId: any, req: any): Promise<any>;
    getBallot(electionId: any, req: any): Promise<any>;
    result(electionId: any, req: any): Promise<{
        result: any;
    }>;
    electionRes(electionId: any, req: any): Promise<string[]>;
    getVoterNum(electionId: any, req: any): Promise<any>;
    addBallot(electionId: any, req: any): Promise<void>;
    decrypt(electionId: any, req: any): Promise<void>;
    vote(electionId: any, req: any): Promise<void>;
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
