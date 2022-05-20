import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ElectionModule } from './election/election.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule, ElectionModule,ConfigModule.forRoot({
    isGlobal: true,
  }),],
})
export class AppModule {}
