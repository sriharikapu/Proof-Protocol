
const rootPrefix = '../'
    , web3Provider = require(rootPrefix + '/lib/web3/providers/ws')
    , coreAddresses = require(rootPrefix + '/config/core_addresses')
    , proofFacilitator = 'proofFacilitator'
    , proofFacilitatorAbi = coreAddresses.getAbiForContract(proofFacilitator)
    , proofFacilitatorAddress = coreAddresses.getAddressesForContract(proofFacilitator)
    , proofVerifier = 'proofVerifier'
    , proofVerifierAddress = coreAddresses.getAddressForUser(proofVerifier)
    , proofVerifierPassphrase = coreAddresses.getPassphraseForUser(proofVerifier)
    , facilitatorContract = new web3Provider.eth.Contract(proofFacilitatorAbi, proofFacilitatorAddress)
    , proofOfStake = require(rootPrefix + '/lib/contract_interact/proof_of_stake')
    , gasPrice = 0x174876E800
    , returnTypes = require(rootPrefix + 'lib/global_constant/return_types')
  , proofOfStakeContract = "proofOfStake"
  , proofOfStakeABI = coreAddresses.getAbiForContract(proofOfStakeContract)
  , Tx = require('ethereumjs-tx')
;

const cTable = require('console.table');

web3Provider.eth.getBlock('latest').then((data) => {
    console.log(data);
});

let privateKey = 'c09ef4ab4369aa929c62082cd94a612a612bf5e68e62e9480c9440119bc3063d';


facilitatorContract.events.ProofRequestedEvent(null, function (error, ProofRequestedResult) {
  if(error) {
    console.log("error  ", error);
  }

  printEvent(ProofRequestedResult);

  let currContract = new web3Provider.eth.Contract(proofOfStakeABI);
  transactionObject = currContract.methods.startVoting();
  const startVoting = transactionObject.encodeABI();

  let proofOfStakeAddress = ProofRequestedResult.returnValues._proofOfStake;
  registerEvents(proofOfStakeAddress, proofOfStakeABI);

  executeTransaction(proofOfStakeAddress, startVoting).then(() => {
    transactionObject = currContract.methods.performVerification(true);
    const performVerification = transactionObject.encodeABI();
    executeTransaction(proofOfStakeAddress, performVerification).then(() => {
      transactionObject = currContract.methods.finalize();
      const finalize = transactionObject.encodeABI();
      executeTransaction(proofOfStakeAddress, finalize).then(() => {
      });
    });
  });
});


function registerEvents(address, abi) {
  let posContract = new web3Provider.eth.Contract(abi, address);
  posContract.events.ProofVerificationStarted(null, function (error, result) {
    printEvent(result);
  });
  posContract.events.ProofVerificationDone(null, function (error, result) {
    printEvent(result);
  });
  posContract.events.ProofFinalized(null, function (error, result) {
    printEvent(result);
  });

}

async function executeTransaction(proofOfStakeAddress, encodedABI) {


  const account = web3Provider.eth.accounts.privateKeyToAccount(privateKey.indexOf('0x') === 0 ? privateKey : '0x' + privateKey);

  const parameter = {
    from: account.address,
    to: proofOfStakeAddress,
    data: encodedABI//'0x1ec6b60a'
  };

  return web3Provider.eth.estimateGas(parameter)
    .then((gasLimit) => {
      // Changes may occur at the moment of estimateGas and the moment of sending transaction, so let's give it a margin.
      parameter.gasLimit = web3Provider.utils.toHex(gasLimit + 10000);
      return web3Provider.eth.getGasPrice();
    })
    .then((gasPrice) => {
      parameter.gasPrice = 10000000000;//web3Provider.utils.toHex(gasPrice);
      return web3Provider.eth.getTransactionCount(account.address);
    })
    .then((count) => {
      parameter.nonce = count;
      const transaction = new Tx(parameter);
      transaction.sign(Buffer.from(account.privateKey.replace('0x', ''), 'hex'));
      return web3Provider.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
        .once('transactionHash', (hash) => {
          console.info("\x1b[37m",'transactionHash', 'https://ropsten.etherscan.io/tx/' + hash);
        })
        .once('receipt', (receipt) => {
          // console.info('receipt', receipt);
        })
        /*.on('confirmation', (confirmationNumber, receipt) => {
          console.info('confirmation', confirmationNumber, receipt);
        })*/
        .on('error', (error) => {
          //  console.log("recived error ", error);
        });
    })
    .catch(console.error);
}


function printEvent(event) {
  let eventName = event.event;
  let transactionHash = event.transactionHash;
  let params = event.returnValues;
  console.log("\x1b[32m", "**************************************************************");
  console.log("\n")
  console.log("\x1b[37m", "********" + eventName + "**********");
  console.log("\n")
  //console.log("\x1b[32m", "********" + transactionHash + "**********");
  const table = cTable.getTable(params);
  console.log("\x1b[32m", table);
  console.log("\n")


}



