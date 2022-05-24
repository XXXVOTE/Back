import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ElectionService } from './election.service';

@UseGuards(JwtAuthGuard)
@Controller('election')
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @Post()
  createElection(@Request() req) {
    return this.electionService.createElection(
      req.user.email,
      req.body.createElectionDTO,
      req.body.candidates,
    );
  }

  @Get('/ballot/:id')
  getBallots(@Param('id') electionId: number, @Request() req) {
    return this.electionService.getBallots(req.user.email, electionId);
  }

  @Get('/myballot/:id')
  getBallot(@Param('id') electionId: number, @Request() req) {
    return this.electionService.getMyBallot(req.user.email, electionId);
  }

  @Post('/:id')
  vote(@Param('id') electionId, @Request() req) {
    return this.electionService.vote(req.user.email, electionId, req.body.hash);
  }

  @Get('/:id')
  getElection(@Param('id') electionId: number, @Body() body) {
    return this.electionService.getElectionFromLedger(body.email, electionId);
  }

  @Get()
  getElections() {
    return this.electionService.getAllElection();
  }
}
