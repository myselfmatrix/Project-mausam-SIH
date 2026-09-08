const User = require('../models/User');
const Preference = require('../models/Preference');

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePersona = async (req, res) => {
  try {
    const { userId, persona } = req.body;
    if (!userId || !persona) {
      return res.status(400).json({ error: 'User ID and persona required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { selectedPersona: persona },
      { new: true }
    );

    res.json({
      message: 'Persona updated',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ locations: user.savedLocations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addLocation = async (req, res) => {
  try {
    const { userId, name, lat, lon } = req.body;
    if (!userId || !name || !lat || !lon) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          savedLocations: {
            name,
            coordinates: { lat, lon }
          }
        }
      },
      { new: true }
    );

    res.json({
      message: 'Location added',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
