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

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadProfile(@UploadedFile() file) {
    return this.uploadProfile(file);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  vote(@Param('id') electionId, @Request() req) {
    return this.electionService.vote(req.user.email, electionId, req.body.hash);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getElection(@Param('id') electionId: number, @Body() body) {
    return this.electionService.getElectionFromLedger(body.email, electionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getElections() {
    return this.electionService.getAllElection();
  }
}
