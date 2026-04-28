function makeVotingCoordinatorAgent() {
  return {
    id: 'votingCoordinator',
    role: 'Coordinate multi-agent decision-making',
    decide(ctx) {
      return {
        action: { action: 'runVotingProtocol' },
        confidence: 1.0,
        reason: 'Coordinate multi-agent decision-making'
      };
    }
  };
}

module.exports = {
  makeVotingCoordinatorAgent
};