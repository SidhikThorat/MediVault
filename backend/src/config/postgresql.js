// PostgreSQL config removed in Mongo-only setup
module.exports = {
  connect: async () => { throw new Error('PostgreSQL disabled'); },
  disconnect: async () => {},
  query: async () => { throw new Error('PostgreSQL disabled'); },
  transaction: async () => { throw new Error('PostgreSQL disabled'); },
  healthCheck: async () => ({ status: 'disabled' })
};

