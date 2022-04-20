import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Voting from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import "./App.css";
import Proposal from './Proposal.js'

class App extends Component {
  state = { web3: null, isAdmin: false, isVoter:false, accounts: null, connectedAccount: 0, workflowStatus:"", contract: null, proposals:null};

  componentWillMount = async () => {
    try {
      // Récupérer le provider web3
      const web3 = await getWeb3();
  
      // Utiliser web3 pour récupérer les comptes de l’utilisateur (MetaMask dans notre cas) 
      const accounts = await web3.eth.getAccounts();

      // Récupérer l’instance du smart contract “Whitelist” avec web3 et les informations du déploiement du fichier (client/src/contracts/Whitelist.json)
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Voting.networks[networkId];
  
      const instance = new web3.eth.Contract(
        Voting.abi,
        deployedNetwork && deployedNetwork.address,
      );

      const owner = await instance.methods.owner().call();
      let isAdmin = accounts[0] === owner;

      let workflowStatusTemp = await instance.methods.workflowStatus().call({from: accounts[0]});
      let workflowStatus = this.convertWorkflowStatus(workflowStatusTemp);

      let options = {
        fromBlock: 0,                  //Number || "earliest" || "pending" || "latest"
        toBlock: 'latest'
      };

      let proposals = await instance.getPastEvents('ProposalRegistered', options);

      console.table(proposals);

      proposals.forEach(element => {
        console.log(element.returnValues[0]);
      });

      let isVoter = false;

      try{
        let isAVoter = await instance.methods.getVoter(accounts[0]).call({from: accounts[0]});
        isVoter = isAVoter[0];
        console.log(isAVoter[0]);
      }
      catch (error){
        const stringError = error.message;
  
        if(stringError.indexOf("You're not a voter") !== -1){
          isVoter = false;
        }
      }

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, isAdmin, isVoter, accounts, connectedAccount: accounts[0], workflowStatus, contract: instance, proposals}, this.runInit);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Non-Ethereum browser detected. Can you please try to install MetaMask before starting.`,
      );
      console.error(error);
    }
  };

  runInit = async() => {
    this.updateWorflowStatus();
    this.updateIsVoterStatus();
  }; 

  updateIsVoterStatus = async() =>{
    const { contract, accounts} = this.state;

    try{
      let isAVoter = await contract.methods.getVoter(accounts[0]).call({from: accounts[0]});
      this.state.isVoter = isAVoter[0];
      console.log(isAVoter[0]);
    }
    catch (error){
      const stringError = error.message;

      if(stringError.indexOf("You're not a voter") !== -1){
        this.state.isVoter = false;
      }
    }
    
  }

  updateWorflowStatus = async() =>{
    const { contract, accounts} = this.state;
    let workflowStatusTemp = await contract.methods.workflowStatus().call({from: accounts[0]});
    console.log("WorkflowStatusTemp : "+workflowStatusTemp);
    this.state.workflowStatus = this.convertWorkflowStatus(workflowStatusTemp);
  }

  convertWorkflowStatus = (status) =>{
    let result = "";
    console.log(typeof(+status));
    switch(+status){
      case 0: 
        result = "RegisteringVoters";
      break;

      case 1: 
        result = "ProposalsRegistrationStarted";
      break;

      case 2: 
        result = "ProposalsRegistrationEnded";
      break;

      case 3: 
        result = "VotingSessionStarted";
      break;

      case 4: 
        result = "VotingSessionEnded";
      break;

      case 5: 
        result = "VotesTallied";
      break;

      default :
        result ="Shouldnt Happen";
      break;
    }
    console.log(result);
    return result;
  }; 

  switchNextWorkflowStatus = async() =>{
    const { contract, accounts} = this.state;
    let workflowStatusTemp = await contract.methods.workflowStatus().call({from: accounts[0]});

    switch(+workflowStatusTemp){
        case 0: 
          await contract.methods.startProposalsRegistering().send({from: accounts[0]});
        break;
  
        case 1: 
          await contract.methods.endProposalsRegistering().send({from: accounts[0]});
        break;
  
        case 2: 
          await contract.methods.startVotingSession().send({from: accounts[0]});
        break;
  
        case 3: 
          await contract.methods.endVotingSession().send({from: accounts[0]});
        break;
  
        case 4: 
          await contract.methods.tallyVotes().send({from: accounts[0]});
        break;
  
        case 5: 
        // would have reset
        break;
  
        default :
          console.log("Shouldnt Happen");
        break;

    }
  };

  getVoter = async() => {
    const { accounts, contract } = this.state;
    let address = document.getElementById("getVoterAddress").value;

    if(address){
      try{
        let voter = await contract.methods.getVoter(address).call({from: accounts[0]});
        console.log(voter);
      }
      catch(error){
        const stringError = error.message;
  
        if(stringError.indexOf("You're not a voter") !== -1){
          this.state.isVoter = false;
        }

      }
    }
  }

  addVoter = async() => {
    const { accounts, contract } = this.state;
    let address=document.getElementById("addVoterAddress").value;

    if(address){
      await contract.methods.addVoter(address).send({from: accounts[0]});
      console.log("added voter");
      let voter = await contract.methods.getVoter(address).call({from: accounts[0]});
      console.log(voter);
    }
  }

  addProposal = async() => {
    const { accounts, contract } = this.state;
    let proposal=document.getElementById("proposal").value;

    if(proposal){
      await contract.methods.addProposal(proposal).send({from: accounts[0]});
      console.log("added proposal");
    }
  }

  getProposal = async() => {
    const { accounts, contract } = this.state;
    let proposalID=document.getElementById("proposalID").value;

    if(proposalID){
      try{
        let proposal = await contract.methods.getOneProposal(proposalID).call({from: accounts[0]});
        console.log(proposal);
        window.alert('Proposal ID : '+proposalID+" / Description : "+ proposal[0]+ " / Vote Count : "+ proposal[1])
      }
      catch(error){
        const stringError = error.message;
  
        if(stringError.indexOf("You're not a voter") !== -1){
        }

      }
    }
  }

  

  
 
  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    const isAdminRenderHello =(
      <div className="IsAdmin" >
        <p>Welcome Admin ! :)      
        </p>
      </div>
    );

    const isAdminRender = (
      <div className="App" >
        <div className="AddVoter" >
          <p>Hi Admin, You can AddVoter:          
            <br />
            <input type="text" id="addVoterAddress" placeholder="Voter Address"/>
            <br />
            <button onClick={this.addVoter}>Add Voter</button>
          </p>
        </div>

        <div className="GetVoter" >
          <p>Hi Admin, You can GetVoter:          
            <br />
            <input type="text" id="getVoterAddress" placeholder="Voter Address"/>
            <br />
            <button onClick={this.getVoter}>Get Voter</button>
          </p>
        </div>

        <br></br>
      </div>
    );

    const testComponent = (
      <div className="Proposal" >
          
          <Proposal id={0} description={"test"}></Proposal>
      </div>
    );
    const isVoterRender = (
      <div className="IsVoter" >
        <div className="isAVoter" >
          <p>You are a Voter !     
          </p>
        </div>
          

          <div className="AddProposal" >
            <p>Add a Proposal
            <br />
            <input type="text" id="proposal" placeholder="proposal description"/>
            <br />
            <button onClick={this.addProposal}>AddProposal</button>    
            </p>
          </div>

          <div className="GetProposal" >
              <p>Get a proposal 
              <br />
              <input type="text" id="proposalID" placeholder="proposal ID"/>
              <br />
              <button onClick={this.getProposal}>GetProposal</button>   
              </p>
          </div>

      </div>
    );

    const testMap = (
      <table>
          {this.state.proposals.map((proposal) => (
            <tr><td>{0}</td><td>{1}</td></tr>
          ))}
        </table>
    );

    const workflowButton = (
      <div className="WorkflowButton" >
              <button onClick={this.switchNextWorkflowStatus}>Next Workflow</button>  
      </div>
    );

    return(
      <div className="App" >
          <div className="Header" style={{display: 'flex'}}>
                <h2 className="Title">Voting System</h2>
                <h2 className="MetamaskAccount"> Metamask account : {this.state.connectedAccount}</h2>
          </div>

          <div className="WorkflowStatus" >
            <p>
              WorkflowStatus : {this.state.workflowStatus}      
            </p>
          </div>

          {workflowButton}

        

        {this.state.isAdmin ? isAdminRenderHello : <div></div>}
        {this.state.isVoter ? isVoterRender : <div></div>}
        {this.state.isAdmin ? isAdminRender : <div></div>}

      </div>

    );
    
  }
}

export default App;
