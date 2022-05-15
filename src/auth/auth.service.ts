import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { HyperledgerService } from 'src/hyperledger.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly user: UserService,
    private readonly fabric: HyperledgerService,
    private readonly jwtService: JwtService,
  ) {}

  userData = {
    email: 'user@uos.ac.kr',
    enrollSecret:
      '$2a$10$l250BIWWMlGAP9m2MgWdwesrTwlLGCc1JAZE8MtjelOFAuLfB3UjO',
  };

  async createUser(email: string, studentNum: string, enrollSecret: string) {
    try {
      // const existingUserWithEmail = await this.prisma.findUserByMail(email);
      const existingUserWithEmail = '';
      if (existingUserWithEmail) {
        throw new Error('email is already taken');
      }

      // const hashedSecret = await bcrypt.hash(enrollSecret, 10);

      try {
        await this.fabric.registerUser(email, enrollSecret, studentNum);
        await this.fabric.enrollUser(email, enrollSecret, studentNum);
      } catch (err) {
        console.error(`Fail register and enroll for Hyperledger ${err}`);
        process.exit(1);
      }

      // return this.prisma.createUser(email, studentNum, enrollSecret);
    } catch (err) {
      console.log(err);
    }
  }
  async validateUser(email: string, enrollSecret: string): Promise<any> {
    // const user = await this.prisma.findUserByMail(email);
    const user = {
      email,
      enrollSecret,
    };
    if (user && bcrypt.compare(enrollSecret, this.userData.enrollSecret)) {
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
