import { PrismaService } from 'src/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HyperledgerService } from 'src/hyperledger.service';
import * as fs from 'fs';
import { Contract, Gateway } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
import { execSync } from 'child_process';
import { S3 } from 'aws-sdk';
import axios from 'axios';
import * as md5 from 'md5';
const pinataSDK = require('@pinata/sdk');

@Injectable()
export class ElectionService {
  constructor(
    private prisma: PrismaService,
    private fabric: HyperledgerService,
  ) {}

  pinata = pinataSDK(
    '1ada54b3bad4005a46c7',
    'c9ffd9243831d564f3db4b0eff991e6d4eb1a8194c076efd6068e58963b9df46',
  );

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

  async getElection(email: string, electionId: number) {
    let election = await this.prisma.getElection(electionId);
    const candidates = await this.prisma.getCandidates(electionId);
    const now = await this.getVoterNum(email, electionId);

    return { ...election, candidates, now };
  }
  async getAllElection(email: string) {
    let elections = await this.prisma.getAllElection();

    return elections;
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
    });
    s3.upload(multiplication, (err: any, data: any) => {
      if (err) throw err;
    });
  }

  async vote(email: string, electionId: number, selected: number) {
    const election = await this.prisma.getElection(electionId);

    if (!this.checkValidDate(election)) {
      throw new HttpException(`not valid date for Vote`, HttpStatus.CONFLICT);
    }

    const filename = `election${electionId}-${md5(email + new Date())}`;
    execSync(`mkdir -p election/electionID-${electionId}/cipher`);
    execSync(
      `cd election/electionID-${electionId} && ./UosVote voteAndEncrypt ${selected} ${filename}`,
    );
    let hash = '';
    const options: any = {
      pinataOptions: {
        cidVersion: 0,
      },
    };
    await this.pinata
      .pinFromFS(
        `election/electionID-${electionId}/cipher/${filename}`,
        options,
      )
      .then((result) => {
        hash = result.IpfsHash;
      })
      .catch(() => {
        //handle error here
        throw new HttpException(
          'IPFS problem',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });

    execSync(
      `cd election/electionID-${electionId}/cipher && mv ${filename} ${hash}`,
    );

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

  async checkValidDate(election) {
    const cur = new Date();

    if (cur < new Date(election.startDate)) {
      return false;
    }
    if (cur > new Date(election.endDate)) {
      return false;
    }

    return true;
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

  async addBallots(email: string, electionId: number) {
    const s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const stat = fs.statSync(
      `election/electionID-${electionId}/ENCRYPTION.txt`,
    );
    if (!stat.isFile()) {
      s3.getObject(
        {
          Bucket: 'uosvotepk',
          Key: `election/${electionId}/${electionId}-ENCRYPTION.txt`,
        },
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
    }
    // execSync(`mkdir -p election/electionID-${electionId}/cipher`);

    // const ballots = await this.getBallots(email, electionId);

    // let getBallotFile = ballots.map((ballot, index) => {
    //   const url = `https://gateway.pinata.cloud/ipfs/${ballot.BallotHash}`;
    //   return axios({
    //     method: 'get',
    //     url,
    //     responseType: 'stream',
    //   }).then((response) =>
    //     response.data.pipe(
    //       fs.createWriteStream(
    //         `election/electionID-${electionId}/cipher/ballot${index}`,
    //       ),
    //     ),
    //   );
    // });

    // await Promise.all(getBallotFile);

    try {
      execSync(`cd election/electionID-${electionId} && ./UosVote addBallots`);
      // let res = execSync(`./election/electionID-${electionID}/UosVote saveKey`);
      let hash = '';
      const options: any = {
        pinataMetadata: {
          name: `${electionId}-RESULT`,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      };

      await this.pinata
        .pinFromFS(`election/electionID-${electionId}/RESULT`, options)
        .then((result) => {
          hash = result.IpfsHash;
        })
        .catch(() => {
          //handle error here
          throw new HttpException(
            'IPFS problem',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        });

      this.pushResult(email, electionId, hash);
    } catch (err) {
      console.log('create Key error', err);
    }
  }

  async pushResult(email: string, electionId: number, hash: string) {
    const gateway = new Gateway();

    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      await contract.submitTransaction('resultHash', String(electionId), hash);
    } catch (err) {
      // console.log(`Failed to run vote: ${err}`);

      throw err;
    } finally {
      gateway.disconnect();
    }
  }

  async decryptResult(electionId: number) {
    execSync(`cd election/electionID-${electionId} && ./UosVote decryptResult`);
  }

  async getElectionResult(electionId: number) {
    const stat = fs.statSync(`election/electionID-${electionId}/ResultVec`);
    if (!stat.isFile()) {
      throw new HttpException(`not made result yet`, HttpStatus.NOT_FOUND);
    }
    let result = fs
      .readFileSync(`election/electionID-${electionId}/ResultVec`)
      .toString()
      .split(' ');

    const candidates = await this.prisma.getCandidates(electionId);

    return result.slice(0, candidates.length);
  }

  async getResult(email: string, electionId: number) {
    const gateway = new Gateway();
    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      const res = await contract.submitTransaction(
        'getElection',
        String(electionId),
      );

      const result = JSON.parse(
        JSON.stringify(JSON.parse(res.toString()), null, 2),
      );

      return { result: result.result };
    } catch (err) {
      console.log(`Failed to run getElection: ${err}`);
    } finally {
      gateway.disconnect();
    }
  }

  async extendEndDate(email: string, electionId: number, newEndDate: string) {
    const gateway = new Gateway();
    try {
      const contract = await this.fabric.connectGateway(gateway, email);

      await contract.submitTransaction(
        'extendEndDate',
        String(electionId),
        newEndDate,
      );

      await this.prisma.editElection(electionId, newEndDate);
    } catch (err) {
      console.log(`Failed to run extend EndDate: ${err}`);
      throw err;
    } finally {
      gateway.disconnect();
    }
  }
}
