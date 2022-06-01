import { ElectionService } from './election.service';
export declare class ElectionController {
    private readonly electionService;
    constructor(electionService: ElectionService);
    createElection(req: any): Promise<import(".prisma/client").Election>;
    getBallots(electionId: number, req: any): Promise<any>;
    getBallot(electionId: number, req: any): Promise<any>;
    addBallot(electionId: number, req: any): Promise<void>;
    decrypt(electionId: number, req: any): Promise<string[]>;
    vote(electionId: any, req: any): Promise<void>;
    getElection(electionId: number, body: any): Promise<{
        id: number;
        electionName: string;
        startDate: string;
        endDate: string;
    }>;
    getElections(): Promise<any[]>;
}
