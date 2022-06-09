"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperledgerService = void 0;
const common_1 = require("@nestjs/common");
const FabricCAServices = require('fabric-ca-client');
const { Wallets, Client } = require('fabric-network');
const fs = require('fs');
const path = require('path');
let HyperledgerService = class HyperledgerService {
    constructor() {
        this.ipAddr = process.env.caAddr;
    }
    toJSONObj(inputString) {
        return JSON.parse(JSON.stringify(JSON.parse(inputString), null, 2));
    }
    async connectGateway(gateway, email) {
        const data = fs.readFileSync('./network.yaml', 'utf8');
        const yaml = require('js-yaml');
        const ccp = yaml.load(data);
        const wallet = await Wallets.newCouchDBWallet(`http://admin:password@${this.ipAddr}:5984`, 'wallet');
        try {
            console.log('check', ccp);
            await gateway.connect(ccp, {
                wallet: wallet,
                identity: email,
                discovery: { enabled: false, asLocalhost: false },
            });
            const network = await gateway.getNetwork('mychannel');
            const contract = network.getContract('votecc');
            return contract;
        }
        catch (err) {
            throw new common_1.HttpException('Failed to connect to HyperLedger', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async registerUser(email, enrollSecret, studentNum) {
        try {
            const caURL = `https://${this.ipAddr}:8054`;
            const ca = new FabricCAServices(caURL);
            const wallet = await Wallets.newCouchDBWallet(`http://admin:password@${this.ipAddr}:5984`, 'wallet');
            const checkExisting = await wallet.get(email);
            if (checkExisting) {
                throw new common_1.HttpException('Already taken email for Hyperledger', common_1.HttpStatus.CONFLICT);
            }
            const adminIdentity = await wallet.get('rca-org1-admin');
            const provider = wallet
                .getProviderRegistry()
                .getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, 'rca-org1-admin');
            await ca.register({
                enrollmentID: email,
                enrollmentSecret: enrollSecret,
                role: 'client',
                attrs: [
                    { name: 'enrollId', value: email, ecert: true },
                    {
                        name: 'department',
                        value: studentNum.substring(4, 7),
                        ecert: true,
                    },
                ],
                maxEnrollments: -1,
            }, adminUser);
        }
        catch (err) {
            console.error(`Fail register and for Hyperledger ${err}`);
            return err;
        }
    }
    async enrollUser(email, enrollSecret, studentNum) {
        try {
            const caURL = `https://${this.ipAddr}:8054`;
            const ca = new FabricCAServices(caURL);
            const wallet = await Wallets.newCouchDBWallet(`http://admin:password@${this.ipAddr}:5984`, 'wallet');
            const enrollment = await ca.enroll({
                enrollmentID: email,
                enrollmentSecret: enrollSecret,
                attr_reqs: [
                    { name: 'enrollId', optional: false },
                    { name: 'department', optional: false },
                ],
            });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'org1MSP',
                type: 'X.509',
            };
            await wallet.put(email, x509Identity);
        }
        catch (err) {
            console.log(`Fail enroll and for Hyperledger ${err}`);
            throw err;
        }
    }
    async updateCreateRole(email, enrollSecret) {
        try {
            const caURL = `https://${this.ipAddr}:8054`;
            const ca = new FabricCAServices(caURL);
            const wallet = await Wallets.newCouchDBWallet(`http://admin:password@${this.ipAddr}:5984`, 'wallet');
            const adminIdentity = await wallet.get('rca-org1-admin');
            const provider = wallet
                .getProviderRegistry()
                .getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, 'rca-org1-admin');
            const identity = ca.newIdentityService();
            await identity.update(email, {
                attrs: [{ name: 'createElection', value: 'true', ecert: true }],
            }, adminUser);
            const enrollment = await ca.enroll({
                enrollmentID: email,
                enrollmentSecret: enrollSecret,
                attr_reqs: [
                    { name: 'enrollId', optional: false },
                    { name: 'department', optional: false },
                    { name: 'createElection', optional: false },
                ],
            });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'org1MSP',
                type: 'X.509',
            };
            await wallet.put(email, x509Identity);
        }
        catch (err) {
            throw err;
        }
    }
};
HyperledgerService = __decorate([
    (0, common_1.Injectable)()
], HyperledgerService);
exports.HyperledgerService = HyperledgerService;
//# sourceMappingURL=hyperledger.service.js.map