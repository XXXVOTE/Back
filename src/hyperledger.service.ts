import {
  HttpException,
  HttpStatus,
  INestApplication,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Gateway } from 'fabric-network';

const FabricCAServices = require('fabric-ca-client');
const { Wallets, Client } = require('fabric-network');
const fs = require('fs');
const path = require('path');

@Injectable()
export class HyperledgerService {
  ipAddr = '3.34.46.225';

  toJSONObj(inputString: string) {
    return JSON.parse(JSON.stringify(JSON.parse(inputString), null, 2));
  }

  async connectGateway(gateway: Gateway, email: string) {
    const data = fs.readFileSync('./network.yaml', 'utf8');
    const yaml = require('js-yaml');
    const ccp = yaml.load(data);

    // const walletPath = path.join(process.cwd(), './wallet');
    const wallet = await Wallets.newCouchDBWallet(
      `http://admin:password@${this.ipAddr}:5984`,
      'wallet',
    );

    try {
      // console.log(email, wallet.get(email));
      await gateway.connect(ccp, {
        wallet: wallet,
        identity: email,
        discovery: { enabled: false, asLocalhost: false },
      });

      const network = await gateway.getNetwork('mychannel');

      const contract = network.getContract('votecc');

      return contract;
    } catch (err) {
      throw new HttpException(
        'Failed to connect to HyperLedger',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async registerUser(email: string, enrollSecret: string, studentNum: string) {
    try {
      const caURL = `https://${this.ipAddr}:8054`;
      const ca = new FabricCAServices(caURL);

      // const walletPath = path.join(process.cwd(), 'src', 'wallet');
      const wallet = await Wallets.newCouchDBWallet(
        `http://admin:password@${this.ipAddr}:5984`,
        'wallet',
      );
      // console.log(`Wallet path : ${walletPath}`);

      const checkExisting = await wallet.get(email);
      if (checkExisting) {
        throw new HttpException(
          'Already taken email for Hyperledger',
          HttpStatus.CONFLICT,
        );
      }
      const adminIdentity = await wallet.get('rca-org1-admin');

      const provider = wallet
        .getProviderRegistry()
        .getProvider(adminIdentity.type);
      const adminUser = await provider.getUserContext(
        adminIdentity,
        'rca-org1-admin',
      );

      await ca.register(
        {
          enrollmentID: email,
          enrollmentSecret: enrollSecret,
          role: 'client',
          attrs: [
            { name: 'enrollId', value: email, ecert: true },
            {
              name: 'department',
              value: studentNum.substring(4, 7),
              ecert: true,
            },
          ],
          maxEnrollments: -1,
        },
        adminUser,
      );
    } catch (err) {
      console.error(`Fail register and for Hyperledger ${err}`);
      return err;
    }
  }
  async enrollUser(email: string, enrollSecret: string, studentNum: string) {
    try {
      const caURL = `https://${this.ipAddr}:8054`;
      const ca = new FabricCAServices(caURL);

      // const walletPath = path.join(process.cwd(), 'src', 'wallet');
      const wallet = await Wallets.newCouchDBWallet(
        `http://admin:password@${this.ipAddr}:5984`,
        'wallet',
      );
      // const wallet = await Wallets.newFileSystemWallet(walletPath);
      // console.log(`Wallet path : ${walletPath}`);

      const enrollment = await ca.enroll({
        enrollmentID: email,
        enrollmentSecret: enrollSecret,
        attr_reqs: [
          { name: 'enrollId', optional: false },
          { name: 'department', optional: false },
        ],
      });

      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: 'org1MSP',
        type: 'X.509',
      };

      await wallet.put(email, x509Identity);
    } catch (err) {
      console.log(`Fail enroll and for Hyperledger ${err}`);
      throw err;
    }
  }

  async updateCreateRole(email: string, enrollSecret: string) {
    try {
      const caURL = `https://${this.ipAddr}:8054`;
      const ca = new FabricCAServices(caURL);

      const wallet = await Wallets.newCouchDBWallet(
        `http://admin:password@${this.ipAddr}:5984`,
        'wallet',
      );

      const adminIdentity = await wallet.get('rca-org1-admin');

      const provider = wallet
        .getProviderRegistry()
        .getProvider(adminIdentity.type);
      const adminUser = await provider.getUserContext(
        adminIdentity,
        'rca-org1-admin',
      );

      const identity = ca.newIdentityService();

      await identity.update(
        email,
        {
          attrs: [{ name: 'createElection', value: 'true', ecert: true }],
        },
        adminUser,
      );

      const enrollment = await ca.enroll({
        enrollmentID: email,
        enrollmentSecret: enrollSecret,
        attr_reqs: [
          { name: 'enrollId', optional: false },
          { name: 'department', optional: false },
          { name: 'createElection', optional: false },
        ],
      });

      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: 'org1MSP',
        type: 'X.509',
      };

      await wallet.put(email, x509Identity);
    } catch (err) {
      throw err;
    }
  }
}
