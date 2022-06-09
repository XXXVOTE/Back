"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectionService = void 0;
const prisma_service_1 = require("../prisma.service");
const common_1 = require("@nestjs/common");
const hyperledger_service_1 = require("../hyperledger.service");
const fs = __importStar(require("fs"));
const fabric_network_1 = require("fabric-network");
const aws_sdk_1 = require("aws-sdk");
const md5_1 = __importDefault(require("md5"));
const node_seal_1 = __importDefault(require("node-seal"));
const pinataSDK = require('@pinata/sdk');
let ElectionService = class ElectionService {
    constructor(prisma, fabric) {
        this.prisma = prisma;
        this.fabric = fabric;
        this.pinata = pinataSDK('1ada54b3bad4005a46c7', 'c9ffd9243831d564f3db4b0eff991e6d4eb1a8194c076efd6068e58963b9df46');
        this.s3 = new aws_sdk_1.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
    }
    async createElection(email, createElectionDTO, candidates) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            await this.checkElectionValidity(contract);
            const createdElection = await this.prisma.createElection(createElectionDTO.electionName, createElectionDTO.startTime, createElectionDTO.endTime, createElectionDTO.electionInfo, createElectionDTO.quorum, createElectionDTO.total);
            await contract.submitTransaction('createElection', String(createdElection.id), createElectionDTO.electionName, createElectionDTO.startTime, createElectionDTO.endTime, 'none');
            await this.checkCandidateValidity(contract, createdElection.id);
            const candidateProfilesPromise = candidates.map((candidate, idx) => {
                let filecontent = String(candidate.profile);
                let buf = Buffer.from(filecontent.replace(/^data:image\/\w+;base64,/, ''), 'base64');
                return this.s3
                    .upload({
                    Bucket: 'uosvotepk',
                    Key: `candidate/electionID-${createdElection.id}/candidate${idx}-profile`,
                    Body: buf,
                    ContentEncoding: 'base64',
                    ContentType: 'image/jpeg',
                })
                    .promise();
            });
            const candidateProfiles = await Promise.all(candidateProfilesPromise);
            const candidatePromise = candidates.map((candidate, idx) => this.prisma.createCandidate(candidate.number, createdElection.id, candidate.candidateName, candidateProfiles[idx].Location, candidate.candidateInfo));
            await Promise.all(candidatePromise);
            const candidatesForLedger = candidates.map((candidate, idx) => contract.submitTransaction('createCandidate', String(candidate.number), String(createdElection.id), candidateProfiles[idx].Location));
            await Promise.all(candidatesForLedger);
            const savedPK = await this.createKey(createdElection.id);
            await this.saveKey(createdElection.id);
            return Object.assign(Object.assign({}, createdElection), { encryption: savedPK });
        }
        catch (err) {
            console.log(`Failed to run CreateElection: ${err}`);
            throw err;
        }
        finally {
            gateway.disconnect();
        }
    }
    async checkElectionValidity(contract) {
        const checkValidity = await contract.submitTransaction('checkValidCreater');
        let validity = this.fabric.toJSONObj(checkValidity.toString());
        if (!validity) {
            throw new common_1.HttpException('checkElectionValidity Forbidden', common_1.HttpStatus.FORBIDDEN);
        }
    }
    async checkCandidateValidity(contract, electionId) {
        const checkValidityForCandidate = await contract.submitTransaction('checkValidCandidateCreater', String(electionId));
        let validity = this.fabric.toJSONObj(checkValidityForCandidate.toString());
        if (!validity) {
            throw new common_1.HttpException('checkCandidateValidity Forbidden', common_1.HttpStatus.FORBIDDEN);
        }
    }
    async getElection(email, electionId) {
        let election = await this.prisma.getElection(electionId);
        const candidates = await this.prisma.getCandidates(electionId);
        const now = await this.getVoterNum(email, electionId);
        return Object.assign(Object.assign({}, election), { candidates, now });
    }
    async getAllElection(email) {
        let elections = await this.prisma.getAllElection();
        return elections;
    }
    async makeContext(seal) {
        const schemeType = seal.SchemeType.bfv;
        const securityLevel = seal.SecurityLevel.tc128;
        const polyModulusDegree = 4096;
        const bitSizes = [36, 36, 37];
        const bitSize = 20;
        const parms = seal.EncryptionParameters(schemeType);
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));
        parms.setPlainModulus(seal.PlainModulus.Batching(polyModulusDegree, bitSize));
        const context = seal.Context(parms, true, securityLevel);
        return context;
    }
    async createKey(electionID) {
        try {
            const seal = await (0, node_seal_1.default)();
            const context = await this.makeContext(seal);
            const keyGenerator = seal.KeyGenerator(context);
            const publicKey = keyGenerator.createPublicKey();
            const savedPK = publicKey.save();
            const encoder = seal.BatchEncoder(context);
            if (!fs.existsSync(`election/electionID-${electionID}`))
                fs.mkdirSync(`election/electionID-${electionID}`);
            fs.writeFileSync(`election/electionID-${electionID}/ENCRYPTION.txt`, savedPK);
            const secretKey = keyGenerator.secretKey();
            const savedSK = secretKey.save();
            console.log(savedSK);
            fs.writeFileSync(`election/electionID-${electionID}/SECRET.txt`, savedSK);
            const encryptor = seal.Encryptor(context, publicKey, secretKey);
            const zeroPlain = seal.PlainText();
            encoder.encode(Int32Array.from([0]), zeroPlain);
            const result = seal.CipherText();
            encryptor.encrypt(zeroPlain, result);
            const resultSave = result.save();
            fs.writeFileSync(`election/electionID-${electionID}/RESULT`, resultSave);
            return savedPK;
        }
        catch (err) {
            throw err;
        }
    }
    async saveKey(electionID) {
        const encryption = {
            Bucket: 'uosvotepk',
            Key: `election/${electionID}/${electionID}-ENCRYPTION.txt`,
            Body: fs.createReadStream(`election/electionID-${electionID}/ENCRYPTION.txt`),
        };
        this.s3.upload(encryption, (err, data) => {
            if (err)
                throw err;
        });
    }
    async encryptionKey(electionId) {
        const savedPK = fs
            .readFileSync(`election/electionID-${electionId}/ENCRYPTION.txt`)
            .toString();
        return { savedPK };
    }
    async vote(email, electionId, ballot) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            const voted = await this.getMyBallot(email, electionId);
            if (voted != null) {
                throw new common_1.HttpException(`Alreeady Voted`, common_1.HttpStatus.CONFLICT);
            }
            const election = await this.prisma.getElection(electionId);
            if (!(await this.checkValidDate(election))) {
                throw new common_1.HttpException(`not valid date for Vote`, common_1.HttpStatus.CONFLICT);
            }
            const filename = `election${electionId}-${(0, md5_1.default)(email + new Date())}`;
            console.log(filename);
            const savedPK = fs
                .readFileSync(`election/electionID-${electionId}/ENCRYPTION.txt`)
                .toString();
            const ballotBuffer = Buffer.from(ballot, 'utf8');
            const ballotFile = fs.createReadStream(ballotBuffer);
            let hash = '';
            const options = {
                pinataMetadata: {
                    name: filename,
                    keyvalues: {
                        electionId: electionId,
                    },
                },
                pinataOptions: {
                    cidVersion: 0,
                },
            };
            await this.pinata
                .pinFileToIPFS(ballotFile, options)
                .then((result) => {
                hash = result.IpfsHash;
            })
                .catch((e) => {
                console.log(e);
                throw new common_1.HttpException('IPFS problem', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            });
            await contract.submitTransaction('vote', String(electionId), hash);
            await this.addBallots(email, electionId, ballot);
        }
        catch (err) {
            console.log(`Failed to run vote: ${err}`);
            throw err;
        }
        finally {
            gateway.disconnect();
        }
    }
    async checkValidDate(election) {
        const cur = new Date();
        if (cur < new Date(election.startDate)) {
            return false;
        }
        if (cur > new Date(election.endDate)) {
            return false;
        }
        return true;
    }
    async getBallots(email, electionId) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            const res = await contract.submitTransaction('voterList', String(electionId));
            const ballots = this.fabric.toJSONObj(res.toString());
            return ballots;
        }
        catch (err) {
            throw err;
        }
        finally {
            gateway.disconnect();
        }
    }
    async getMyBallot(email, electionId) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            const res = await contract.submitTransaction('getMyVote', String(electionId));
            if (!res.length) {
                return null;
            }
            const ballots = this.fabric.toJSONObj(res.toString());
            return ballots;
        }
        catch (err) {
            throw err;
        }
        finally {
            gateway.disconnect();
        }
    }
    async getVoterNum(email, electionId) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            const res = await contract.submitTransaction('voterNum', String(electionId));
            if (!res.length) {
                return null;
            }
            const now = this.fabric.toJSONObj(res.toString());
            return now;
        }
        catch (err) {
            throw err;
        }
        finally {
            gateway.disconnect();
        }
    }
    async addBallots(email, electionId, ballot) {
        if (!fs.existsSync(`election/electionID-${electionId}/ENCRYPTION.txt`)) {
            this.s3.getObject({
                Bucket: 'uosvotepk',
                Key: `election/${electionId}/${electionId}-ENCRYPTION.txt`,
            }, (err, data) => {
                if (err) {
                    throw err;
                }
                fs.writeFileSync(`election/electionID-${electionId}/ENCRYPTION.txt`, data.Body.toString());
            });
        }
        try {
            const seal = await (0, node_seal_1.default)();
            const context = await this.makeContext(seal);
            const savedPK = fs
                .readFileSync(`election/electionID-${electionId}/ENCRYPTION.txt`)
                .toString();
            const publicKey = seal.PublicKey();
            publicKey.load(context, savedPK);
            const encryptor = seal.Encryptor(context, publicKey);
            const encoder = seal.BatchEncoder(context);
            const evaluator = seal.Evaluator(context);
            let savedResult = fs
                .readFileSync(`election/electionID-${electionId}/RESULT`)
                .toString();
            const result = seal.CipherText();
            result.load(context, savedResult);
            const cipher = seal.CipherText();
            cipher.load(context, ballot);
            evaluator.add(cipher, result, result);
            savedResult = result.save();
            fs.writeFileSync(`election/electionID-${electionId}/RESULT`, savedResult);
        }
        catch (err) {
            console.log('addBallot error', err);
        }
    }
    async pushResult(email, electionId, hash) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            await contract.submitTransaction('resultHash', String(electionId), hash);
        }
        catch (err) {
            throw err;
        }
        finally {
            gateway.disconnect();
        }
    }
    async decryptResult(email, electionId) {
        const seal = await (0, node_seal_1.default)();
        const context = await this.makeContext(seal);
        const encoder = seal.BatchEncoder(context);
        const sk = seal.SecretKey();
        const savedSK = fs
            .readFileSync(`election/electionID-${electionId}/SECRET.txt`)
            .toString();
        sk.load(context, savedSK);
        const decryptor = seal.Decryptor(context, sk);
        const savedResult = fs
            .readFileSync(`election/electionID-${electionId}/RESULT`)
            .toString();
        const result = seal.CipherText();
        result.load(context, savedResult);
        const decryptedPlainText = seal.PlainText();
        decryptor.decrypt(result, decryptedPlainText);
        let arr = encoder.decode(decryptedPlainText);
        fs.writeFileSync(`election/electionID-${electionId}/RESULTARR`, arr, 'binary');
        return arr;
    }
    async getElectionResult(electionId) {
        if (!fs.existsSync(`election/electionID-${electionId}/RESULTARR`)) {
            throw new common_1.HttpException(`not made result yet`, common_1.HttpStatus.NOT_FOUND);
        }
        let result = fs
            .readFileSync(`election/electionID-${electionId}/RESULTARR`)
            .toString()
            .split(' ');
        return result;
    }
    async getResult(email, electionId) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            const res = await contract.submitTransaction('getElection', String(electionId));
            const result = JSON.parse(JSON.stringify(JSON.parse(res.toString()), null, 2));
            return { result: result.result };
        }
        catch (err) {
            console.log(`Failed to run getElection: ${err}`);
        }
        finally {
            gateway.disconnect();
        }
    }
    async extendEndDate(email, electionId, newEndDate) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            await contract.submitTransaction('extendEndDate', String(electionId), newEndDate);
            await this.prisma.editElection(electionId, newEndDate);
        }
        catch (err) {
            console.log(`Failed to run extend EndDate: ${err}`);
            throw err;
        }
        finally {
            gateway.disconnect();
        }
    }
};
ElectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        hyperledger_service_1.HyperledgerService])
], ElectionService);
exports.ElectionService = ElectionService;
//# sourceMappingURL=election.service.js.map