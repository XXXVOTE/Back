import { PrismaService } from 'src/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HyperledgerService } from 'src/hyperledger.service';
import * as fs from 'fs';
import { Contract, Gateway } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
import { execSync } from 'child_process';
import { S3 } from 'aws-sdk';

@Injectable()
export class ElectionService {
  constructor(
    private prisma: PrismaService,
    private fabric: HyperledgerService,
  ) {}

  async createElection(
    email: string,
    createElectionDTO: CreateElectionrDto,
    candidates: [candidateDTO],
  ) {
    const gateway = new Gateway();

    try {
      console.log(email);
      const contract = await this.fabric.connectGateway(gateway, email);

      await this.checkElectionValidity(contract);

      const createdElection = await this.prisma.createElection(
        createElectionDTO.electionName,
        createElectionDTO.startTime,
        createElectionDTO.endTime,
        createElectionDTO.electionInfo,
        createElectionDTO.quorum,
        createElectionDTO.total,
      );

      await contract.submitTransaction(
        'createElection',
        String(createdElection.id),
        createElectionDTO.electionName,
        createElectionDTO.startTime,
        createElectionDTO.endTime,
        'none',
      );

      await this.checkCandidateValidity(contract, createdElection.id);

      const candidatePromise = candidates.map((candidate) =>
        this.prisma.createCandidate(
          candidate.number,
          createdElection.id,
          candidate.candidateName,
          candidate.profile,
          candidate.promise,
        ),
      );

      await Promise.all(candidatePromise);

      const candidatesForLedger = candidates.map((candidate) =>
        contract.submitTransaction(
          'createCandidate',
          String(candidate.number),
          String(createdElection.id),
          candidate.profile,
        ),
      );

      await Promise.all(candidatesForLedger);

      await this.createKey(createdElection.id);
      await this.saveKey(createdElection.id);

      return createdElection;
    } catch (err) {
      console.log(`Failed to run CreateElection: ${err}`);
      throw err;
      // return err;
    } finally {
      gateway.disconnect();
    }
  }

  async checkElectionValidity(contract: Contract) {
    const checkValidity = await contract.submitTransaction('checkValidCreater');
    let validity = this.fabric.toJSONObj(checkValidity.toString());
    if (!validity) {
      throw new HttpException(
        'checkElectionValidity Forbidden',
        HttpStatus.FORBIDDEN,
      );
      // throw new Error({ response: `Forbidden` });
    }
  }

  async checkCandidateValidity(contract: Contract, electionId: number) {
    const checkValidityForCandidate = await contract.submitTransaction(
      'checkValidCandidateCreater',
      String(electionId),
    );
    let validity = this.fabric.toJSONObj(checkValidityForCandidate.toString());

    if (!validity) {
      throw new HttpException(
        'checkCandidateValidity Forbidden',
        HttpStatus.FORBIDDEN,
      );
    }
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
    //   const contract = await this.fabric.connectGateway(gateway, email);

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
    // return [
    //   {
    //     id: 1,
    //     electionName: 'testvote1',
    //     startDate: '2022-05-01 06:00:00',
    //     endDate: '2022-05-31 18:00:00',
    //     electionInfo: 'election Information for testvote1 Thankyou',
    //     quorum: 100,
    //     candidates: [
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 1,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote1-candidate1',
    //       },
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 2,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote1-candidate2',
    //       },
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 3,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote1-candidate3',
    //       },
    //     ],
    //   },
    //   {
    //     id: 2,
    //     electionName: 'testvote2',
    //     startDate: '2022-05-01 06:00:00',
    //     endDate: '2022-05-31 18:00:00',
    //     electionInfo: 'election Information for testvote2 Thankyou',
    //     quorum: 100,
    //     candidates: [
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 1,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote2-candidate1',
    //       },
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 2,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote2-candidate2',
    //       },
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 3,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote2-candidate3',
    //       },
    //     ],
    //   },
    //   {
    //     id: 3,
    //     electionName: 'testvote3',
    //     startDate: '2022-05-01 06:00:00',
    //     endDate: '2022-05-31 18:00:00',
    //     electionInfo: 'election Information for testvote3 Thankyou',
    //     quorum: 100,
    //     candidates: [
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 1,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote3-candidate1',
    //       },
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 2,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote3-candidate2',
    //       },
    //       {
    //         candidateName: 'name',
    //         candidateNumber: 3,
    //         profile: 'profileURL',
    //         promise: 'promise for testvote3-candidate3',
    //       },
    //     ],
    //   },
    // ];
    let elections = await this.prisma.getAllElection();
    let ret = [];
    for await (let ele of elections) {
      const candidates = await this.prisma.getCandidates(ele.id);
      ret.push({ ...ele, candidates });
    }
    return ret;
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
      execSync(`rm -rf election/electionID-${electionID}/ENCRYPTION.txt`);
    });
    s3.upload(multiplication, (err: any, data: any) => {
      if (err) throw err;
      execSync(`rm -rf election/electionID-${electionID}/MULTIPLICATION.txt`);
    });
  }

  async vote(email: string, electionId: number, hash: string) {
    const gateway = new Gateway();

    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      await contract.submitTransaction('vote', String(electionId), hash);
    } catch (err) {
      // console.log(`Failed to run vote: ${err}`);

      throw err;
    } finally {
      gateway.disconnect();
    }
  }

  async getBallots(email: string, electionId: number) {
    const gateway = new Gateway();

    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      const res = await contract.submitTransaction(
        'voterList',
        String(electionId),
      );

      const ballots = this.fabric.toJSONObj(res.toString());

      return ballots;
    } catch (err) {
      // console.log(`Failed to run vote: ${err}`);

      throw err;
    } finally {
      gateway.disconnect();
    }
  }

  async getMyBallot(email: string, electionId: number) {
    const gateway = new Gateway();

    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      const res = await contract.submitTransaction(
        'getMyVote',
        String(electionId),
      );
      if (!res.length) {
        return null;
      }

      const ballots = this.fabric.toJSONObj(res.toString());

      return ballots;
    } catch (err) {
      // console.log(`Failed to run vote: ${err}`);

      throw err;
    } finally {
      gateway.disconnect();
    }
  }

  async addBallots(admin: string, electionId: number) {
    execSync(`mkdir -p election/electionID-${electionId}/cipher`);
    const ballots = await this.getBallots(admin, electionId);
    let getBallotFile = ballots.map((ballot) => {
      // // ipfs.files.get(ballot.hash, (err, files)=> {
      //   files.forEach((file) =>{
      //     downloadFile = file.content.toString('utf8')
      //     //download file save
      //     fs.writeFileSync(`election/electionID-${electionId}/cipher/${ballots.hash}`, downloadFile, 'utf8', (err)=>{
      //         if(err) {
      //             console.log(err);
      //         }
      //         console.log('write end');
      //     })
      // });
    });

    await Promise.all(getBallotFile);

    try {
      execSync(`cd election/electionID-${electionId} && ./UosVote addBallots`);
      // let res = execSync(`./election/electionID-${electionID}/UosVote saveKey`);

      // console.log(res.toString('utf8'));
    } catch (err) {
      console.log('create Key error', err);
    }
  }
}
