import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import crypto from 'crypto-js';
import { HyperledgerService } from 'src/hyperledger.service';
import { JwtService } from '@nestjs/jwt';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabric: HyperledgerService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailerService,
  ) {}
  async createUser(email: string, studentNum: string, enrollSecret: string) {
    try {
      const existingUserWithEmail = await this.prisma.findUserByMail(email);
      if (existingUserWithEmail) {
        throw new HttpException('email is already taken', HttpStatus.CONFLICT);
      }

      try {
        await this.fabric.registerUser(email, enrollSecret, studentNum);
        await this.fabric.enrollUser(email, enrollSecret, studentNum);
      } catch (err) {
        // console.error(`Fail register and enroll for Hyperledger ${err}`);
        throw err;
      }

      const hashedSecret = await bcrypt.hash(
        enrollSecret,
        await bcrypt.genSalt(),
      );
      return this.prisma.createUser(email, studentNum, hashedSecret);
    } catch (err) {
      console.log(err);
      return err;
    }
  }
  async validateUser(email: string, enrollSecret: string): Promise<any> {
    const user = await this.prisma.findUserByMail(email);
    if (user && (await bcrypt.compare(enrollSecret, user.enrollSecret))) {
      const { enrollSecret, ...result } = user;

      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  // async mail(email: string) {
  //   let authNum = Math.random().toString().substr(2, 6); // 인증코드 생성(암호화 x, 안전 x, 임시)

  //   console.log(process.env.NODEMAILER_USER, process.env.NODEMAILER_PASS);
  //   await this.mailService.sendMail({
  //     from: 'uosvote1@gmail.com',
  //     to: email,
  //     subject: '회원가입을 위한 인증번호를 입력해주세요.',
  //     template: 'authmail',
  //     context: { authCode: authNum },
  //   });
  // }

  async mail(email: string) {
    var CryptoJS = require("crypto-js");
    try {
      const authNum = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 인증번호 생성

      await this.mailService.sendMail({
        from: 'uosvote1@gmail.com',
        to: email,
        subject: '[UOSVOTE] 회원가입을 위한 인증번호를 입력해주세요.',
        template: 'authmail',
        context: { authCode: authNum },
      });

      // const authNumHash = await bcrypt.hash(authNum+email,parseInt(process.env.saltOrRounds));

      // const authNumHash = await bcrypt.hash(authNum, await bcrypt.genSalt());

      const authNumHash = CryptoJS.AES.encrypt(authNum, process.env.SECRETKEY).toString();
      return authNumHash;
    } catch (err) {
      throw err;
    }
  }

  //   const encryptAES = (secretKey: string, plainText: string): string => {
  //     const secretKeyToByteArray: Buffer = Buffer.from(secretKey, 'utf8');
  //     const ivParameter: Buffer = Buffer.from(secretKey.slice(0, 16));
  //     const cipher: crypto.Cipher = crypto.createCipheriv('aes-256-cbc', secretKeyToByteArray, ivParameter);
  //     let encryptedValue: string = cipher.update(plainText, 'utf8', 'base64');
  //     encryptedValue += cipher.final('base64');
  //     return encryptedValue;
  // }

  //   async emailCertificate(secretKey: string, encryptedValue: string, req: any) {
  //     const decryptAES = (secretKey: string, encryptedText: string): string => {
  //       const secretKeyToBufferArray: Buffer = Buffer.from(secretKey, 'utf8');
  //       const ivParameter: Buffer = Buffer.from(secretKey, 'utf8');
  //       const cipher: crypto.Decipher = crypto.createDecipheriv('aes-265-cbc', secretKeyToBufferArray, ivParameter);
  //       let decryptedValue: string = cipher.update(encryptedText, 'base64', 'utf8');
  //       return decryptedValue;
  //     }

  //     let decryptedValue: string = decryptAES(secretKey, encryptedValue);

  //     const result = await bcrypt.compare(decryptedValue, req.cookies.authNum);
  //         if(result) {
  //         return {result : "success"}
  //         }
  //         else {
  //             return {result : "failed"}
  //         }
  //   }
  // }

  async emailCertificate(code: string, authNumHash: string) {
    // 입력코드, 해시값 주면 검증
    var CryptoJS = require("crypto-js");
    // const decryptAES = (secretKey: string, encryptedText: string): string => {
    //   const secretKeyToBufferArray: Buffer = Buffer.from(secretKey, 'utf8');
    //   const ivParameter: Buffer = Buffer.from(secretKey, 'utf8');
    //   const cipher: crypto.Decipher = crypto.createDecipheriv(
    //     'aes-265-cbc',
    //     secretKeyToBufferArray,
    //     ivParameter,
    //   );
    //   let decryptedValue: string = cipher.update(
    //     encryptedText,
    //     'base64',
    //     'utf8',
    //   );
    //   return decryptedValue;
    // };

    // let decryptedValue: string = decryptAES(secretKey, encryptedValue);

    // Decrypt
    var bytes  = CryptoJS.AES.decrypt(authNumHash, process.env.SECRETKEY);
    var originalText = bytes.toString(CryptoJS.enc.Utf8);

    console.log(originalText);

    return (code == originalText);

    // const result = await bcrypt.compare(code, authNum);

    // return result;
  }
}
