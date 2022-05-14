import { PrismaService } from 'src/prisma.service';
import { Injectable } from '@nestjs/common';

import { HyperledgerService } from 'src/hyperledger.service';
import * as fs from 'fs';
import { Gateway } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
import { execSync } from 'child_process';
import { S3 } from 'aws-sdk';

@Injectable()
export class ElectionService {
  constructor(
    private prisma: PrismaService,
    private hyperledger: HyperledgerService,
  ) {}

  async createElection(
    email: string,
    createElectionDTO: CreateElectionrDto,
    candidates: [candidateDTO],
  ) {
    console.log(email);
    console.log(createElectionDTO);
    console.log(candidates);

    return createElectionDTO;
    // const gateway = new Gateway();
    // try {
    //   const contract = await this.hyperledger.connectGateway(gateway, email);
    //   const createdElection = await this.prisma.createElection(
    //     createElectionDTO.electionName,
    //     createElectionDTO.startTime,
    //     createElectionDTO.endTime,
    //     createElectionDTO.electionInfo,
    //     createElectionDTO.quorum,
    //   );
    //   const candidatePromise = candidates.map((candidate) =>
    //     this.prisma.createCandidate(
    //       candidate.number,
    //       createdElection.id,
    //       candidate.profile,
    //       candidate.promise,
    //     ),
    //   );
    //   await Promise.all(candidatePromise);
    //   await contract.submitTransaction(
    //     'createElection',
    //     String(createdElection.id),
    //     createElectionDTO.electionName,
    //     createElectionDTO.startTime,
    //     createElectionDTO.endTime,
    //     'none',
    //   );
    //   const candidatesForLedger = candidates.map((candidate) =>
    //     contract.submitTransaction(
    //       'createCandidates',
    //       String(createdElection.id),
    //       candidate.profile,
    //       String(candidate.number),
    //     ),
    //   );
    //   await Promise.all(candidatesForLedger);
    //   await this.createKey(createdElection.id);
    //   await this.saveKey(createdElection.id);
    //   return createdElection;
    // } catch (err) {
    //   console.log(`Failed to run CreateElection: ${err}`);
    // } finally {
    //   gateway.disconnect();
    // }
  }

  async getElectionFromLedger(email: string, electionID: number) {
    return {
      id: 1,
      electionName: 'testvote1',
      startDate: '2022-05-01',
      endDate: '2022-05-31',
    };
    // const gateway = new Gateway();

    // try {
    //   const contract = await this.hyperledger.connectGateway(gateway, email);

    //   const res = await contract.submitTransaction(
    //     'getElection',
    //     String(electionID),
    //   );

    //   return JSON.stringify(JSON.parse(res.toString()), null, 2);
    // } catch (err) {
    //   console.log(`Failed to run getElection: ${err}`);
    // } finally {
    //   gateway.disconnect();
    // }
  }

  async getAllElection() {
    return [
      {
        id: 1,
        electionName: 'testvote1',
        startDate: '2022-05-01 06:00:00',
        endDate: '2022-05-31 18:00:00',
        electionInfo: 'election Information for testvote1 Thankyou',
        quorum: 100,
        candidates: [
          {
            candidateNumber: 1,
            profile: 'profileURL',
            promise: 'promise for testvote1-candidate1',
          },
          {
            candidateNumber: 2,
            profile: 'profileURL',
            promise: 'promise for testvote1-candidate2',
          },
          {
            candidateNumber: 3,
            profile: 'profileURL',
            promise: 'promise for testvote1-candidate3',
          },
        ],
      },
      {
        id: 2,
        electionName: 'testvote2',
        startDate: '2022-05-01 06:00:00',
        endDate: '2022-05-31 18:00:00',
        electionInfo: 'election Information for testvote2 Thankyou',
        quorum: 100,
        candidates: [
          {
            candidateNumber: 1,
            profile: 'profileURL',
            promise: 'promise for testvote2-candidate1',
          },
          {
            candidateNumber: 2,
            profile: 'profileURL',
            promise: 'promise for testvote2-candidate2',
          },
          {
            candidateNumber: 3,
            profile: 'profileURL',
            promise: 'promise for testvote2-candidate3',
          },
        ],
      },
      {
        id: 3,
        electionName: 'testvote3',
        startDate: '2022-05-01 06:00:00',
        endDate: '2022-05-31 18:00:00',
        electionInfo: 'election Information for testvote3 Thankyou',
        quorum: 100,
        candidates: [
          {
            candidateNumber: 1,
            profile: 'profileURL',
            promise: 'promise for testvote3-candidate1',
          },
          {
            candidateNumber: 2,
            profile: 'profileURL',
            promise: 'promise for testvote3-candidate2',
          },
          {
            candidateNumber: 3,
            profile: 'profileURL',
            promise: 'promise for testvote3-candidate3',
          },
        ],
      },
    ];
    // return this.prisma.getAllElection();
  }

  async createKey(electionID: number) {
    try {
      execSync(`mkdir -p election/electionID-${electionID}`);
      execSync(`cp UosVote election/electionID-${electionID}/`);
      execSync(`cd election/electionID-${electionID} && ./UosVote saveKey`);
      // let res = execSync(`./election/electionID-${electionID}/UosVote saveKey`);

      // console.log(res.toString('utf8'));
    } catch (err) {
      console.log('create Key error', err);
    }
  }

  async saveKey(electionID: number) {
    console.log(process.cwd());

    const s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const encryption = {
      Bucket: 'uosvotepk',
      Key: `${electionID}-ENCRYPTION.txt`,
      Body: fs.createReadStream(
        `election/electionID-${electionID}/ENCRYPTION.txt`,
      ),
    };
    const multiplication = {
      Bucket: 'uosvotepk',
      Key: `${electionID}-MULTIPLICATION.txt`,
      Body: fs.createReadStream(
        `election/electionID-${electionID}/MULTIPLICATION.txt`,
      ),
    };

    s3.upload(encryption, (err: any, data: any) => {
      if (err) throw err;
      // console.log(`file uploaded! ${data.Location}`);
      execSync(`rm -rf election/electionID-${electionID}/ENCRYPTION.txt`);
    });
    s3.upload(multiplication, (err: any, data: any) => {
      if (err) throw err;
      // console.log(`file uploaded! ${data.Location}`);
      execSync(`rm -rf election/electionID-${electionID}/MULTIPLICATION.txt`);
    });

    // execSync(
    //   `rm -rf election/electionID-${electionID}/ENCRYPTION.txt election/electionID-${electionID}/MULTIPLICATION.txt`,
    // );
  }

  async vote(email: string, electionId: number, hash: string) {
    const gateway = new Gateway();

    try {
      const contract = await this.hyperledger.connectGateway(gateway, email);

      await contract.submitTransaction('vote', String(electionId), hash);
    } catch (err) {
      console.log(`Failed to run vote: ${err}`);
    } finally {
      gateway.disconnect();
    }
  }
}
