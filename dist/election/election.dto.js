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
exports.candidateDTO = exports.CreateElectionrDto = void 0;
const class_validator_1 = require("class-validator");
class CreateElectionrDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateElectionrDto.prototype, "electionName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateElectionrDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateElectionrDto.prototype, "endTime", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateElectionrDto.prototype, "quorum", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateElectionrDto.prototype, "total", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateElectionrDto.prototype, "electionInfo", void 0);
exports.CreateElectionrDto = CreateElectionrDto;
class candidateDTO {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], candidateDTO.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], candidateDTO.prototype, "candidateName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], candidateDTO.prototype, "profile", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], candidateDTO.prototype, "candidateInfo", void 0);
exports.candidateDTO = candidateDTO;
//# sourceMappingURL=election.dto.js.map