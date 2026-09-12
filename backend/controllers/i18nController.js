const { getCatalog, getEtag, listLanguages } = require('../i18n');
const { LANGUAGE_CODES, normalizeLanguage } = require('../i18n/languages');

/*
  Translation endpoints.

  Both are public: the language switcher has to work on the marketing pages,
  before anyone has an account. Catalogs are immutable between deploys, so they
  are served with an ETag and a long max-age — after the first visit a language
  switch costs a 304, not a re-download.
*/

/** GET /api/i18n/languages */
exports.getLanguages = (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ languages: listLanguages(), default: 'en' });
};

/** GET /api/i18n/:lang */
exports.getTranslations = (req, res) => {
  const requested = req.params.lang;
  const code = normalizeLanguage(requested);

  // Say so rather than silently serving English under the wrong name — a
  // client asking for "xx" should be able to tell it didn't get "xx".
  if (code !== String(requested || '').toLowerCase()) {
    return res.status(404).json({
      error: `Unsupported language "${requested}"`,
      supported: LANGUAGE_CODES,
    });
  }

  const payload = getCatalog(code);
  const etag = getEtag(code);

  if (etag) {
    res.set('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
  }
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(payload);
};
