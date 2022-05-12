import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ElectionService } from './election.service';

@Controller('election')
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createElection(@Request() req) {
    return this.electionService.createElection(
      req.user.email,
      req.body.createElectionDTO,
      req.body.candidates,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  vote(@Param('id') electionId, @Request() req) {
    return this.electionService.vote(req.user.email, electionId, req.body.hash);
  }

  @Get(':id')
  getElection(@Param('id') electionId: number, @Body() body) {
    return this.electionService.getElectionFromLedger(body.email, electionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getElections(@Request() req) {
    return this.electionService.getAllElection();
  }
}
