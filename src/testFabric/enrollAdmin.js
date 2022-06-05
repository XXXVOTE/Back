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
    const caURL = `https://3.39.187.251:8054`;
    const ca = new FabricCAServices(caURL);
    console.log('done');
    const wallet = await Wallets.newCouchDBWallet(
      `http://admin:password@3.39.187.251:5984`,
      'wallet',
    );

    const adminExists = await wallet.get('rca-org1');
    if (adminExists) {
      console.log(`An identitiy already exists`);
      return;
    }

    const enrollment = await ca.enroll({
      enrollmentID: 'rca-org1-admin',
      enrollmentSecret: 'rca-org1-adminpw',
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'org1MSP',
      type: 'X.509',
    };
    await wallet.put('rca-org1-admin', x509Identity);
    console.log(`enrolled user and import to wallet`);
  } catch (err) {
    console.error(`Fail! ${err}`);
    process.exit(1);
  }
}

main();
