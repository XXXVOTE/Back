import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HyperledgerService } from 'src/hyperledger.service';
import { CreateUserDto } from 'src/user/createUser.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly hyperledger: HyperledgerService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() req: CreateUserDto) {
    this.authService.createUser(req.email, req.studentNum, req.enrollSecret);
  }

  @Post('addCreate')
  async addCreateRole(@Request() req) {
    this.hyperledger.updateCreateRole(req.body.email, req.body.enrollSecret);
  }

  @Post('authMail')
  async authenticationMail(@Request() req, @Res({ passthrough: true }) res) {
    const authNum = await this.authService.mail(req.body.email);
    res.cookie('authNum', authNum, {
      path: '/',
      expires: new Date(Date.now() + 300000),
    }); // cookie 활성화 경로 설정 필요

    return;
  }

  @Post('validateMail')
  async validateMail(@Request() req) {
    return this.authService.emailCertificate(
      req.body.code,
      req.cookies.authNum,
    );
  }
}
