import { PrismaService } from 'src/prisma.service';
import { HyperledgerService } from 'src/hyperledger.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly prisma;
    private readonly fabric;
    private readonly jwtService;
    constructor(prisma: PrismaService, fabric: HyperledgerService, jwtService: JwtService);
    createUser(email: string, studentNum: string, enrollSecret: string): Promise<any>;
    validateUser(email: string, enrollSecret: string): Promise<any>;
    login(user: any): Promise<{
        accessToken: string;
    }>;
}
