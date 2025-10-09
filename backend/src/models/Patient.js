const mongoose = require('mongoose');

const IdentifierSchema = new mongoose.Schema({
  system: { type: String }, // e.g., 'MRN', 'HospitalID'
  type: { type: String },
  value: { type: String }
}, { _id: false });

const PatientSchema = new mongoose.Schema({
  patientId: { type: String, index: true, unique: true },
  name: { type: String }, // encrypt at rest via app/driver
  dob: { type: Date },
  gender: { type: String },
  identifiers: { type: [IdentifierSchema], default: [] },
  contact: {
    phone: { type: String },
    email: { type: String }
  },
  primaryDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  consent: {
    forResearch: { type: Boolean, default: false },
    consentDate: { type: Date }
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'patients'
});

PatientSchema.index({ patientId: 1 }, { unique: true });
PatientSchema.index({ primaryDoctorId: 1 });
PatientSchema.index({ updatedAt: -1 });

// Unique per system+value if provided
PatientSchema.index({ 'identifiers.system': 1, 'identifiers.value': 1 });

module.exports = mongoose.model('Patient', PatientSchema);


