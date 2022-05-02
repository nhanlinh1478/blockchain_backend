#Blockchain Project - HCMUS - NativeCoin - 18120494
Blockchain demo project with proof of work, written in Javascript - based on naivecoin: https://github.com/lhartikk/naivecoin-ui
reference github: https://github.com/LeTriThong/CacCongNgheMoi_Blockchain

## Features

- Create & Access a wallet with private key
- Mine blocks
- Send transaction
- View latest transactions & blocks

## installation

This project requires [Node.js](https://nodejs.org/) to run.

1. Go to blockchain_backend, create a .env file
   HTTP_PORT=3003 //http port of the node, the frontend project will connect to this in order to get basic info
   P2P_PORT=6003 //p2p port of the node, other node will connect to this
   UI_SOCKET_PORT=5002 //ui port of the node, the frontend project will connect to this in order to receive real-time info
   SUPER_NODE_PORT=3001 //The super node port, it must be the same as HTTP_PORT

```
2. Go to blockchain_frontend folder, create a .env file
```

REACT_APP_HTTP_PORT=3003 //The same port as HTTP_PORT in backend
REACT_APP_P2P_PORT=6003 //The same port as P2P_PORT in backend
REACT_APP_UI_SOCKET_PORT=5002 //The same port as UI_SOCKET_PORT in backend
REACT_APP_SUPER_NODE_PORT=3001 //The super node port
PORT=3008 //Frontend port, the web will run at this port

````
3. Run 2 terminals for the frontend & backend project
**Note: You must run the super node (the one with the `SUPER_NODE_PORT == HTTP_PORT` FIRST**
```sh
cd blockchain_frontend
npm install
npm start
````

```sh
cd blockchain_backend
npm install
npm start
```

Wait for the 2 terminals finish running, then you can use the wallet via
`http://localhost:/` + `PORT` (The `PORT` in .env file in blockchain_frontend project)
