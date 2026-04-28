function makeMultiDomainCorrelationAgent() {
  return {
    id: 'multiDomainCorrelation',
    role: 'Correlate time-series across multiple domains',
    decide(ctx) {
      const { goal } = ctx;
      if (!goal) return null;

      const query = goal.toLowerCase();
      const keywords = [
        'compare across', 'cross-site', 'multi-domain',
        'correlate markets', 'compare trends', 'synchronized',
        'asx vs', 'nasdaq vs', 'multi-market'
      ];

      const hasMultiDomainIntent = keywords.some(k => query.includes(k));
      if (!hasMultiDomainIntent) return null;

      return {
        action: { action: 'multiDomainCorrelation' },
        confidence: 0.9,
        reason: 'User requested cross-series temporal analysis'
      };
    }
  };
}

module.exports = {
  makeMultiDomainCorrelationAgent
};