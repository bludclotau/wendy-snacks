class Planner {
  constructor() {
    this.currentPlan = null;
    this.completed = new Set();
  }

  createPlan(goal) {
    if (this.isExtractionGoal(goal)) {
      return this.createExtractionPlan(goal);
    }
    const plan = [];

    if (/weather/i.test(goal)) {
      plan.push('locate forecast section');
      plan.push('extract temperature range');
      plan.push('extract weather description');
      plan.push('finish');
    } else {
      plan.push('explore page');
      plan.push('extract relevant information');
      plan.push('finish');
    }

    this.currentPlan = plan;
    this.completed.clear();
    return plan;
  }

  isExtractionGoal(goal) {
    return /extract|scrape|collect|gather/i.test(goal || '');
  }

  isMultiPageGoal(goal) {
    return /across multiple pages|all pages|next page|pagination/i.test(goal || '');
  }

  createExtractionPlan(goal) {
    const subgoals = [];
    if (/weather/i.test(goal)) {
      subgoals.push('locate forecast section');
      subgoals.push('extract temperature range');
      subgoals.push('extract weather description');
    } else {
      subgoals.push('build extraction schema');
      if (this.isMultiPageGoal(goal)) {
        subgoals.push('identify pagination controls');
        subgoals.push('iterate pages until done');
      }
      subgoals.push('extract fields into structured result');
    }
    subgoals.push('finish');
    this.currentPlan = subgoals;
    this.completed.clear();
    return subgoals;
  }

  reset() {
    this.completed.clear();
  }

  getNextSubgoal() {
    if (!this.currentPlan) return null;
    for (const sub of this.currentPlan) {
      if (!this.completed.has(sub)) return sub;
    }
    return null;
  }

  markComplete(subgoal) {
    this.completed.add(subgoal);
  }

  isFinished() {
    return (
      this.currentPlan &&
      this.currentPlan.every(s => this.completed.has(s))
    );
  }

  getActionTree(subgoal) {
    switch (subgoal) {
      case 'locate forecast section':
        return [
          'scroll',
          'extract',
          'extractAll',
          'renderedHtml',
          'waitFor',
          'evaluate',
          'click',
          'screenshot',
          'ocr'
        ];
      case 'extract temperature range':
        return ['scroll', 'extract', 'extractAll'];
      case 'extract weather description':
        return ['scroll', 'extract', 'extractAll'];
      default:
        return ['scroll', 'extract', 'click'];
    }
  }

  allowScrollBeforeExtract(subgoal, action) {
    if (subgoal && subgoal.includes('extract') && action.action === 'scroll') {
      return true;
    }
    return false;
  }
}

module.exports = { Planner };