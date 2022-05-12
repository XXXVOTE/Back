const FabricCAServices = require('fabric-ca-client');
const { Wallets, Client } = require('fabric-network');
const fs = require('fs');
const path = require('path');

// const configPath = path.join(process.cwd(), '../config.json');
// const configJSON = fs.readFileSync(configPath, 'utf8');
// const config = JSON.parse(configJSON);

// const data = fs.readFileSync("../network.yaml");
// const yaml = require('js-yaml');
// const ccp = yaml.safeLoad(data);

async function main() {
  const ipAddr = '13.125.208.240';
  try {
    const caURL = `https://${ipAddr}:8054`;
    const ca = new FabricCAServices(caURL);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newCouchDBWallet(
      `http://admin:password@${ipAddr}:5984`,
      'wallet',
    );
    console.log(`Wallet path : ${walletPath}`);

    const adminIdentity = await wallet.get('rca-org1-admin');

    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);

    // const secret = await ca.register(
    //   {
    //     enrollmentID: 'jgus',
    //     enrollmentSecret: 'jguspw',
    //     maxEnrollments: -1,
    //     role: 'client',
    //   },
    //   adminUser,
    // );

    const enrollment = await ca.enroll({
      enrollmentID: 'jgus2',
      enrollmentSecret: 'jgus2pw',
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
    await wallet.put('jgus2', x509Identity);
    console.log(`enrolled user and import to wallet`);
  } catch (err) {
    console.error(`Fail! ${err}`);
    process.exit(1);
  }
}

main();
