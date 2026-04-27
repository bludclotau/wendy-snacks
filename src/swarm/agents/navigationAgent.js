const { BaseAgent } = require('./baseAgent');

class NavigationAgent extends BaseAgent {
  constructor() {
    super('navigation');
  }

  proposeAction(context) {
    const { lastObservation, goal } = context;
    if (!goal) return null;

    if (!lastObservation) {
      return {
        action: {
          action: 'extractAll',
          params: {}
        },
        reason: 'Need initial DOM snapshot',
        confidence: 0.6
      };
    }

    return null;
  }
}

module.exports = { NavigationAgent };