import { HyperledgerService } from 'src/hyperledger.service';
import { CreateUserDto } from 'src/user/createUser.dto';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    private readonly hyperledger;
    constructor(authService: AuthService, hyperledger: HyperledgerService);
    login(req: any): Promise<{
        accessToken: string;
    }>;
    register(req: CreateUserDto): Promise<void>;
    addCreateRole(req: any): Promise<void>;
    authenticationMail(req: any, res: any): Promise<any>;
    validateMail(req: any): Promise<boolean>;
}
