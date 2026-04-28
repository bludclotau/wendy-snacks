function makeSchemaInferenceAgent() {
  return {
    id: 'schemaInference',
    role: 'Decide schema/plugin strategy per domain',
    decide(ctx) {
      const { siteMemory, lastExtractionResult, snapshotMeta, goal, lastObservation } = ctx;
      const domain = lastObservation?.url ? new URL(lastObservation.url).hostname.replace(/^www\./, '') : null;

      if (!domain) return null;

      if (siteMemory && siteMemory.hasExtractor) {
        return {
          action: { action: 'autoExtract' },
          confidence: 0.9,
          reason: 'Use site-specific auto-generated extractor'
        };
      }

      if (lastExtractionResult && lastExtractionResult.zeroRows && snapshotMeta) {
        return {
          action: { action: 'inferAndGenerate' },
          confidence: 0.85,
          reason: 'Infer schema + generate plugin for this domain'
        };
      }

      return {
        action: { action: 'extractForecast' },
        confidence: 0.5,
        reason: 'Fallback to default extractor'
      };
    }
  };
}

function buildAgentRegistry() {
  const agents = [
    makeSchemaInferenceAgent(),
    makeNavigatorAgent(),
    makeExtractorAgent(),
    makeFinisherAgent(),
    makeRecoveryAgent()
  ];

  return agents;
}

module.exports = {
  makeSchemaInferenceAgent,
  makeNavigatorAgent,
  makeExtractorAgent,
  makeFinisherAgent,
  makeRecoveryAgent,
  buildAgentRegistry
};