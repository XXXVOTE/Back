import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'enrollSecret' });
  }

  async validate(email: string, enrollSecret: string): Promise<any> {
    const user = await this.authService.validateUser(email, enrollSecret);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
