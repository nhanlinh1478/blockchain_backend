const _ = require("lodash");
const {
  validateTransaction,
  Transaction,
  TxIn,
  UnspentTxOut,
} = require("./transaction");

/**
 * @type {Transaction[]}
 * List of transaction
 */
let transactionPool = [];

const getTransactionPool = () => {
  return _.cloneDeep(transactionPool);
};

const addToTransactionPool = (tx, unspentTxOuts) => {
  if (!validateTransaction(tx, unspentTxOuts)) {
    throw Error("Validate transaction: Trying to add invalid tx to pool");
  }

  if (!isValidTxForPool(tx, transactionPool)) {
    throw Error("Valid transaction for pool: Trying to add invalid tx to pool");
  }

  console.log("adding to txPool: %s", JSON.stringify(tx));
  transactionPool.push(tx);
};

const hasTxIn = (txIn, unspentTxOuts) => {
  const foundTxIn = unspentTxOuts.find((uTxO) => {
    return uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex;
  });
  return foundTxIn !== undefined;
};

const updateTransactionPool = (unspentTxOuts) => {
  const invalidTxs = [];
  for (const tx of transactionPool) {
    for (const txIn of tx.txIns) {
      if (!hasTxIn(txIn, unspentTxOuts)) {
        invalidTxs.push(tx);
        break;
      }
    }
  }
  if (invalidTxs.length > 0) {
    console.log(
      "removing the following transactions from txPool: %s",
      JSON.stringify(invalidTxs)
    );
    transactionPool = _.without(transactionPool, ...invalidTxs);
  }
};

const getTxPoolIns = (aTransactionPool) => {
  return _(aTransactionPool)
    .map((tx) => tx.txIns)
    .flatten()
    .value();
};

const isValidTxForPool = (tx, aTransactionPool) => {
  const txPoolIns = getTxPoolIns(aTransactionPool);

  const containsTxIn = (txIns, txIn) => {
    return _.find(txIns, (txPoolIn) => {
      return (
        txIn.txOutIndex === txPoolIn.txOutIndex &&
        txIn.txOutId === txPoolIn.txOutId
      );
    });
  };

  for (const txIn of tx.txIns) {
    if (containsTxIn(txPoolIns, txIn)) {
      console.log("txIn already found in the txPool");
      return false;
    }
  }
  return true;
};

module.exports = {
  addToTransactionPool,
  getTransactionPool,
  updateTransactionPool,
};
