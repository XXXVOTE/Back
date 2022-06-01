import { PrismaService } from 'src/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HyperledgerService } from 'src/hyperledger.service';
import * as fs from 'fs';
import { Contract, Gateway } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
import { execSync } from 'child_process';
import { S3 } from 'aws-sdk';
import axios from 'axios';

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

      const s3 = new S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      });
      const candidateProfilesPromise = candidates.map((candidate, idx) => {
        let filecontent = String(candidate.profile);
        let buf = Buffer.from(
          filecontent.replace(/^data:image\/\w+;base64,/, ''),
          'base64',
        );
        return s3
          .upload({
            Bucket: 'uosvotepk',
            Key: `candidate/electionID-${createdElection.id}/candidate${idx}-profile`,
            Body: buf,
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg',
          })
          .promise();
      });

      const candidateProfiles = await Promise.all(candidateProfilesPromise);

      const candidatePromise = candidates.map((candidate, idx) =>
        this.prisma.createCandidate(
          candidate.number,
          createdElection.id,
          candidate.candidateName,
          candidateProfiles[idx].Location,
          candidate.candidateInfo,
        ),
      );

      await Promise.all(candidatePromise);

      const candidatesForLedger = candidates.map((candidate, idx) =>
        contract.submitTransaction(
          'createCandidate',
          String(candidate.number),
          String(createdElection.id),
          candidateProfiles[idx].Location,
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
    const gateway = new Gateway();
    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      const res = await contract.submitTransaction(
        'getElection',
        String(electionID),
      );

      return JSON.stringify(JSON.parse(res.toString()), null, 2);
    } catch (err) {
      console.log(`Failed to run getElection: ${err}`);
    } finally {
      gateway.disconnect();
    }
  }

  async getAllElection(email: string) {
    let elections = await this.prisma.getAllElection();
    let ret = [];
    for await (let ele of elections) {
      const candidates = await this.prisma.getCandidates(ele.id);
      const now = await this.getVoterNum(email, ele.id);
      ret.push({ ...ele, candidates, now });
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
      Key: `election/${electionID}/${electionID}-ENCRYPTION.txt`,
      Body: fs.createReadStream(
        `election/electionID-${electionID}/ENCRYPTION.txt`,
      ),
    };
    const multiplication = {
      Bucket: 'uosvotepk',
      Key: `election/${electionID}/${electionID}-MULTIPLICATION.txt`,
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

  async getVoterNum(email: string, electionId: number) {
    const gateway = new Gateway();

    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      const res = await contract.submitTransaction(
        'voterNum',
        String(electionId),
      );
      if (!res.length) {
        return null;
      }

      const now = this.fabric.toJSONObj(res.toString());

      return now;
    } catch (err) {
      // console.log(`Failed to run vote: ${err}`);

      throw err;
    } finally {
      gateway.disconnect();
    }
  }

  async addBallots(admin: string, electionId: number) {
    const s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    s3.getObject(
      { Bucket: 'uosvotepk', Key: `${electionId}-ENCRYPTION.txt` },
      (err, data) => {
        if (err) {
          throw err;
        }
        fs.writeFileSync(
          `election/electionID-${electionId}/ENCRYPTION.txt`,
          data.Body.toString(),
        );
      },
    );
    execSync(`mkdir -p election/electionID-${electionId}/cipher`);

    // const { BallotHash: ballots } = await this.getBallots(admin, electionId);
    // console.log(ballots);
    const ballots = ['QmdQvg3uDjj13HcGY5stjqYfQu31FFpRBTKYsmYAFtcAj7'];

    let getBallotFile = ballots.map((ballot, index) => {
      const url = `https://gateway.pinata.cloud/ipfs/${ballot}`;
      return axios({
        method: 'get',
        url,
        responseType: 'stream',
      }).then((response) =>
        response.data.pipe(
          fs.createWriteStream(
            `election/electionID-${electionId}/cipher/ballot${index}`,
          ),
        ),
      );
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

  async decryptResult(electionId: number) {
    execSync(`cd election/electionID-${electionId} && ./UosVote decryptResult`);

    const result = fs
      .readFileSync(`election/electionID-${electionId}/ResultVec`)
      .toString()
      .split(' ');

    console.log(result);

    return result;
  }
}
