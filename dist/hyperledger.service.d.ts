import { Gateway } from 'fabric-network';
export declare class HyperledgerService {
    ipAddr: string;
    toJSONObj(inputString: string): any;
    connectGateway(gateway: Gateway, email: string): Promise<import("fabric-network").Contract>;
    registerUser(email: string, enrollSecret: string, studentNum: string): Promise<any>;
    enrollUser(email: string, enrollSecret: string, studentNum: string): Promise<void>;
    updateCreateRole(email: string, enrollSecret: string): Promise<void>;
}
