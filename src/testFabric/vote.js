const FabricCAServices = require('fabric-ca-client');
const { Wallets, Client, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const data = fs.readFileSync('../network.yaml', 'utf8');
const yaml = require('js-yaml');
const ccp = yaml.load(data);

console.log(ccp);

const gateway = new Gateway();

function prettyJSONString(inputString) {
  return JSON.stringify(JSON.parse(inputString), null, 2);
}

async function main() {
  try {
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newCouchDBWallet(
      'http://admin:password@localhost:5984',
      'couch-userdb',
    );

    try {
      await gateway.connect(ccp, {
        wallet: wallet,
        identity: 'jgus',
        discovery: { enabled: true, asLocalhost: true }, // using asLocalhost as this gateway is using a fabric network deployed locally
      });
      console.log('gateway.connect!');

      const network = await gateway.getNetwork('mychannel');
      console.log('network!');
      const contract = network.getContract('votecc');
      console.log('votecc!');

      const res = await contract.submitTransaction('getElection', '1');
      console.log(prettyJSONString(res.toString()));
      console.log('*** Result: committed');
    } finally {
      gateway.disconnect();
    }
  } catch (error) {
    console.error(`******** FAILED to run the application: ${error}`);
  }
}

main();
