import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
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
    this.hyperledger.updateCreateRole(req.body.targetEmail, req.enrollSecret);
  }
}
