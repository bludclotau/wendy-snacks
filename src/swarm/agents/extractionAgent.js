const { BaseAgent } = require('./baseAgent');

class ExtractionAgent extends BaseAgent {
  constructor() {
    super('extraction');
  }

  proposeAction(context) {
    const { goal } = context;
    if (!goal) return null;

    if (/temperature|forecast|weather/i.test(goal)) {
      return {
        action: {
          action: 'startExtractionTask',
          schema: ['date', 'minTemp', 'maxTemp', 'description']
        },
        reason: 'Need structured schema for weather extraction',
        confidence: 0.7
      };
    }

    return null;
  }
}

module.exports = { ExtractionAgent };