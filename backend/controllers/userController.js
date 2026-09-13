const User = require('../models/User');
const { LANGUAGE_CODES } = require('../i18n/languages');

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

/*
  The account's display language. The client applies its own choice
  immediately and calls this to make it follow the user to their other
  devices, so a failure here is never allowed to block the UI — it just means
  the preference stays local.
*/
exports.updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    if (!language) {
      return res.status(400).json({ error: 'A language is required.' });
    }
    if (!LANGUAGE_CODES.includes(language)) {
      return res.status(400).json({
        error: `Unsupported language "${language}".`,
        supported: LANGUAGE_CODES
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { language },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    res.json({ message: 'Language updated', ...user.toPublicJSON() });
  } catch (error) {
    console.error('updateLanguage failed:', error);
    res.status(500).json({ error: 'Could not save your language.' });
  }
};

/* ------------------------------------------------------------------ */
/* Saved locations                                                     */
/* ------------------------------------------------------------------ */

/*
  Coordinates are the part that has to be right.

  A saved location exists to be turned into a forecast, and the forecast API
  takes nothing but lat/lon - so a row that arrives without a valid pair is
  useless, and is rejected here rather than stored and discovered later as a
  card that will not load.
*/
function sanitiseLocation(input) {
  if (!input || typeof input !== 'object') return null;

  const lat = Number(input.lat ?? input.latitude ?? input.coordinates?.lat);
  const lon = Number(input.lon ?? input.longitude ?? input.coordinates?.lon);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return null;
  if (!Number.isFinite(lon) || Math.abs(lon) > 180) return null;

  const name = String(input.name || '').trim();
  if (!name) return null;

  const str = (value, max) => String(value || '').trim().slice(0, max);

  return {
    name: name.slice(0, 120),
    region: str(input.region, 120),
    country: str(input.country, 120),
    countryCode: str(input.countryCode, 2).toUpperCase(),
    // Only one of the two is ever meaningful; a user-typed label wins, because
    // if they typed one they did not want the seeded category.
    label: str(input.label, 40),
    labelKey: input.label ? '' : str(input.labelKey, 60),
    lat: Math.round(lat * 1e4) / 1e4,
    lon: Math.round(lon * 1e4) / 1e4,
    timezone: str(input.timezone, 60),
  };
}

/* Two saves of "the same place" within ~1 km are the same place. Tapping a
   map twice, or picking a city after a GPS fix, should not produce two cards
   for one location. */
const SAME_PLACE_DEGREES = 0.01;

const isSamePlace = (a, b) =>
  Math.abs(a.lat - b.lat) < SAME_PLACE_DEGREES && Math.abs(a.lon - b.lon) < SAME_PLACE_DEGREES;

/** GET /api/users/locations */
exports.getLocations = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ locations: user.publicLocations(), activeLocation: user.toPublicJSON().activeLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** POST /api/users/locations - add one, ignoring a duplicate of a saved place. */
exports.addLocation = async (req, res) => {
  try {
    const location = sanitiseLocation(req.body);
    if (!location) {
      return res.status(400).json({ error: 'A location needs a name and valid lat/lon' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = user.savedLocations.find((l) => isSamePlace(l, location));
    if (existing) {
      return res.json({ message: 'Location already saved', locations: user.publicLocations() });
    }

    // A generous ceiling that still bounds the document: the bulk weather
    // endpoint accepts 25 points, so a longer list could not be shown live.
    if (user.savedLocations.length >= 25) {
      return res.status(409).json({ error: 'You can save up to 25 locations' });
    }

    user.savedLocations.push(location);
    await user.save();
    res.status(201).json({ message: 'Location added', locations: user.publicLocations() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/users/locations - replace the whole list.
 *
 * The client owns the ordering and the labels, so it sends the list it wants
 * to end up with. Reconciling per-item edits against server ids would be more
 * requests and more ways to disagree, for a list of at most 25 rows.
 */
exports.replaceLocations = async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.locations) ? req.body.locations : null;
    if (!incoming) return res.status(400).json({ error: 'Send { locations: [...] }' });

    const cleaned = [];
    for (const raw of incoming.slice(0, 25)) {
      const location = sanitiseLocation(raw);
      // Skip the unusable rather than reject the batch: one malformed row
      // should not lose the user the other twenty-four.
      if (location && !cleaned.some((l) => isSamePlace(l, location))) cleaned.push(location);
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.savedLocations = cleaned;
    await user.save();
    res.json({ message: 'Locations saved', locations: user.publicLocations(), skipped: incoming.length - cleaned.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** DELETE /api/users/locations/:id */
exports.removeLocation = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const before = user.savedLocations.length;
    user.savedLocations = user.savedLocations.filter((l) => String(l._id) !== String(req.params.id));
    if (user.savedLocations.length === before) {
      return res.status(404).json({ error: 'No saved location with that id' });
    }

    await user.save();
    res.json({ message: 'Location removed', locations: user.publicLocations() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/users/locations/active - set the location the dashboard shows.
 *
 * Does not have to be one of the saved locations: a user can look at a city
 * without keeping it. The legacy `location` string is written in step so
 * anything still reading that field stays correct.
 */
exports.setActiveLocation = async (req, res) => {
  try {
    const location = sanitiseLocation(req.body);
    if (!location) {
      return res.status(400).json({ error: 'A location needs a name and valid lat/lon' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          activeLocation: {
            name: location.name,
            region: location.region,
            country: location.country,
            lat: location.lat,
            lon: location.lon,
            timezone: location.timezone,
          },
          location: location.name,
        },
      },
      { new: true, runValidators: true },
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Active location updated', user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
  PUT /api/users/preferences

  Units, interests and the two connectivity switches. Validated field by field
  and merged rather than replaced, so a client that knows about fewer settings
  than the server cannot wipe the ones it has never heard of.
*/
const TEMP_UNITS = ['C', 'F'];
const SPEED_UNITS = ['km/h', 'mph'];
const KNOWN_INTERESTS = [
  'weatherAlerts', 'airQuality', 'uv', 'rain', 'travel',
  'outdoorActivity', 'commute', 'agriculture', 'marine',
];

exports.updatePreferences = async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};

    if (body.tempUnit !== undefined) {
      if (!TEMP_UNITS.includes(body.tempUnit)) {
        return res.status(400).json({ error: `Unknown temperature unit "${body.tempUnit}".` });
      }
      update['preferences.tempUnit'] = body.tempUnit;
    }
    if (body.speedUnit !== undefined) {
      if (!SPEED_UNITS.includes(body.speedUnit)) {
        return res.status(400).json({ error: `Unknown speed unit "${body.speedUnit}".` });
      }
      update['preferences.speedUnit'] = body.speedUnit;
    }
    if (body.dataSaver !== undefined) update['preferences.dataSaver'] = Boolean(body.dataSaver);
    if (body.followLocation !== undefined) {
      update['preferences.followLocation'] = Boolean(body.followLocation);
    }
    if (body.interests !== undefined) {
      if (!Array.isArray(body.interests)) {
        return res.status(400).json({ error: 'Interests must be a list.' });
      }
      // Unknown ids are dropped rather than rejected: a newer client sending
      // an interest this server does not know about should still be able to
      // save the rest of its settings.
      update['preferences.interests'] = body.interests.filter((i) => KNOWN_INTERESTS.includes(i));
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No preferences to update.' });
    }

    const user = await User.findByIdAndUpdate(req.userId, update, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    res.json({ preferences: user.toPublicJSON().preferences });
  } catch (error) {
    console.error('updatePreferences failed:', error);
    res.status(500).json({ error: 'Could not save your preferences.' });
  }
};
