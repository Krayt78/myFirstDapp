import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Voting from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import "./App.css";
import Proposal from './Proposal.js'

class App extends Component {
  state = { web3: null, isAdmin: false, isVoter:false, accounts: null, connectedAccount: 0, workflowStatus:"", contract: null, proposals:null, winner:null};

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
      console.log(owner);

      let workflowStatusTemp = await instance.methods.workflowStatus().call({from: accounts[0]});
      let workflowStatus = this.convertWorkflowStatus(workflowStatusTemp);

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
      this.setState({ web3, isAdmin, isVoter, accounts, connectedAccount: accounts[0], workflowStatus, contract: instance}, this.runInit);
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
          let winningproposal = await contract.methods.winningProposalID().call({from: accounts[0]}); 
          let proposal = await this.getProposalWithParam(winningproposal); 
          let proposalToString = 'Proposal ID : '+winningproposal+" / Description : "+ proposal[0]+ " / Vote Count : "+ proposal[1];
          this.setState({winner:proposalToString});
        break;
  
        case 5: 
        // would have reset
        break;
  
        default :
          console.log("Shouldnt Happen");
        break;

    }

          workflowStatusTemp = await contract.methods.workflowStatus().call({from: accounts[0]});
          workflowStatusTemp = this.convertWorkflowStatus(workflowStatusTemp);
          console.log(workflowStatusTemp);
          this.setState({workflowStatus:workflowStatusTemp});
  };

  getVoter = async() => {
    const { accounts, contract } = this.state;
    let address = document.getElementById("getVoterAddress").value;

    if(address){
      try{
        let voter = await contract.methods.getVoter(address).call({from: accounts[0]});
        console.log('Voter Address : '+address+" / isRegistered : "+ voter[0]+ " / hasVoted : "+ voter[1]+" / Voted Proposal ID : "+ voter[2]);
        window.alert('Voter Address : '+address+" / isRegistered : "+ voter[0]+ " / hasVoted : "+ voter[1]+" / Voted Proposal ID : "+ voter[2])
      }
      catch(error){
        const stringError = error.message;
  
        if(stringError.indexOf("You're not a voter") !== -1){
          this.state.isVoter = false;
        }

      }
    }
  }

  setVote = async() => {
    const { accounts, contract } = this.state;
    let id=document.getElementById("voteForID").value;

    if(id){
      await contract.methods.setVote(id).send({from: accounts[0]});
      console.log("voted");
      this.refreshProposalList();
    }
  }

  addVoter = async() => {
    const { accounts, contract } = this.state;
    let address=document.getElementById("addVoterAddress").value;

    if(address){
      await contract.methods.addVoter(address).send({from: accounts[0]});
      console.log("added voter");

      if(address===accounts[0]){
        this.setState({isVoter:true});
      }
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

        return proposal;
      }
      catch(error){
        const stringError = error.message;
  
        if(stringError.indexOf("You're not a voter") !== -1){
        }

      }
    }
  }

  getProposalWithParam = async(proposalID) => {
    const { accounts, contract } = this.state;
    if(proposalID){
      try{
        let proposal = await contract.methods.getOneProposal(proposalID).call({from: accounts[0]});
        console.log(proposal);

        return proposal;
      }
      catch(error){
        const stringError = error.message;
  
        if(stringError.indexOf("You're not a voter") !== -1){
        }

      }
    }
  }

  refreshProposalList = async() => {
    const { contract, proposals } = this.state;
    
    let options = {
      fromBlock: 0,                  //Number || "earliest" || "pending" || "latest"
      toBlock: 'latest'
    };

    let proposalEvents = await contract.getPastEvents('ProposalRegistered', options);
    console.table(proposalEvents);

    let proposalArray = [];

    for (let i = 0; i < proposalEvents.length; i++) {
      let proposalID = proposalEvents[i].returnValues[0];
      let proposal = await this.getProposalWithParam(proposalID);
      const arrayElement = [proposalID,proposal[0],proposal[1]];
      proposalArray.push(arrayElement);
      console.table(arrayElement);
    }
    proposalEvents.forEach(async element => {
      
    });
    console.table(proposalArray);

    this.setState({proposals:proposalArray});
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

    const addVoterRender = (
        <div className="AddVoter" >
          <p>Hi Admin, You can AddVoter:          
            <br />
            <input type="text" id="addVoterAddress" placeholder="Voter Address"/>
            <br />
            <button onClick={this.addVoter}>Add Voter</button>
          </p>
        </div>
    );
    const getVoterRender = (
    <div className="GetVoter" >
          <p>Get a Voter:          
            <br />
            <input type="text" id="getVoterAddress" placeholder="Voter Address"/>
            <br />
            <button onClick={this.getVoter}>Get Voter</button>
          </p>
        </div>
    );

    const testComponent = (
      <div className="Proposal" >
          <Proposal id={0} description={"test"} voterCount={"0"}></Proposal>
      </div>
    );

    const setVoteRender =(
      <div className="SetVote" >
            <p>Vote for proposal number:
            <br />
            <input type="text" id="voteForID" placeholder="Proposal ID"/>
            <br />
            <button onClick={this.setVote}>Vote</button>    
            </p>
          </div>
    );

    const isVoterRenderHello = (
        <div className="isAVoter" >
          <p>You are a Voter !     
          </p>
        </div>
    );

    const addProposalRender = (
          <div className="AddProposal" >
            <p>Add a Proposal
            <br />
            <input type="text" id="proposal" placeholder="proposal description"/>
            <br />
            <button onClick={this.addProposal}>AddProposal</button>    
            </p>
          </div>
    );

    const getProposalRender = (
          <div className="GetProposal" >
              <p>Get a proposal 
              <br />
              <input type="text" id="proposalID" placeholder="proposal ID"/>
              <br />
              <button onClick={this.getProposal}>GetProposal</button>   
              </p>
          </div>
    );

    const testMap = (
      <div className="ProposalMap" >
          {this.state.proposals && this.state.proposals.map((proposal) => (
            <Proposal id={proposal[0]} description={proposal[1]} voterCount={proposal[2]}></Proposal>
          ))}
      </div>
    );

    const refreshButton = (
      <div className="Refresh" >
            <button onClick={this.refreshProposalList}>Refresh Proposal List</button>    
      </div>
    );

    const workflowButton = (
      <div className="WorkflowButton" >
              <button onClick={this.switchNextWorkflowStatus}>Next Workflow</button>  
      </div>
    );

    const showwinner = (
      <div className="showwinner" >
              <h2>Winner is : {this.state.winner}</h2>  
      </div>
    );

    return(
      <div className="App" >
          <div className="Top">
                <p className="Title">Voting System</p>
                <p className="MetamaskAccount"> Metamask account : {this.state.connectedAccount}</p>
          </div>

          <div className="WorkflowStatus" >
            <p>
              WorkflowStatus : {this.state.workflowStatus}      
            </p>
          </div>

        {this.state.isAdmin ? isAdminRenderHello : <div></div>}
        {this.state.isVoter ? isVoterRenderHello : <div></div>}
        {this.state.isAdmin ? workflowButton : <div></div>}

        {this.state.isAdmin && this.state.workflowStatus === "RegisteringVoters" ? addVoterRender : <div></div>}
        {this.state.isVoter && this.state.workflowStatus === "ProposalsRegistrationStarted" ? addProposalRender : <div></div>}
        {this.state.isVoter && this.state.workflowStatus === "VotingSessionStarted"  ? setVoteRender : <div></div>}

        {this.state.isVoter ? getProposalRender : <div></div>}
        {this.state.isVoter ? getVoterRender : <div></div>}
        {this.state.isVoter ? refreshButton : <div></div>}
        {this.state.isVoter ? testMap : <div></div>}

        {this.state.workflowStatus === "VotesTallied"  ? showwinner : <div></div>}

        {this.proposals}

      </div>

    );
    
  }
}

export default App;
