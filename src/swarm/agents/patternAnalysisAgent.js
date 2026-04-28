function makePatternAnalysisAgent() {
  return {
    id: 'patternAnalysis',
    role: 'Analyze fused datasets for patterns, trends, and anomalies',
    decide(ctx) {
      const { goal, fusionResult, extractionState } = ctx;

      if (!goal) return null;

      const query = goal.toLowerCase();
      const analyticalKeywords = [
        'trend', 'pattern', 'compare', 'correlation', 'average',
        'anomaly', 'spike', 'drop', 'movement', 'volatility',
        'forecast', 'prediction', 'growth', 'decline'
      ];

      const hasAnalyticalIntent = analyticalKeywords.some(k => query.includes(k));
      if (!hasAnalyticalIntent) return null;

      if (extractionState && extractionState.done) {
        return {
          action: { action: 'analyzePatterns' },
          confidence: 0.9,
          reason: 'User requested analytical operation on extracted data'
        };
      }

      return null;
    }
  };
}

module.exports = {
  makePatternAnalysisAgent
};