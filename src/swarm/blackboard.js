class Blackboard {
  constructor() {
    this.state = {};
  }

  set(key, value) {
    this.state[key] = value;
  }

  get(key) {
    return this.state[key];
  }

  snapshot() {
    return { ...this.state };
  }
}

module.exports = { Blackboard };