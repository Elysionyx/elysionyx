// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ElysioRegistry
 * @notice On-chain registry for agent reputation on Base.
 * @dev Deployed on Base Sepolia. Scores are calculated from task and gauntlet results.
 *
 * Tier thresholds:
 *   0   — 399  : Asphodel (tier 0)
 *   400 — 799  : Elysian  (tier 1)
 *   800+       : Isle of the Blessed (tier 2)
 */
contract ElysioRegistry {

    // ────────────────────────────────────────────────────────────────────────
    // Structs
    // ────────────────────────────────────────────────────────────────────────

    struct AgentRecord {
        bool registered;
        string metadataURI;
        uint256 tasksCompleted;
        uint256 tasksFailed;
        uint256 gauntletsPassed;
        uint256 gauntletsFailed;
        uint256 registeredAt;
    }

    // ────────────────────────────────────────────────────────────────────────
    // State
    // ────────────────────────────────────────────────────────────────────────

    address public owner;
    mapping(address => AgentRecord) private agents;
    address[] private agentIndex;

    // ────────────────────────────────────────────────────────────────────────
    // Events
    // ────────────────────────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent, uint256 timestamp);
    event TaskRecorded(address indexed agent, bool passed, uint256 timestamp);
    event GauntletRecorded(address indexed agent, bool passed, uint256 timestamp);

    // ────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ────────────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "ElysioRegistry: caller is not owner");
        _;
    }

    modifier onlyRegistered(address agent) {
        require(agents[agent].registered, "ElysioRegistry: agent not registered");
        _;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Constructor
    // ────────────────────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Registration
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register an agent with a metadata URI.
     * @param agent     The agent's wallet address.
     * @param metadataURI  IPFS or HTTPS URI pointing to off-chain metadata.
     */
    function registerAgent(address agent, string calldata metadataURI) external {
        require(!agents[agent].registered, "ElysioRegistry: already registered");
        require(bytes(metadataURI).length > 0, "ElysioRegistry: empty metadataURI");

        agents[agent] = AgentRecord({
            registered: true,
            metadataURI: metadataURI,
            tasksCompleted: 0,
            tasksFailed: 0,
            gauntletsPassed: 0,
            gauntletsFailed: 0,
            registeredAt: block.timestamp
        });
        agentIndex.push(agent);

        emit AgentRegistered(agent, block.timestamp);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Task & Gauntlet Recording
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @notice Record the result of a task for a registered agent.
     * @dev Only callable by contract owner (server wallet).
     */
    function recordTaskResult(address agent, bool passed)
        external
        onlyOwner
        onlyRegistered(agent)
    {
        if (passed) {
            agents[agent].tasksCompleted += 1;
        } else {
            agents[agent].tasksFailed += 1;
        }
        emit TaskRecorded(agent, passed, block.timestamp);
    }

    /**
     * @notice Record the result of a gauntlet for a registered agent.
     * @dev Only callable by contract owner (server wallet).
     */
    function recordGauntletResult(address agent, bool passed)
        external
        onlyOwner
        onlyRegistered(agent)
    {
        if (passed) {
            agents[agent].gauntletsPassed += 1;
        } else {
            agents[agent].gauntletsFailed += 1;
        }
        emit GauntletRecorded(agent, passed, block.timestamp);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Reads
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @notice Compute and return an agent's current reputation score and tier.
     * @param agent The agent address to query.
     * @return score  Computed reputation score.
     * @return tier   0 = Asphodel, 1 = Elysian, 2 = Isle of the Blessed.
     */
    function getReputation(address agent)
        external
        view
        returns (uint256 score, uint8 tier)
    {
        AgentRecord storage r = agents[agent];
        if (!r.registered) {
            return (0, 0);
        }

        // base_score = (tasks_completed * 10) + (gauntlets_passed * 50) - (tasks_failed * 15)
        uint256 positive = (r.tasksCompleted * 10) + (r.gauntletsPassed * 50);
        uint256 penalty  = r.tasksFailed * 15;
        score = positive > penalty ? positive - penalty : 0;

        if (score >= 800) {
            tier = 2; // Isle of the Blessed
        } else if (score >= 400) {
            tier = 1; // Elysian
        } else {
            tier = 0; // Asphodel
        }
    }

    /**
     * @notice Return raw record data for an agent.
     */
    function getAgent(address agent)
        external
        view
        returns (AgentRecord memory)
    {
        return agents[agent];
    }

    /**
     * @notice Return all registered agent addresses.
     * @dev Iterate off-chain; do not call this in a gas-sensitive context.
     */
    function getAllAgents() external view returns (address[] memory) {
        return agentIndex;
    }

    /**
     * @notice Return the total number of registered agents.
     */
    function totalAgents() external view returns (uint256) {
        return agentIndex.length;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Admin
    // ────────────────────────────────────────────────────────────────────────

    /**
     * @notice Transfer contract ownership.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ElysioRegistry: zero address");
        owner = newOwner;
    }
}
