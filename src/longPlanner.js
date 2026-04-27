class LongPlanner {
  constructor() {
    this.navigationTree = [];
    this.branches = {};
    this.strategy = 'explore';
  }

  recordVisit(url) {
    this.navigationTree.push(url);
  }

  recordBranch(url, actions) {
    this.branches[url] = actions;
  }

  setStrategy(mode) {
    this.strategy = mode;
  }

  getStrategy() {
    return this.strategy;
  }

  getBacktrackUrl() {
    if (this.navigationTree.length < 2) return null;
    return this.navigationTree[this.navigationTree.length - 2];
  }
}

module.exports = { LongPlanner };