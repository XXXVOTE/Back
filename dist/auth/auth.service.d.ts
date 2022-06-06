import { PrismaService } from 'src/prisma.service';
import { HyperledgerService } from 'src/hyperledger.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
export declare class AuthService {
    private readonly prisma;
    private readonly fabric;
    private readonly jwtService;
    private readonly mailService;
    constructor(prisma: PrismaService, fabric: HyperledgerService, jwtService: JwtService, mailService: MailerService);
    createUser(email: string, studentNum: string, enrollSecret: string): Promise<any>;
    validateUser(email: string, enrollSecret: string): Promise<any>;
    login(user: any): Promise<{
        accessToken: string;
    }>;
    mail(email: string): Promise<any>;
    emailCertificate(code: string, authNumHash: string): Promise<1 | 0>;
}
