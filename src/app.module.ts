import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ElectionModule } from './election/election.module';

@Module({
  imports: [AuthModule, ElectionModule],
})
export class AppModule {}
