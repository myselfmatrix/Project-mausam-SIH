const express = require('express');
const router = express.Router();
const { getLanguages, getTranslations } = require('../controllers/i18nController');

// Public on purpose: the language switcher lives in the marketing navbar, so
// it has to work before anyone has signed in.
router.get('/languages', getLanguages);
router.get('/:lang', getTranslations);

module.exports = router;
