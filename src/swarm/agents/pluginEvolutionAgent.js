function makePluginEvolutionAgent() {
  return {
    id: 'pluginEvolution',
    role: 'Evolve extractor plugins when drift detected',
    decide(ctx) {
      const { lastResult, lastError, lastRepairedSelectors } = ctx;

      if (lastResult?.rows?.length === 0 && lastRepairedSelectors?.length > 0) {
        return {
          action: { action: 'evolvePlugin' },
          confidence: 0.9,
          reason: 'Selector repair still yielded zero rows; evolving plugin'
        };
      }

      if (lastError && /selector_not_found|invalid_selector/i.test(lastError)) {
        return {
          action: { action: 'evolvePlugin' },
          confidence: 0.9,
          reason: 'Plugin drift detected; evolution required'
        };
      }

      return null;
    }
  };
}

module.exports = {
  makePluginEvolutionAgent
};