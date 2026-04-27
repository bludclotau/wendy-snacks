const logger = require('../logger.js');

class MessageBus {
  constructor() {
    this.messages = [];
  }

  publish(type, payload) {
    const msg = {
      type,
      payload,
      ts: Date.now()
    };
    this.messages.push(msg);
    logger.debug(false, 'swarm_bus_message', { type, payload });
  }

  getRecent(limit = 50) {
    return this.messages.slice(-limit);
  }
}

module.exports = {
  MessageBus
};