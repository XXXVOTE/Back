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
  try {
    // let stateStore = await new CDBKVS({
    //   url: 'https://admin:password@localhost:5984',
    //   name: 'couch-userdb',
    // });

    // // const client = Client.loadFromConfig('../network.yaml');
    // client.setStateStore(stateStore);
    // const cryptoSuite = Client.newCryptoSuite();

    // let cryptoKS = Client.newCryptoKeyStore(CDBKVS, {
    //   url: 'https://admin:password@localhost:5984',
    //   name: 'couch-userdb',
    // });

    // cryptoSuite.setCryptoKeyStore(cryptoKS);

    // client.setCryptoSuite(cryptoSuite);

    const caURL = 'https://localhost:8054';
    const ca = new FabricCAServices(caURL);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newCouchDBWallet(
      'http://admin:password@localhost:5984',
      'couch-userdb',
    );
    // console.log(`Wallet path : ${walletPath}`);

    const adminIdentity = await wallet.get('rca-org1-admin');
    if (!adminIdentity) {
      console.log('no admin!');
    }

    const enrollmentAdmin = await ca.enroll({
      enrollmentID: 'rca-org1-admin',
      enrollmentSecret: 'rca-org1-adminpw',
    });
    const x509IdentityAdmin = {
      credentials: {
        certificate: enrollmentAdmin.certificate,
        privateKey: enrollmentAdmin.key.toBytes(),
      },
      mspId: 'org1MSP',
      type: 'X.509',
    };
    await wallet.put('rca-org1-admin', x509IdentityAdmin);

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
