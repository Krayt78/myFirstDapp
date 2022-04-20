const path = require("path");
const HDWalletProvider = require('@truffle/hdwallet-provider'); 
require('dotenv').config();

module.exports = {
 contracts_build_directory: path.join(__dirname, "client/src/contracts"),
 networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },

    provider: function(){ 
       return new HDWalletProvider(
         '${process.env.MNEMONIC}', 
         'URLRPC/${process.env.INFURA_ID}'
       )
     }, 
     ropsten:{
       provider : function() {return new HDWalletProvider({mnemonic:{phrase:`${process.env.MNEMONIC}`},providerOrUrl:`https://ropsten.infura.io/v3/${process.env.INFURA_ID}`})},
       network_id:3
     },
     kovan:{
       provider : function() {return new HDWalletProvider({mnemonic:{phrase:`${process.env.MNEMONIC}`},providerOrUrl:`https://kovan.infura.io/v3/${process.env.INFURA_ID}`})},
       network_id:42
     },
     Mumbai: {
       provider: function() {
         return new HDWalletProvider(`${process.env.MNEMONIC}`, `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_ID}`)
       },
       network_id: 80001
     },
 },

 // Set default mocha options here, use special reporters etc.
 mocha: {
   // timeout: 100000
 },

 // Configure your compilers
 compilers: {
   solc: {
     version: "0.8.13",
   }
 },
};
