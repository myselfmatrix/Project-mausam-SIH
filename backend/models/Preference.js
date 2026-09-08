const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  persona: {
    type: String,
    enum: ['health', 'fitness', 'beach', 'travel', 'parent', 'gardener', 'commuter', 'event'],
    required: true
  },
  notifications: {
    airQuality: Boolean,
    weatherAlerts: Boolean,
    uvIndex: Boolean,
    pollutionAlerts: Boolean
  },
  units: {
    temperature: { type: String, enum: ['C', 'F'], default: 'C' },
    wind: { type: String, enum: ['km/h', 'mph'], default: 'km/h' }
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Preference', preferenceSchema);
