const { Blackboard } = require('./blackboard');
const { NavigationAgent } = require('./agents/navigationAgent');
const { ExtractionAgent } = require('./agents/extractionAgent');
const { DebugAgent } = require('./agents/debugAgent');

class SwarmManager {
  constructor() {
    this.blackboard = new Blackboard();
    this.agents = [
      new NavigationAgent(),
      new ExtractionAgent(),
      new DebugAgent()
    ];
  }

  updateContext(partial) {
    Object.entries(partial || {}).forEach(([k, v]) => {
      this.blackboard.set(k, v);
    });
  }

  getContext() {
    return this.blackboard.snapshot();
  }

  proposeNextAction() {
    const context = this.getContext();
    const proposals = [];

    for (const agent of this.agents) {
      try {
        const proposal = agent.proposeAction(context);
        if (proposal && proposal.action) {
          proposals.push({
            ...proposal,
            chosenBy: agent.name
          });
        }
      } catch (e) {
        // Swallow agent errors; swarm must be robust
      }
    }

    if (proposals.length === 0) return null;

    proposals.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return proposals[0];
  }
}

module.exports = { SwarmManager };