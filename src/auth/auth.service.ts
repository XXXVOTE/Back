import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { HyperledgerService } from 'src/hyperledger.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabric: HyperledgerService,
    private readonly jwtService: JwtService,
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

      return this.prisma.createUser(email, studentNum, enrollSecret);
    } catch (err) {
      console.log(err);
      return err;
    }
  }
  async validateUser(email: string, enrollSecret: string): Promise<any> {
    const user = await this.prisma.findUserByMail(email);
    if (user && bcrypt.compare(user.enrollSecret, enrollSecret)) {
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
}
