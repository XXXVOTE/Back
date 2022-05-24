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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
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
let ElectionService = class ElectionService {
    constructor(prisma, fabric) {
        this.prisma = prisma;
        this.fabric = fabric;
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
    async uploadCandidateProfile(file) { }
    async getElectionFromLedger(email, electionID) {
        return {
            id: 1,
            electionName: 'testvote1',
            startDate: '2022-05-01',
            endDate: '2022-05-31',
        };
    }
    async getAllElection() {
        var e_1, _a;
        let elections = await this.prisma.getAllElection();
        let ret = [];
        try {
            for (var elections_1 = __asyncValues(elections), elections_1_1; elections_1_1 = await elections_1.next(), !elections_1_1.done;) {
                let ele = elections_1_1.value;
                const candidates = await this.prisma.getCandidates(ele.id);
                ret.push(Object.assign(Object.assign({}, ele), { candidates }));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (elections_1_1 && !elections_1_1.done && (_a = elections_1.return)) await _a.call(elections_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return ret;
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
            Key: `${electionID}-ENCRYPTION.txt`,
            Body: fs.createReadStream(`election/electionID-${electionID}/ENCRYPTION.txt`),
        };
        const multiplication = {
            Bucket: 'uosvotepk',
            Key: `${electionID}-MULTIPLICATION.txt`,
            Body: fs.createReadStream(`election/electionID-${electionID}/MULTIPLICATION.txt`),
        };
        s3.upload(encryption, (err, data) => {
            if (err)
                throw err;
            (0, child_process_1.execSync)(`rm -rf election/electionID-${electionID}/ENCRYPTION.txt`);
        });
        s3.upload(multiplication, (err, data) => {
            if (err)
                throw err;
            (0, child_process_1.execSync)(`rm -rf election/electionID-${electionID}/MULTIPLICATION.txt`);
        });
    }
    async vote(email, electionId, hash) {
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
    async addBallots(admin, electionId) {
        (0, child_process_1.execSync)(`mkdir -p election/electionID-${electionId}/cipher`);
        const ballots = await this.getBallots(admin, electionId);
        let getBallotFile = ballots.map((ballot) => {
        });
        await Promise.all(getBallotFile);
        try {
            (0, child_process_1.execSync)(`cd election/electionID-${electionId} && ./UosVote addBallots`);
        }
        catch (err) {
            console.log('create Key error', err);
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