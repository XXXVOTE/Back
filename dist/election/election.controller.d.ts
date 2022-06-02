import { ElectionService } from './election.service';
export declare class ElectionController {
    private readonly electionService;
    constructor(electionService: ElectionService);
    createElection(req: any): Promise<import(".prisma/client").Election>;
    getBallots(electionId: number, req: any): Promise<any>;
    getBallot(electionId: number, req: any): Promise<any>;
    result(electionId: number, req: any): Promise<any>;
    getVoterNum(electionId: number, req: any): Promise<any>;
    addBallot(electionId: number, req: any): Promise<void>;
    decrypt(electionId: number, req: any): Promise<string[]>;
    vote(electionId: any, req: any): Promise<void>;
    getElection(electionId: number, req: any): Promise<{
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
