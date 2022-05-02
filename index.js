const dotenv = require("dotenv").config();
const express = require("express");
// const bodyParser = require('body-parser')
const {
  getBlockchain,
  generateNextBlock,
  getUnspentTxOuts,
  generateNextBlockWithTransaction,
  getMyUnspentTransactionOutputs,
  generateRawNextBlock,
  getAccountBalance,
  getSockets,
  initP2PServer,
  connectToPeers,
  getSenderSockets,
  initUISocketServer,
  getPeerHttpPortList,
  sendTransaction,
  transactionHistory,
  broadcastNewTransactionHistory,
  broadcast,
} = require("./src/Blockchain");
const { initWallet, getPublicFromWallet } = require("./src/Wallet");
const _ = require("lodash");
const { getTransactionPool } = require("./src/TransactionPool");
const cors = require("cors");
const { io } = require("socket.io-client");
const { default: axios } = require("axios");

const httpPort = process.env.HTTP_PORT;
const p2pPort = process.env.P2P_PORT;
const uiSocketPort = process.env.UI_SOCKET_PORT;
const superNodeHttpPort = process.env.SUPER_NODE_PORT;

const initHttpServer = (httpPort) => {
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use((error, req, res, next) => {
    res.status(400).send(error.message);
  });

  /**
   * Get all block
   */
  app.get("/blocks", (req, res) => {
    res.send(getBlockchain());
  });

  /**
   * Get the block if the node knows the hash of that block
   */
  app.get("/blocks/:hash", (req, res) => {
    const block = _.find(getBlockchain(), {
      hash: req.params.hash,
    });

    res.send(block);
  });

  /**
   * Get the transaction with specific id
   */
  app.get("/transaction/:id", (req, res) => {
    const transaction = _(getBlockchain())
      .map((blocks) => blocks.data)
      .flatten()
      .find({
        id: req.params.id,
      });

    res.send(transaction);
  });

  /**
   * Get all unspent transaction out with the address given
   */
  app.get("/address/:address", (req, res) => {
    const unspentTxOuts = _.filter(
      getUnspentTxOuts(),
      (uTxO) => uTxO.address === req.params.address
    );

    res.send({ unspentTxOuts: unspentTxOuts });
  });

  /**
   * Get all unspent transaction out
   */
  app.get("/unspentTransactionOutputs", (req, res) => {
    res.send(getUnspentTxOuts());
  });

  /**
   * Get all unspent transaction out owned by the wallet
   */
  app.get("/myUnspentTransactionOutputs", (req, res) => {
    res.send(getMyUnspentTransactionOutputs());
  });

  /**
   * Mine a new block
   */
  app.post("/mineBlock", (req, res) => {
    const newBlock = generateNextBlock();

    if (newBlock === null) {
      res.status(400).send("could not generate block");
    } else {
      res.send(newBlock);
    }
  });

  /**
   * Mine a new raw block
   */
  app.post("/mineRawBlock", (req, res) => {
    if (req.body.data == null) {
      res.send("Missing data");
      return;
    }

    const newBlock = generateRawNextBlock(req.body.data);

    if (newBlock === null) {
      res.status(400).send("Could not generate block");
    } else {
      res.send(newBlock);
    }
  });

  /**
   * Get the balance of the wallet
   * ! Maybe will put in the client?
   */
  app.get("/balance", (req, res) => {
    const balance = getAccountBalance();
    res.send({ balance: balance });
  });

  /**
   * Get the address (public key)
   */
  app.get("/address", (req, res) => {
    const address = getPublicFromWallet();
    res.send({ address: address });
  });

  /**
   * Mine the transaction, Typically, when someone wants to include
   *  a transaction to the blockchain (= send coins to some address)
   *  he broadcasts the transaction to the network and hopefully
   *  some node will mine the transaction to the blockchain.
   *
   * Mine the transaction (which means add the transaction to the blockchain)
   */
  app.post("/mineTransaction", (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;
    try {
      const resp = generateNextBlockWithTransaction(address, amount);
      res.send(resp);
    } catch (e) {
      console.log(e.message);
      res.status(400).send(e.message);
    }
  });

  /**
   * Send the transaction info - address (public key) & amount
   * --> transaction outputs
   */
  app.post("/sendTransaction", (req, res) => {
    try {
      const address = req.body.address;
      const amount = req.body.amount;

      if (address === undefined || amount === undefined) {
        throw Error("invalid address or amount");
      }
      const resp = sendTransaction(address, amount);
      resp.sender = getPublicFromWallet();
      resp.receiver = address;
      resp.completeStatus = false;
      res.send(resp);

      transactionHistory.push(resp);
      let message = broadcastNewTransactionHistory(resp);
      broadcast(message);
    } catch (e) {
      console.log(e.message);
      res.status(400).send(e.message);
    }
  });

  /**
   * Get transaction pool info
   */
  app.get("/transactionPool", (req, res) => {
    res.send(getTransactionPool());
  });

  /**
   * Get all p2p sockets
   */
  app.get("/peers", (req, res) => {
    console.log("Get peers");
    // res.send(getSockets().map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    // let list = getSockets().map(s => s.handshake.headers.host);
    // let list = getSenderSockets().map(s => s.io.uri);
    let list = getPeerHttpPortList();

    console.log("List = " + list);
    res.send(list);
  });

  app.get("/senderSockets", (req, res) => {
    console.log("Get sender sockets");
    res.send(getSenderSockets().map((s) => s.io.uri));
  });

  app.post("/addPeer", (req, res) => {
    console.log("Add peers");
    // console.log(req);

    connectToPeers(req.body.peer, req.body.httpPort);
    res.send();
  });

  app.post("/stop", (req, res) => {
    res.send({ msg: "stopping server" });
    process.exit();
  });

  app.post("/initWallet", (req, res) => {
    console.log("privateKey", req.body.privateKey);
    const check = initWallet(req.body.privateKey);
    if (check === true) {
      res.status(200).send("Init successfully");
    } else {
      res.status(400).send("Incorrect private key");
    }
  });

  app.get("/logout", (req, res) => {
    res.send();
  });

  app.get("/getTransactionHistory", (req, res) => {
    res.status(200).send(transactionHistory);
  });

  app.listen(httpPort, () => {
    console.log("App is listening http on port: " + httpPort);
  });
};

const getPeerFromSuperNode = async () => {
  await axios
    .get("http://localhost:" + superNodeHttpPort + "/peers")
    .then((res) => {
      if (res.status === 200) {
        console.log("Connecting to peers");
        console.log(res.data);
        // setP2pAddress(res.data);
        console.log(res.data.length);
        for (let i = 0; i < res.data.length; ++i) {
          if (
            res.data[i] !== "http://localhost:" + httpPort &&
            res.data[i] !== "http://localhost:" + superNodeHttpPort
          ) {
            addPeer(res.data[i]);
          }
        }
      } else {
        console.log("Fail to connect to peers");
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

const addPeer = async (address) => {
  if (superNodeHttpPort === httpPort) {
    return;
  }

  await axios
    .post(address + "/addPeer", {
      peer: p2pPort,
      httpPort: httpPort,
    })
    .then((res) => {
      if (res.status === 200) {
        console.log("Add peer");
        console.log(res.data);
      } else {
        console.log("Fail to add peers");
      }
    })
    .catch((error) => {
      console.log(error);
    });
  // connectToPeers(p2pPort, httpPort);
};
const initConnect = async () => {
  await addPeer("http://localhost:" + superNodeHttpPort);
  await getPeerFromSuperNode();
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
initUISocketServer(uiSocketPort);
initConnect();
