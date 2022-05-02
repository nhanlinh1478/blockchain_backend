const ec = require("elliptic").ec;

const { existsSync, readFileSync, unlinkSync, writeFileSync } = require("fs");
const _ = require("lodash");
const {
  getPublicKey,
  getTransactionId,
  signTxIn,
  Transaction,
  TxIn,
  TxOut,
  UnspentTxOut,
} = require("./Transaction");

const EC = new ec("secp256k1");
const privateKeyLocation = "node/wallet/private_key";

const getPrivateFromWallet = () => {
  const buffer = readFileSync(privateKeyLocation, "utf8");
  return buffer.toString();
};

const getPublicFromWallet = () => {
  const privateKey = getPrivateFromWallet();
  const key = EC.keyFromPrivate(privateKey, "hex");
  return key.getPublic().encode("hex");
};

const generatePrivateKey = () => {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const initWallet = (privateKey) => {
  // // ! Don't override existing private keys
  // if (existsSync(privateKeyLocation)) {
  //     return;
  // }
  // const newPrivateKey = generatePrivateKey();
  console.log("privateKey = " + privateKey);

  if (privateKey.match("^[a-fA-F0-9]+$") === null) {
    console.log("New wallet private key is invalid");
    return false;
  }

  writeFileSync(privateKeyLocation, privateKey);
  console.log("New wallet with private key has been created!");
  return true;
};

const deleteWallet = () => {
  if (existsSync(privateKeyLocation)) {
    unlinkSync(privateKeyLocation);
  }
};

const getBalance = (address, unspentTxOuts) => {
  return _(unspentTxOuts)
    .filter((uTxO) => uTxO.address === address)
    .map((uTxO) => uTxO.amount)
    .sum();
};
/**
 * Return the list of unspent transaction.
 * Example: If a person have 3 unspent transactions, which have 10, 20, 30 coins
 * and want to give 45, it will give all transactions & create new transaction that send back 15
 * @param {number} amount
 * @param {UnspentTxOut[]} myUnspentTxOuts
 * @returns
 */
const findTxOutsForAmount = (amount, myUnspentTxOuts) => {
  let currentAmount = 0;
  const includedUnspentTxOuts = [];
  for (const myUnspentTxOut of myUnspentTxOuts) {
    includedUnspentTxOuts.push(myUnspentTxOut);
    currentAmount = currentAmount + myUnspentTxOut.amount;
    if (currentAmount >= amount) {
      const leftOverAmount = currentAmount - amount;
      return { includedUnspentTxOuts, leftOverAmount };
    }
  }
  const eMsg =
    "Cannot create transaction from the available unspent transaction outputs." +
    " Required amount:" +
    amount +
    ". Available unspentTxOuts:" +
    JSON.stringify(myUnspentTxOuts);
  throw Error(eMsg);
};

const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
  const txOut1 = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [txOut1];
  } else {
    const leftOverTx = new TxOut(myAddress, leftOverAmount);
    return [txOut1, leftOverTx];
  }
};

const createTransaction = (
  receiverAddress,
  amount,
  privateKey,
  unspentTxOuts,
  txPool
) => {
  console.log("txPool: %s", JSON.stringify(txPool));
  console.log("private key: " + privateKey);
  const myAddress = getPublicKey(privateKey);
  console.log("My address: " + myAddress);

  const myUnspentTxOutsA = unspentTxOuts.filter(
    (uTxO) => uTxO.address === myAddress
  );
  console.log("myUnspentTxOutsA");

  console.log(myUnspentTxOutsA);

  const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);
  console.log("myUnspentTxOuts");

  console.log(myUnspentTxOuts);

  const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(
    amount,
    myUnspentTxOuts
  );
  console.log("includedUnspentTxOuts");

  console.log(includedUnspentTxOuts);

  console.log("leftOverAmount");
  console.log(leftOverAmount);

  const toUnsignedTxIn = (unspentTxOut) => {
    const txIn = new TxIn();
    txIn.txOutId = unspentTxOut.txOutId;
    txIn.txOutIndex = unspentTxOut.txOutIndex;
    return txIn;
  };

  const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);
  console.log("unsignedTxIns");

  console.log(unsignedTxIns);

  const tx = new Transaction();
  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
  tx.id = getTransactionId(tx);
  console.log("tx");
  console.log(tx);

  tx.txIns = tx.txIns.map((txIn, index) => {
    txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
    console.log("txIn.signature");
    console.log(txIn.signature);
    return txIn;
  });

  console.log("tx");
  console.log(tx);

  return tx;
};

const findUnspentTxOuts = (ownerAddress, unspentTxOuts) => {
  return _.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);
};

const filterTxPoolTxs = (unspentTxOuts, transactionPool) => {
  const txIns = _(transactionPool)
    .map((tx) => tx.txIns)
    .flatten()
    .value();
  const removable = [];
  for (const unspentTxOut of unspentTxOuts) {
    const txIn = _.find(txIns, (aTxIn) => {
      return (
        aTxIn.txOutIndex === unspentTxOut.txOutIndex &&
        aTxIn.txOutId === unspentTxOut.txOutId
      );
    });

    if (txIn === undefined) {
    } else {
      removable.push(unspentTxOut);
    }
  }

  return _.without(unspentTxOuts, ...removable);
};

module.exports = {
  createTransaction,
  getPublicFromWallet,
  getPrivateFromWallet,
  deleteWallet,
  getBalance,
  generatePrivateKey,
  initWallet,
  findUnspentTxOuts,
};
