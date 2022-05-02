const {
  getLatestBlock,
  addBlockToChain,
  replaceChain,
  getBlockchain,
} = require("./Blockchain");
const { getTransactionPool } = require("./TransactionPool");

module.exports = {
  connectToPeers,
  broadcastTransactionPool,
  broadcastLatest,
  initP2PServer,
  getSockets,
};
