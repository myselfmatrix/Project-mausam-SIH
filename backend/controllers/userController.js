const User = require('../models/User');

/*
  Every handler here takes the account id from the verified JWT (req.userId),
  never from the request body. Trusting a body-supplied userId would let any
  caller read or modify any other account just by changing a string.
*/

const VALID_PERSONAS = [
  'health', 'fitness', 'beach', 'travel',
  'parent', 'gardener', 'commuter', 'event'
];

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json(user.toPublicJSON());
  } catch (error) {
    console.error('getProfile failed:', error);
    res.status(500).json({ error: 'Could not load your profile.' });
  }
};

exports.updatePersona = async (req, res) => {
  try {
    const { persona } = req.body;
    if (!persona) {
      return res.status(400).json({ error: 'A persona is required.' });
    }
    if (!VALID_PERSONAS.includes(persona)) {
      return res.status(400).json({ error: `Unknown persona "${persona}".` });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { selectedPersona: persona },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    res.json({ message: 'Persona updated', ...user.toPublicJSON() });
  } catch (error) {
    console.error('updatePersona failed:', error);
    res.status(500).json({ error: 'Could not save your persona.' });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json({ locations: user.savedLocations });
  } catch (error) {
    console.error('getLocations failed:', error);
    res.status(500).json({ error: 'Could not load your locations.' });
  }
};

exports.addLocation = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const { lat, lon } = req.body;

    // Number.isFinite, not a truthiness check — lat/lon of 0 are real places.
    if (!name || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
      return res.status(400).json({ error: 'A name, latitude and longitude are all required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $push: { savedLocations: { name, coordinates: { lat: Number(lat), lon: Number(lon) } } } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    res.status(201).json({ message: 'Location added', locations: user.savedLocations });
  } catch (error) {
    console.error('addLocation failed:', error);
    res.status(500).json({ error: 'Could not save that location.' });
  }
};
