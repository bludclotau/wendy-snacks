function collectProposals(agentOutputs) {
  const proposals = [];

  for (const agent of agentOutputs) {
    if (agent && agent.action) {
      proposals.push({
        agentId: agent.id,
        action: agent.action,
        confidence: typeof agent.confidence === 'number' ? agent.confidence : 0.5,
        rationale: agent.rationale || agent.reason || ''
      });
    }
  }

  return proposals;
}

function normalizeScores(proposals) {
  if (proposals.length === 0) return [];

  const maxConfidence = Math.max(...proposals.map(p => p.confidence));

  return proposals.map(p => ({
    ...p,
    normalizedConfidence: maxConfidence > 0 ? p.confidence / maxConfidence : 0
  }));
}

function computeConsensus(proposals, history = {}) {
  if (proposals.length === 0) return [];

  const normalized = normalizeScores(proposals);

  return normalized.map(p => {
    let score = p.normalizedConfidence * 0.6;

    if (history[p.agentId]) {
      score += history[p.agentId].accuracy * 0.3;
    }

    if (p.action === 'extractAll' || p.action === 'autoExtract') {
      score += 0.1;
    }

    return { ...p, consensusScore: parseFloat(score.toFixed(3)) };
  });
}

function selectWinningAction(consensus) {
  if (consensus.length === 0) return null;

  consensus.sort((a, b) => b.consensusScore - a.consensusScore);

  const winner = consensus[0];

  return {
    action: winner.action,
    agentId: winner.agentId,
    consensusScore: winner.consensusScore,
    rationale: winner.rationale
  };
}

module.exports = {
  collectProposals,
  normalizeScores,
  computeConsensus,
  selectWinningAction
};