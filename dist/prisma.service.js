"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    async onModuleInit() {
        await this.$connect();
    }
    async enableShutdownHooks(app) {
        this.$on('beforeExit', async () => {
            await app.close();
        });
    }
    async findUserByMail(email) {
        return await this.user.findUnique({
            where: {
                email,
            },
        });
    }
    async createUser(email, studentNum, enrollSecret) {
        return await this.user.create({
            data: {
                email,
                studentNum,
                enrollSecret,
            },
        });
    }
    async createElection(name, startDate, endDate, info, quorum, total) {
        return await this.election.create({
            data: {
                name,
                startDate,
                endDate,
                info,
                quorum,
                total,
            },
        });
    }
    async createCandidate(candidateNumber, electionId, candidateName, profile, promise) {
        return this.candidate.create({
            data: {
                candidateName,
                candidateNumber,
                election: {
                    connect: {
                        id: electionId,
                    },
                },
                profile,
                promise,
            },
        });
    }
    async getElection(id) {
        return await this.election.findUnique({
            where: {
                id,
            },
        });
    }
    async getAllElection() {
        return await this.election.findMany({
            orderBy: {
                id: 'desc',
            },
        });
    }
    async getCandidates(electionId) {
        return await this.candidate.findMany({
            where: {
                electionId: electionId,
            },
        });
    }
};
PrismaService = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
exports.PrismaService = PrismaService;
//# sourceMappingURL=prisma.service.js.map