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
const CDBKVS = require('fabric-client/lib/impl/CouchDBKeyValueStore.js');

async function main() {
  try {
    const caURL = 'https://3.39.10.86:8054';
    const ca = new FabricCAServices(caURL);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path : ${walletPath}`);

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
        enrollmentID: 'jgus',
        enrollmentSecret:
          '32562da91437f281a21a2b96e91667389dbd1543d63733032c928f1c3ce5a8e1',
        maxEnrollments: -1,
        role: 'client',
      },
      adminUser,
    );
    const enrollment = await ca.enroll({
      enrollmentID: 'jgus',
      enrollmentSecret:
        '32562da91437f281a21a2b96e91667389dbd1543d63733032c928f1c3ce5a8e1',
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'org1MSP',
      type: 'X.509',
    };
    await wallet.put('jgus', x509Identity);
    console.log(`enrolled user and import to wallet`);
  } catch (err) {
    console.error(`Fail! ${err}`);
    process.exit(1);
  }
}

main();
