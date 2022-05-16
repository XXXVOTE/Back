"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectionModule = void 0;
const common_1 = require("@nestjs/common");
const hyperledger_service_1 = require("../hyperledger.service");
const prisma_service_1 = require("../prisma.service");
const election_controller_1 = require("./election.controller");
const election_service_1 = require("./election.service");
let ElectionModule = class ElectionModule {
};
ElectionModule = __decorate([
    (0, common_1.Module)({
        controllers: [election_controller_1.ElectionController],
        providers: [prisma_service_1.PrismaService, hyperledger_service_1.HyperledgerService, election_service_1.ElectionService],
    })
], ElectionModule);
exports.ElectionModule = ElectionModule;
//# sourceMappingURL=election.module.js.map