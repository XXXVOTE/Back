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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectionController = void 0;
const common_1 = require("@nestjs/common");
const election_service_1 = require("./election.service");
let ElectionController = class ElectionController {
    constructor(electionService) {
        this.electionService = electionService;
    }
    createElection(req) {
        return this.electionService.createElection(req.user.email, req.body.createElectionDTO, req.body.candidates);
    }
    getBallots(electionId, req) {
        return this.electionService.getBallots(req.user.email, electionId);
    }
    getBallot(electionId, req) {
        return this.electionService.getMyBallot(req.user.email, electionId);
    }
    vote(electionId, req) {
        return this.electionService.vote(req.user.email, electionId, req.body.hash);
    }
    getElection(electionId, body) {
        return this.electionService.getElectionFromLedger(body.email, electionId);
    }
    getElections() {
        return this.electionService.getAllElection();
    }
};
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ElectionController.prototype, "createElection", null);
__decorate([
    (0, common_1.Get)('/ballot/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ElectionController.prototype, "getBallots", null);
__decorate([
    (0, common_1.Get)('/myballot/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ElectionController.prototype, "getBallot", null);
__decorate([
    (0, common_1.Post)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ElectionController.prototype, "vote", null);
__decorate([
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ElectionController.prototype, "getElection", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ElectionController.prototype, "getElections", null);
ElectionController = __decorate([
    (0, common_1.Controller)('election'),
    __metadata("design:paramtypes", [election_service_1.ElectionService])
], ElectionController);
exports.ElectionController = ElectionController;
//# sourceMappingURL=election.controller.js.map