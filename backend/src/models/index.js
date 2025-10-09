// MongoDB Models Index
// This file exports all MongoDB models for easy importing

const User = require('./User');
const Patient = require('./Patient');
const Document = require('./Document');
const AccessRequest = require('./AccessRequest');
const AuditLog = require('./AuditLog');
const TextChunk = require('./TextChunk');
const EmbeddingMap = require('./EmbeddingMap');
const Notification = require('./Notification');

module.exports = {
  User,
  Patient,
  Document,
  AccessRequest,
  AuditLog,
  TextChunk,
  EmbeddingMap,
  Notification
};

