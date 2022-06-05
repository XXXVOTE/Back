"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectionService = void 0;
const prisma_service_1 = require("../prisma.service");
const common_1 = require("@nestjs/common");
const hyperledger_service_1 = require("../hyperledger.service");
const fs = require("fs");
const fabric_network_1 = require("fabric-network");
const child_process_1 = require("child_process");
const aws_sdk_1 = require("aws-sdk");
const md5 = require("md5");
const pinataSDK = require('@pinata/sdk');
let ElectionService = class ElectionService {
    constructor(prisma, fabric) {
        this.prisma = prisma;
        this.fabric = fabric;
        this.pinata = pinataSDK('1ada54b3bad4005a46c7', 'c9ffd9243831d564f3db4b0eff991e6d4eb1a8194c076efd6068e58963b9df46');
    }
    async createElection(email, createElectionDTO, candidates) {
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            await this.checkElectionValidity(contract);
            const createdElection = await this.prisma.createElection(createElectionDTO.electionName, createElectionDTO.startTime, createElectionDTO.endTime, createElectionDTO.electionInfo, createElectionDTO.quorum, createElectionDTO.total);
            await contract.submitTransaction('createElection', String(createdElection.id), createElectionDTO.electionName, createElectionDTO.startTime, createElectionDTO.endTime, 'none');
            await this.checkCandidateValidity(contract, createdElection.id);
            const s3 = new aws_sdk_1.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            });
            const candidateProfilesPromise = candidates.map((candidate, idx) => {
                let filecontent = String(candidate.profile);
                let buf = Buffer.from(filecontent.replace(/^data:image\/\w+;base64,/, ''), 'base64');
                return s3
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
            await this.createKey(createdElection.id);
            await this.saveKey(createdElection.id);
            return createdElection;
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
    async createKey(electionID) {
        try {
            (0, child_process_1.execSync)(`mkdir -p election/electionID-${electionID}`);
            (0, child_process_1.execSync)(`cp UosVote election/electionID-${electionID}/`);
            (0, child_process_1.execSync)(`cd election/electionID-${electionID} && ./UosVote saveKey`);
        }
        catch (err) {
            console.log('create Key error', err);
        }
    }
    async saveKey(electionID) {
        console.log(process.cwd());
        const s3 = new aws_sdk_1.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
        const encryption = {
            Bucket: 'uosvotepk',
            Key: `election/${electionID}/${electionID}-ENCRYPTION.txt`,
            Body: fs.createReadStream(`election/electionID-${electionID}/ENCRYPTION.txt`),
        };
        const multiplication = {
            Bucket: 'uosvotepk',
            Key: `election/${electionID}/${electionID}-MULTIPLICATION.txt`,
            Body: fs.createReadStream(`election/electionID-${electionID}/MULTIPLICATION.txt`),
        };
        s3.upload(encryption, (err, data) => {
            if (err)
                throw err;
        });
        s3.upload(multiplication, (err, data) => {
            if (err)
                throw err;
        });
    }
    async vote(email, electionId, selected) {
        const election = await this.prisma.getElection(electionId);
        if (!(await this.checkValidDate(election))) {
            throw new common_1.HttpException(`not valid date for Vote`, common_1.HttpStatus.CONFLICT);
        }
        console.log(selected);
        const filename = `election${electionId}-${md5(email + new Date())}`;
        (0, child_process_1.execSync)(`mkdir -p election/electionID-${electionId}/cipher`);
        (0, child_process_1.execSync)(`cd election/electionID-${electionId} && ./UosVote voteAndEncrypt ${selected} ${filename}`);
        let hash = '';
        const options = {
            pinataOptions: {
                cidVersion: 0,
            },
        };
        await this.pinata
            .pinFromFS(`election/electionID-${electionId}/cipher/${filename}`, options)
            .then((result) => {
            hash = result.IpfsHash;
        })
            .catch(() => {
            throw new common_1.HttpException('IPFS problem', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        });
        (0, child_process_1.execSync)(`cd election/electionID-${electionId}/cipher && mv ${filename} ${hash}`);
        const gateway = new fabric_network_1.Gateway();
        try {
            const contract = await this.fabric.connectGateway(gateway, email);
            await contract.submitTransaction('vote', String(electionId), hash);
        }
        catch (err) {
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
    async addBallots(email, electionId) {
        const s3 = new aws_sdk_1.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
        const stat = fs.statSync(`election/electionID-${electionId}/ENCRYPTION.txt`);
        if (!stat.isFile()) {
            s3.getObject({
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
            (0, child_process_1.execSync)(`cd election/electionID-${electionId} && ./UosVote addBallots`);
            let hash = '';
            const options = {
                pinataMetadata: {
                    name: `${electionId}-RESULT`,
                },
                pinataOptions: {
                    cidVersion: 0,
                },
            };
            await this.pinata
                .pinFromFS(`election/electionID-${electionId}/RESULT`, options)
                .then((result) => {
                hash = result.IpfsHash;
            })
                .catch(() => {
                throw new common_1.HttpException('IPFS problem', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            });
            this.pushResult(email, electionId, hash);
        }
        catch (err) {
            console.log('create Key error', err);
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
    async decryptResult(electionId) {
        (0, child_process_1.execSync)(`cd election/electionID-${electionId} && ./UosVote decryptResult`);
    }
    async getElectionResult(electionId) {
        const stat = fs.statSync(`election/electionID-${electionId}/ResultVec`);
        if (!stat.isFile()) {
            throw new common_1.HttpException(`not made result yet`, common_1.HttpStatus.NOT_FOUND);
        }
        let result = fs
            .readFileSync(`election/electionID-${electionId}/ResultVec`)
            .toString()
            .split(' ');
        const candidates = await this.prisma.getCandidates(electionId);
        return result.slice(0, candidates.length);
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