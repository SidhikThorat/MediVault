// MongoDB Models Index
// This file exports all MongoDB models for easy importing

const DocumentContent = require('./DocumentContent');
const Document = require('./Document');
const AIVector = require('./AIVector');
const Chat = require('./Chat');
const ProcessingJob = require('./ProcessingJob');

module.exports = {
  DocumentContent,
  Document,
  AIVector,
  Chat,
  ProcessingJob
};

