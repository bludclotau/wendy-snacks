function makeSelectorRepairAgent() {
  return {
    id: 'selectorRepair',
    role: 'Repair broken or outdated selectors',
    decide(ctx) {
      const { lastError, lastResult, semanticTables } = ctx;

      if (lastError && /selector_not_found|invalid_selector/i.test(lastError)) {
        return {
          action: { action: 'repairSelectors' },
          confidence: 0.9,
          reason: 'Broken or outdated selectors detected'
        };
      }

      if (lastResult?.rows?.length === 0 && semanticTables?.matched?.length > 0) {
        return {
          action: { action: 'repairSelectors' },
          confidence: 0.9,
          reason: 'Zero rows but semantic match exists; repairing selectors'
        };
      }

      return null;
    }
  };
}

module.exports = {
  makeSelectorRepairAgent
};