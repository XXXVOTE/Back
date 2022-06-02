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

  @Get('/result/:id')
  result(@Param('id') electionId: number, @Request() req) {
    return this.electionService.getResult(req.user.email, electionId);
  }

  @Get('/voterNum/:id')
  getVoterNum(@Param('id') electionId: number, @Request() req) {
    return this.electionService.getVoterNum(req.user.email, electionId);
  }

  @Post('/addballot/:id')
  addBallot(@Param('id') electionId: number, @Request() req) {
    return this.electionService.addBallots(req.user.email, electionId);
  }

  @Post('/decryptResult/:id')
  decrypt(@Param('id') electionId: number, @Request() req) {
    return this.electionService.decryptResult(electionId);
  }

  @Post('/:id')
  vote(@Param('id') electionId, @Request() req) {
    return this.electionService.vote(
      req.user.email,
      electionId,
      req.body.selected,
    );
  }

  @Get('/:id')
  getElection(@Param('id') electionId: number, @Request() req) {
    return this.electionService.getElection(req.user.email, electionId);
  }

  @Get()
  getElections(@Request() req) {
    return this.electionService.getAllElection(req.user.email);
  }
}
