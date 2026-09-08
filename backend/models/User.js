const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  selectedPersona: {
    type: String,
    enum: ['health', 'fitness', 'beach', 'travel', 'parent', 'gardener', 'commuter', 'event'],
    default: null
  },
  location: {
    type: String,
    default: null
  },
  savedLocations: [{
    name: String,
    coordinates: {
      lat: Number,
      lon: Number
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
