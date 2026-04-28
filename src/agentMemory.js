class AgentMemory {
  constructor() {
    this.domHistory = [];
    this.selectorMap = new Map();
    this.visitedUrls = new Set();
    this.lastAction = null;
    this.goalProgress = {};
    this.lastInferredSchema = null;
    this.lastGeneratedPlugin = null;
  }

  addDomSnapshot(snapshot) {
    this.domHistory.push(snapshot);
  }

  rememberSelector(index, selector) {
    this.selectorMap.set(index, selector);
  }

  getSelector(index) {
    return this.selectorMap.get(index);
  }

  markVisited(url) {
    this.visitedUrls.add(url);
  }

  hasVisited(url) {
    return this.visitedUrls.has(url);
  }

  setProgress(key, value) {
    this.goalProgress[key] = value;
  }

  getProgress(key) {
    return this.goalProgress[key];
  }
}

module.exports = { AgentMemory };