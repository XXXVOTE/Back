import { IsNumber, IsString } from 'class-validator';

export class CreateElectionrDto {
  @IsString()
  electionName: string;
  @IsString()
  startTime: string;
  @IsString()
  endTime: string;
  @IsNumber()
  quorum: number;
  @IsNumber()
  total: number;
  @IsString()
  electionInfo: string;
}

export class candidateDTO {
  @IsNumber()
  number: number;
  @IsString()
  candidateName: string;
  @IsString()
  profile: string;
  @IsString()
  promise: string;
}
