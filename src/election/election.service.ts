import { PrismaService } from 'src/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HyperledgerService } from 'src/hyperledger.service';
import * as fs from 'fs';
import { Contract, Gateway } from 'fabric-network';
import { candidateDTO, CreateElectionrDto } from './election.dto';
import { execSync } from 'child_process';
import { S3 } from 'aws-sdk';
import axios from 'axios';
import md5 from 'md5';
import SEAL from 'node-seal';
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

  s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

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

      const candidateProfilesPromise = candidates.map((candidate, idx) => {
        let filecontent = String(candidate.profile);
        let buf = Buffer.from(
          filecontent.replace(/^data:image\/\w+;base64,/, ''),
          'base64',
        );
        return this.s3
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

      const savedPK = await this.createKey(createdElection.id);
      await this.saveKey(createdElection.id);

      // createdElection.encryption = savedPK;
      return { ...createdElection, encryption: savedPK };
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

  async makeContext(seal) {
    const schemeType = seal.SchemeType.bfv;
    const securityLevel = seal.SecurityLevel.tc128;
    const polyModulusDegree = 4096;
    const bitSizes = [36, 36, 37];
    const bitSize = 20;
    const parms = seal.EncryptionParameters(schemeType);

    parms.setPolyModulusDegree(polyModulusDegree);

    // Create a suitable set of CoeffModulus primes
    parms.setCoeffModulus(
      seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)),
    );

    // Set the PlainModulus to a prime of bitSize 20.
    parms.setPlainModulus(
      seal.PlainModulus.Batching(polyModulusDegree, bitSize),
    );

    const context = seal.Context(
      parms, // Encryption Parameters
      true, // ExpandModChain
      securityLevel, // Enforce a security level
    );

    return context;
  }
  async createKey(electionID: number) {
    try {
      const seal = await SEAL();
      const context = await this.makeContext(seal);
      const keyGenerator = seal.KeyGenerator(context);
      const publicKey = keyGenerator.createPublicKey();
      const savedPK = publicKey.save();
      const encoder = seal.BatchEncoder(context);

      if (!fs.existsSync(`election/electionID-${electionID}`))
        fs.mkdirSync(`election/electionID-${electionID}`);
      fs.writeFileSync(
        `election/electionID-${electionID}/ENCRYPTION.txt`,
        savedPK,
      );
      const secretKey = keyGenerator.secretKey();
      const savedSK = secretKey.save();
      console.log(savedSK);
      fs.writeFileSync(`election/electionID-${electionID}/SECRET.txt`, savedSK);

      const encryptor = seal.Encryptor(context, publicKey, secretKey);
      const zeroPlain = seal.PlainText();
      encoder.encode(Int32Array.from([0]), zeroPlain);
      const result = seal.CipherText();
      encryptor.encrypt(zeroPlain, result);

      const resultSave = result.save();
      fs.writeFileSync(`election/electionID-${electionID}/RESULT`, resultSave);
      // console.log(res.toString('utf8'));

      return savedPK;
    } catch (err) {
      throw err;
      // console.log('create Key error', err);
    }
  }

  async saveKey(electionID: number) {
    const encryption = {
      Bucket: 'uosvotepk',
      Key: `election/${electionID}/${electionID}-ENCRYPTION.txt`,
      Body: fs.createReadStream(
        `election/electionID-${electionID}/ENCRYPTION.txt`,
      ),
    };

    this.s3.upload(encryption, (err: any, data: any) => {
      if (err) throw err;
    });
  }
  async encryptionKey(electionId: number) {
    const savedPK = fs
      .readFileSync(`election/electionID-${electionId}/ENCRYPTION.txt`)
      .toString();

    return { savedPK };
  }

  async vote(email: string, electionId: number, ballot: string) {
    const gateway = new Gateway();

    try {
      const contract = await this.fabric.connectGateway(gateway, email);
      const voted = await this.getMyBallot(email, electionId);
      if (voted != null) {
        throw new HttpException(`Alreeady Voted`, HttpStatus.CONFLICT);
      }

      const election = await this.prisma.getElection(electionId);

      if (!(await this.checkValidDate(election))) {
        throw new HttpException(`not valid date for Vote`, HttpStatus.CONFLICT);
      }

      const filename = `election${electionId}-${md5(email + new Date())}`;
      console.log(filename);
      // const seal = await SEAL();
      // const context = await this.makeContext(seal);

      // const stat = fs.existSync(`election/electionID-${electionId}/cipher`);
      // if (!stat.isDirectory()) {
      //   fs.mkdirSync(`election/electionID-${electionId}/cipher`);
      // }
      const savedPK = fs
        .readFileSync(`election/electionID-${electionId}/ENCRYPTION.txt`)
        .toString();

      // const publicKey = seal.PublicKey();
      // publicKey.load(context, savedPK);
      // const encryptor = seal.Encryptor(context, publicKey);
      // const encoder = seal.BatchEncoder(context);

      // const arr = new Int32Array(4096);
      // arr[selected] = 1;
      // const plainText = seal.PlainText();
      // encoder.encode(arr, plainText);
      // const cipherText = seal.CipherText();
      // encryptor.encrypt(plainText, cipherText);
      // const savedCipher = cipherText.save();
      fs.writeFileSync(`election/electionID-${electionId}/${filename}`, ballot);
      // const ballotFile = fs.createReadStream(ballot);
      let hash = '';

      const options: any = {
        pinataMetadata: {
          name: filename,
          keyvalues: {
            electionId: electionId,
          },
        },
        pinataOptions: {
          cidVersion: 0,
        },
      };
      await this.pinata
        .pinFromFS(`election/electionID-${electionId}/${filename}`, options)
        .then((result) => {
          hash = result.IpfsHash;
          fs.rm(`election/electionID-${electionId}/${filename}`, () => {});
        })
        .catch((e) => {
          console.log(e);
          throw new HttpException(
            'IPFS problem',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        });

      // fs.renameSync(
      //   `election/electionID-${electionId}/cipher/${filename}`,
      //   `election/electionID-${electionId}/cipher/${hash}`,
      // );

      await contract.submitTransaction('vote', String(electionId), hash);
      await this.addBallots(email, electionId, ballot);
    } catch (err) {
      console.log(`Failed to run vote: ${err}`);

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

  async addBallots(email: string, electionId: number, ballot: string) {
    if (!fs.existsSync(`election/electionID-${electionId}/ENCRYPTION.txt`)) {
      this.s3.getObject(
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
    // let queryString =
    //   '?' +
    //   `metadata[keyvalues]={"electionId":{"value":${electionId},"op":"eq"}}`;
    // const url = `https://api.pinata.cloud/data/pinList${queryString}`;
    // console.log(url);
    // await axios
    //   .get(url, {
    //     headers: {
    //       pinata_api_key: '1ada54b3bad4005a46c7',
    //       pinata_secret_api_key:
    //         'c9ffd9243831d564f3db4b0eff991e6d4eb1a8194c076efd6068e58963b9df46',
    //     },
    //   })
    //   .then(function (response) {
    //     console.log(response.data);
    //   })
    //   .catch(function (error) {
    //     console.log(error);
    //     //handle error here
    //   });

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
      const seal = await SEAL();
      const context = await this.makeContext(seal);
      const savedPK = fs
        .readFileSync(`election/electionID-${electionId}/ENCRYPTION.txt`)
        .toString();

      const publicKey = seal.PublicKey();
      publicKey.load(context, savedPK);
      const encryptor = seal.Encryptor(context, publicKey);
      const encoder = seal.BatchEncoder(context);
      const evaluator = seal.Evaluator(context);

      let savedResult = fs
        .readFileSync(`election/electionID-${electionId}/RESULT`)
        .toString();
      const result = seal.CipherText();
      result.load(context, savedResult);
      const cipher = seal.CipherText();
      cipher.load(context, ballot);
      evaluator.add(cipher, result, result);

      savedResult = result.save();
      fs.writeFileSync(`election/electionID-${electionId}/RESULT`, savedResult);
    } catch (err) {
      console.log('addBallot error', err);
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

  async decryptResult(email: string, electionId: number) {
    // if (await this.checkValidDate(electionId)) {
    //   throw new HttpException(
    //     `not valid date for decryptResult`,
    //     HttpStatus.CONFLICT,
    //   );
    // }
    const seal = await SEAL();
    const context = await this.makeContext(seal);
    const encoder = seal.BatchEncoder(context);
    const sk = seal.SecretKey();
    const savedSK = fs
      .readFileSync(`election/electionID-${electionId}/SECRET.txt`)
      .toString();
    sk.load(context, savedSK);

    const decryptor = seal.Decryptor(context, sk);

    const savedResult = fs
      .readFileSync(`election/electionID-${electionId}/RESULT`)
      .toString();
    const result = seal.CipherText();
    result.load(context, savedResult);

    const decryptedPlainText = seal.PlainText();
    decryptor.decrypt(result, decryptedPlainText);
    let arr = encoder.decode(decryptedPlainText);
    fs.writeFileSync(
      `election/electionID-${electionId}/RESULTARR`,
      arr,
      'binary',
    );

    // let hash = '';
    // const options: any = {
    //   pinataMetadata: {
    //     name: `${electionId}-RESULT`,
    //     keyvalues: {
    //       electionId: electionId,
    //     },
    //   },
    //   pinataOptions: {
    //     cidVersion: 0,
    //   },
    // };

    // await this.pinata
    //   .pinFromFS(`election/electionID-${electionId}/RESULT`, options)
    //   .then((result) => {
    //     hash = result.IpfsHash;
    //   })
    //   .catch(() => {
    //     //handle error here
    //     throw new HttpException(
    //       'IPFS problem',
    //       HttpStatus.INTERNAL_SERVER_ERROR,
    //     );
    //   });

    // this.pushResult(email, electionId, hash);

    return arr;
  }

  async getElectionResult(electionId: number) {
    if (!fs.existsSync(`election/electionID-${electionId}/RESULTARR`)) {
      throw new HttpException(`not made result yet`, HttpStatus.NOT_FOUND);
    }
    let resultFile = fs.readFileSync(
      `election/electionID-${electionId}/RESULTARR`,
    );
    const result = new Int32Array(resultFile);

    const candidates = await this.prisma.getCandidates(electionId);
    return result.slice(1, candidates.length);
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
