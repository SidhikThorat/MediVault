const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  walletAddress: { type: String, index: true },
  passwordHash: { type: String },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  lastLogin: { type: Date }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });

// Statics
userSchema.statics.createUser = async function(userData) {
  const { email, walletAddress, password, role = 'patient', profile = {} } = userData;
  let passwordHash = null;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }
  return this.create({ email, walletAddress, passwordHash, role, profile });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

userSchema.statics.findByWalletAddress = function(walletAddress) {
  return this.findOne({ walletAddress });
};

// Methods
userSchema.methods.updateFields = async function(updates) {
  const allowed = new Set(['email', 'walletAddress', 'role', 'status', 'profile', 'isVerified', 'verificationToken', 'resetToken', 'resetTokenExpires']);
  Object.entries(updates).forEach(([k, v]) => { if (allowed.has(k)) this[k] = v; });
  await this.save();
  return this;
};

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

