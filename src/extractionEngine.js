class ExtractionEngine {
  constructor() {
    this.schema = null;
    this.rows = [];
    this.pageIndex = 0;
    this.done = false;
  }

  start(schema) {
    this.schema = schema;
    this.rows = [];
    this.pageIndex = 0;
    this.done = false;
  }

  add(row) {
    this.rows.push(row);
  }

  nextPage() {
    this.pageIndex += 1;
  }

  markDone() {
    this.done = true;
  }

  getState() {
    return {
      schema: this.schema,
      rows: this.rows,
      pageIndex: this.pageIndex,
      done: this.done
    };
  }
}

module.exports = { ExtractionEngine };