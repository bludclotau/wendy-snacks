class BaseAgent {
  constructor(name) {
    this.name = name;
  }

  proposeAction(context) {
    return null;
  }
}

module.exports = { BaseAgent };