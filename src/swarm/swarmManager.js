const logger = require('../logger.js');
const { buildAgentRegistry } = require('./agentRegistry.js');
const { MessageBus } = require('./messageBus.js');

class SwarmManager {
  constructor() {
    this.bus = new MessageBus();
    this.agents = buildAgentRegistry();
    this.context = {
      goal: null,
      lastObservation: null,
      lastError: null,
      extractionState: null,
      taskGraphState: null,
      inferredSchema: null,
      lastSnapshot: null,
      lastGeneratedPlugin: null,
      siteMemory: null
    };
  }

  updateContext(partial) {
    this.context = {
      ...this.context,
      ...partial
    };

    this.bus.publish('context_update', this.context);
  }

  proposeNextAction() {
    const observation = this.context.lastObservation;
    if (observation) {
      if (observation.type === 'extraction_result') {
        logger.info('temporal_pipeline', { reason: 'Store raw snapshot before analysis', nextAction: 'recordSnapshot' });
        return { action: { action: 'recordSnapshot', context: {} }, chosenBy: 'pipeline', reason: 'Store raw snapshot before analysis' };
      }
      if (observation.type === 'snapshot_recorded') {
        logger.info('temporal_pipeline', { reason: 'Generate multi-resolution compressed series', nextAction: 'compressSeries' });
        return { action: { action: 'compressSeries', context: {} }, chosenBy: 'pipeline', reason: 'Generate multi-resolution compressed series' };
      }
      if (observation.type === 'series_compressed') {
        logger.info('temporal_pipeline', { reason: 'Prune raw snapshots and finalize compressed series', nextAction: 'compactSeries' });
        return { action: { action: 'compactSeries', context: {} }, chosenBy: 'pipeline', reason: 'Prune raw snapshots and finalize compressed series' };
      }
      if (observation.type === 'series_compacted') {
        logger.info('temporal_pipeline', { reason: 'Temporal pipeline complete', nextAction: 'continue' });
        this.context.lastObservation = null;
      }
    }

    const proposals = [];

    for (const agent of this.agents) {
      try {
        const proposal = agent.decide(this.context);
        if (proposal && proposal.action) {
          const confidence = typeof proposal.confidence === 'number' ? proposal.confidence : 0.5;
          const reason = proposal.reason || 'no reason provided';
          proposals.push({
            agentId: agent.id,
            action: proposal.action,
            confidence,
            reason
          });
        }
      } catch (err) {
        logger.warn('swarm_agent_error', { agentId: agent.id, error: err.message });
      }
    }

    if (proposals.length === 0) {
      return null;
    }

    proposals.sort((a, b) => b.confidence - a.confidence);
    const chosen = proposals[0];

    logger.info('swarm_action', {
      chosenBy: chosen.agentId,
      confidence: chosen.confidence,
      reason: chosen.reason,
      action: chosen.action.action
    });

    this.bus.publish('decision', chosen);

    return {
      action: chosen.action,
      chosenBy: chosen.agentId,
      reason: chosen.reason
    };
  }
}

module.exports = {
  SwarmManager
};