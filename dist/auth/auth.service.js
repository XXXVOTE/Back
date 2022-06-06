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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = require("bcrypt");
const hyperledger_service_1 = require("../hyperledger.service");
const jwt_1 = require("@nestjs/jwt");
const mailer_1 = require("@nestjs-modules/mailer");
let AuthService = class AuthService {
    constructor(prisma, fabric, jwtService, mailService) {
        this.prisma = prisma;
        this.fabric = fabric;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async createUser(email, studentNum, enrollSecret) {
        try {
            const existingUserWithEmail = await this.prisma.findUserByMail(email);
            if (existingUserWithEmail) {
                throw new common_1.HttpException('email is already taken', common_1.HttpStatus.CONFLICT);
            }
            try {
                await this.fabric.registerUser(email, enrollSecret, studentNum);
                await this.fabric.enrollUser(email, enrollSecret, studentNum);
            }
            catch (err) {
                throw err;
            }
            const hashedSecret = await bcrypt.hash(enrollSecret, await bcrypt.genSalt());
            return this.prisma.createUser(email, studentNum, hashedSecret);
        }
        catch (err) {
            console.log(err);
            return err;
        }
    }
    async validateUser(email, enrollSecret) {
        const user = await this.prisma.findUserByMail(email);
        if (user && (await bcrypt.compare(enrollSecret, user.enrollSecret))) {
            const { enrollSecret } = user, result = __rest(user, ["enrollSecret"]);
            return result;
        }
        return null;
    }
    async login(user) {
        const payload = { sub: user.email };
        return {
            accessToken: this.jwtService.sign(payload),
        };
    }
    async mail(email) {
        var CryptoJS = require('crypto-js');
        try {
            const authNum = Math.floor(100000 + Math.random() * 900000).toString();
            await this.mailService.sendMail({
                from: 'yunoa64@outlook.com',
                to: email,
                subject: '[UOSVOTE] 회원가입을 위한 인증번호를 입력해주세요.',
                template: 'authmail',
                context: { authCode: authNum },
            });
            const authNumHash = CryptoJS.AES.encrypt(authNum, process.env.SECRETKEY2).toString();
            return authNumHash;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async emailCertificate(code, authNumHash) {
        var CryptoJS = require('crypto-js');
        var bytes = CryptoJS.AES.decrypt(authNumHash, process.env.SECRETKEY2);
        var authNum = bytes.toString(CryptoJS.enc.Utf8);
        bytes = CryptoJS.AES.decrypt(code, process.env.SECRETKEY);
        var deccode = bytes.toString(CryptoJS.enc.Utf8);
        console.log('authNum: ', authNum);
        console.log('deccode: ', deccode);
        if (authNum == deccode) {
            console.log('인증에 성공했습니다.');
            return 1;
        }
        else {
            console.log('인증에 실패했습니다.');
            return 0;
        }
    }
};
AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        hyperledger_service_1.HyperledgerService,
        jwt_1.JwtService,
        mailer_1.MailerService])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map