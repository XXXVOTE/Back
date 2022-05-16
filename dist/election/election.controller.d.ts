import { ElectionService } from './election.service';
export declare class ElectionController {
    private readonly electionService;
    constructor(electionService: ElectionService);
    createElection(req: any): Promise<import(".prisma/client").Election>;
    vote(electionId: any, req: any): Promise<void>;
    getElection(electionId: number, body: any): Promise<{
        id: number;
        electionName: string;
        startDate: string;
        endDate: string;
    }>;
    getElections(): Promise<any[]>;
}
