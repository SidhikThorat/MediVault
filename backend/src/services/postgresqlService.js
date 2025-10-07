// PostgreSQL service removed in Mongo-only setup
module.exports = {
  connect: async () => { throw new Error('PostgreSQL disabled'); },
  disconnect: async () => {},
  healthCheck: async () => ({ status: 'disabled' })
};

