const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, index: true, unique: true, sparse: true },
  email: { type: String, index: true, unique: true, sparse: true },
  name: { type: String },
  roles: { type: [String], default: [] },
  department: { type: String },
  patientRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  publicKey: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  passwordHash: { type: String },
  authProvider: { type: String, enum: ['password', 'wallet', 'sso', 'otp'], default: 'password' },
  emailVerified: { type: Boolean, default: false },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecretRef: { type: String },
  failedLoginCount: { type: Number, default: 0 },
  lastLogin: { type: Date },
  lastActiveAt: { type: Date }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'users'
});

// Indexes
userSchema.index({ roles: 1 });
userSchema.index({ status: 1, roles: 1 });
userSchema.index({ lastLogin: -1 });

// Statics
userSchema.statics.createUser = async function(userData) {
  const { email, walletAddress, password, roles = [], name, department, patientRef, publicKey, authProvider = 'password' } = userData;
  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }
  return this.create({ email, walletAddress, passwordHash, roles, name, department, patientRef, publicKey, authProvider });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

userSchema.statics.findByWalletAddress = function(walletAddress) {
  return this.findOne({ walletAddress });
};

// Methods
userSchema.methods.verifyPassword = async function(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.updatePassword = async function(newPassword) {
  this.passwordHash = await bcrypt.hash(newPassword, 12);
  await this.save();
  return this;
};

userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
  return this;
};

module.exports = mongoose.model('User', userSchema);

