const logger = require('../logger.js');

function makeNavigatorAgent() {
  return {
    id: 'navigator',
    role: 'Navigation and high-level movement',
    decide(ctx) {
      const { lastObservation, goal } = ctx;
      if (!lastObservation || !lastObservation.url) return null;

      const html = lastObservation.html || '';
      if (/forecast/i.test(html) && /adelaide/i.test(html)) {
        return null;
      }

      return null;
    }
  };
}

function makeExtractorAgent() {
  return {
    id: 'extractor',
    role: 'Structured extraction using ExtractionEngine',
    decide(ctx) {
      const { lastObservation, extractionState, goal, siteMemory } = ctx;
      if (!lastObservation) return null;

      if (siteMemory && siteMemory.hasExtractor) {
        return {
          action: { action: 'autoExtract' },
          confidence: 0.8,
          reason: 'Site-specific extractor available'
        };
      }

      if (!extractionState || !extractionState.schema) {
        return {
          action: {
            action: 'startExtractionTask',
            schema: {
              name: 'weather_forecast',
              description: 'Structured weather forecast for Adelaide',
              fields: [
                { name: 'date', type: 'string' },
                { name: 'minTemp', type: 'string' },
                { name: 'maxTemp', type: 'string' },
                { name: 'description', type: 'string' }
              ]
            }
          },
          confidence: 0.7,
          reason: 'Initialize structured extraction for weather forecast'
        };
      }

      if (extractionState && extractionState.schema && !extractionState.done) {
        return {
          action: { action: 'extractForecast' },
          confidence: 0.85,
          reason: 'Extract structured forecast rows'
        };
      }

      return null;
    }
  };
}

function makeSchemaInferenceAgent() {
  return {
    id: 'schemaInference',
    role: 'Decide schema/plugin strategy per domain',
    decide(ctx) {
      const { siteMemory, lastExtractionResult, snapshotMeta, lastObservation, lastError } = ctx;
      const domain = lastObservation?.url ? new URL(lastObservation.url).hostname.replace(/^www\./, '') : null;

      if (!domain) return null;

      if (siteMemory && siteMemory.metadata && siteMemory.metadata.extractorValid === false) {
        return {
          action: { action: 'inferAndGenerate' },
          confidence: 0.85,
          reason: 'Previous extractor invalid, regenerating'
        };
      }

      if (lastError && /sanitization|invalid_plugin/i.test(lastError)) {
        return {
          action: { action: 'inferAndGenerate' },
          confidence: 0.85,
          reason: 'Plugin sanitization failed, retrying inference'
        };
      }

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

function makeFinisherAgent() {
  return {
    id: 'finisher',
    role: 'Decide when to finish the task',
    decide(ctx) {
      const { extractionState, goal } = ctx;
      if (!extractionState) return null;

      if (extractionState.done && extractionState.rows && extractionState.rows.length > 0) {
        return {
          action: {
            action: 'finish',
            message: 'Extraction complete',
            result: {
              rows: extractionState.rows,
              schema: extractionState.schema
            }
          },
          confidence: 0.9,
          reason: 'ExtractionEngine reports done with rows'
        };
      }

      return null;
    }
  };
}

function makeRecoveryAgent() {
  return {
    id: 'recovery',
    role: 'Suggest retries or strategy changes on errors',
    decide(ctx) {
      const { lastError } = ctx;
      if (!lastError) return null;

      const msg = String(lastError || '').toLowerCase();
      if (msg.includes('timeout') || msg.includes('not found')) {
        return {
          action: { action: 'retryWithNewPlan' },
          confidence: 0.8,
          reason: 'Recent error suggests we should reset plan and try a new strategy'
        };
      }

      return null;
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

  logger.info('swarm_registry_initialized', {
    agents: agents.map(a => ({ id: a.id, role: a.role }))
  });

  return agents;
}

module.exports = {
  buildAgentRegistry
};