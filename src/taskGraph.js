class TaskGraph {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.current = null;
  }

  addNode(type, data = {}) {
    const id = this.nodes.length;
    this.nodes.push({ id, type, data, status: 'pending' });
    if (this.current === null) this.current = id;
    return id;
  }

  addEdge(from, to) {
    this.edges.push({ from, to });
  }

  markDone(id) {
    const n = this.nodes.find(x => x.id === id);
    if (n) n.status = 'done';
  }

  next() {
    const cur = this.nodes.find(n => n.id === this.current);
    if (!cur) return null;
    const out = this.edges.filter(e => e.from === cur.id);
    for (const e of out) {
      const n = this.nodes.find(x => x.id === e.to);
      if (n && n.status === 'pending') return n;
    }
    return null;
  }

  moveTo(id) {
    this.current = id;
  }

  getState() {
    return {
      nodes: this.nodes,
      edges: this.edges,
      current: this.current
    };
  }
}

module.exports = { TaskGraph };