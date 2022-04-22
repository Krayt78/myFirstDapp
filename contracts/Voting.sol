// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;
import "@openzeppelin/contracts/access/Ownable.sol";


contract Voting is Ownable {

    // arrays for draw, uint for single
    // uint[] winningProposalsID;
    // Proposal[] public winningProposals;
    uint public winningProposalID;
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum  WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public workflowStatus;
    Proposal[] proposalsArray;
    mapping (address => Voter) voters;

    /**
     * @dev Emitted when 'voterAddress' address is registered in the whitelist by the admin.
     */
    event VoterRegistered(address voterAddress); 
    /**
     * @dev Emitted when 'currentWorkflowStatus' is set from 'previousStatus' to 'newStatus'.
     */
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    /**
     * @dev Emitted when proposal 'proposalId' is registered in the proposal array 'proposals'.
     */
    event ProposalRegistered(uint proposalId);
    /**
     * @dev Emitted when voter 'voter' voted for a proposal 'proposalId'.
     */
    event Voted (address voter, uint proposalId);

    /**
     * @dev Modifier that checks if the message sender 'msg.sender' is Registered.
     */
    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, "You're not a voter");
        _;
    }
    
    // on peut faire un modifier pour les états

    // ::::::::::::: GETTERS ::::::::::::: //

    /**
     * @dev Returns Voter from its address '_addr'.
     *
     * Requirements:
     * - 'msg.sender' needs to be a voter.
     */
    function getVoter(address _addr) external onlyVoters view returns (Voter memory) {
        return voters[_addr];
    }

    /**
     * @dev Returns a proposal from its id '_id'.
     *
     * Requirements:
     * - 'msg.sender' needs to be a voter.
     */
    function getOneProposal(uint _id) external onlyVoters view returns (Proposal memory) {
        return proposalsArray[_id];
    }

 
    // ::::::::::::: REGISTRATION ::::::::::::: // 

    /**
     * @dev Set Voter's address '_addr' as registered.
     *
     * Requirements:
     * - 'currentWorkflowStatus' needs to be equal to 'WorkflowStatus.RegisteringVoters'.
     * - 'address' needs to not be whitelisted yet.
     * - 'msg.sender' must be the owner.
     *
     *  Emits a {VoterRegistered} event.
     */
    function addVoter(address _addr) external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet');
        require(voters[_addr].isRegistered != true, 'Already registered');
    
        voters[_addr].isRegistered = true;
        emit VoterRegistered(_addr);
    }
 
    /* facultatif
     * function deleteVoter(address _addr) external onlyOwner {
     *   require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet');
     *   require(voters[_addr].isRegistered == true, 'Not registered.');
     *   voters[_addr].isRegistered = false;
     *  emit VoterRegistered(_addr);
    }*/

    // ::::::::::::: PROPOSAL ::::::::::::: // 

    /**
     * @dev Add a proposal in the proposal array 'proposalsArray' with a description '_desc' and no votes.
     *
     * Requirements:
     * - 'currentWorkflowStatus' needs to be equal to 'WorkflowStatus.ProposalsRegistrationStarted'.
     * - 'msg.sender' needs to be a voter.
     * - '_desc' cannot be empty
     *
     *  Emits a {ProposalRegistered} event with the proposal's ID.
     */
    function addProposal(string memory _desc) external onlyVoters {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Proposals are not allowed yet');
        require(keccak256(abi.encode(_desc)) != keccak256(abi.encode("")), 'Vous ne pouvez pas ne rien proposer'); // facultatif
        // voir que desc est different des autres

        Proposal memory proposal;
        proposal.description = _desc;
        proposalsArray.push(proposal);
        emit ProposalRegistered(proposalsArray.length-1);
    }

    // ::::::::::::: VOTE ::::::::::::: //

    /**
     * @dev Vote for a proposition with the ID '_id'.
     *
     * Requirements:
     * - 'currentWorkflowStatus' needs to be equal to 'WorkflowStatus.VotingSessionStarted'.
     * - 'msg.sender' needs to not have voted yet.
     * - 'msg.sender' needs to be a voter.
     * - 'proposalID' needs to be != 0 and < proposals.length.
     *
     *  Emits a {Voted} event with the message sender's address and the proposal's ID.
     */
    function setVote( uint _id) external onlyVoters {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        require(voters[msg.sender].hasVoted != true, 'You have already voted');
        require(_id < proposalsArray.length, 'Proposal not found'); // pas obligé, et pas besoin du >0 car uint

        voters[msg.sender].votedProposalId = _id;
        voters[msg.sender].hasVoted = true;
        proposalsArray[_id].voteCount++;

        if (proposalsArray[_id].voteCount > proposalsArray[winningProposalID].voteCount) {
            winningProposalID = _id;
        }

        emit Voted(msg.sender, _id);
    }

    // ::::::::::::: STATE ::::::::::::: //

    /* on pourrait factoriser tout ça: par exemple:
    *
    *  modifier checkWorkflowStatus(uint  _num) {
    *    require (workflowStatus=WorkflowStatus(uint(_num)-1), "bad workflowstatus");
    *    require (_num != 5, "il faut lancer tally votes");
    *    _;
    *  }
    *
    *  function setWorkflowStatus(uint _num) public checkWorkflowStatus(_num) onlyOwner {
    *    WorkflowStatus old = workflowStatus;
    *    workflowStatus = WorkflowStatus(_num);
    *    emit WorkflowStatusChange(old, workflowStatus);
    *   } 
    *
    *  ou plus simplement:
    *  function nextWorkflowStatus() onlyOwner{
    *    require (uint(workflowStatus)!=4, "il faut lancer tallyvotes");
    *    WorkflowStatus old = workflowStatus;
    *    workflowStatus= WorkflowStatus(uint (workflowStatus) + 1);
    *    emit WorkflowStatusChange(old, workflowStatus);
    *  }
    *
    */ 

    /**
     * @dev Sets 'currentWorkflowStatus' from 'WorkflowStatus.RegisteringVoters' to 'WorkflowStatus.ProposalsRegistrationStarted'. 
     *  Emits a {WorkflowStatusChange} event for each address whitelisted.
     */
    function startProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Registering proposals cant be started now');
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    /**
     * @dev Sets 'currentWorkflowStatus' from 'WorkflowStatus.ProposalsRegistrationStarted' to 'WorkflowStatus.ProposalsRegistrationEnded'. 
     *  Emits a {WorkflowStatusChange} event.
     */
    function endProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Registering proposals havent started yet');
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    /**
     * @dev Sets 'currentWorkflowStatus' from 'WorkflowStatus.ProposalsRegistrationEnded' to 'WorkflowStatus.VotingSessionStarted'. 
     *  Emits a {WorkflowStatusChange} event.
     */
    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, 'Registering proposals phase is not finished');
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    /**
     * @dev Sets 'currentWorkflowStatus' from 'WorkflowStatus.VotingSessionStarted' to 'WorkflowStatus.VotingSessionEnded'. 
     *  Emits a {WorkflowStatusChange} event.
     */
    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    /* function tallyVotesDraw() external onlyOwner {
       require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Current status is not voting session ended");
        uint highestCount;
        uint[5]memory winners; // egalite entre 5 personnes max
        uint nbWinners;
        for (uint i = 0; i < proposalsArray.length; i++) {
            if (proposalsArray[i].voteCount == highestCount) {
                winners[nbWinners]=i;
                nbWinners++;
            }
            if (proposalsArray[i].voteCount > highestCount) {
                delete winners;
                winners[0]= i;
                highestCount = proposalsArray[i].voteCount;
                nbWinners=1;
            }
        }
        for(uint j=0;j<nbWinners;j++){
            winningProposalsID.push(winners[j]);
            winningProposals.push(proposalsArray[winners[j]]);
        }
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    } */

    /**
     * @dev Counts all the votes to set the winningProposal's ID. 
     * After that changes 'currentWorkflowStatus' to 'WorkflowStatus.VotesTallied'.
     *
     * Requirements:
     * - 'currentWorkflowStatus' needs to be equal to 'WorkflowStatus.VotingSessionEnded'.
     * - 'msg.sender' must be the owner.
     */

   function tallyVotes() external onlyOwner {
       require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Current status is not voting session ended");
       workflowStatus = WorkflowStatus.VotesTallied;
       emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
}