const { BaseAgent } = require('./baseAgent');

class DebugAgent extends BaseAgent {
  constructor() {
    super('debug');
  }

  proposeAction(context) {
    const { lastError } = context;
    if (!lastError) return null;

    if (/selectorIndex/i.test(lastError)) {
      return {
        action: {
          action: 'screenshot',
          params: {}
        },
        reason: 'Capture screenshot to support selector repair',
        confidence: 0.8
      };
    }

    return null;
  }
}

module.exports = { DebugAgent };