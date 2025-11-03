const express = require('express');
const router = express.Router();
const { addResearchNote, getResearchNotes } = require('../controllers/researchNotesController');

// POST /research-notes/:ticker - Add a note for a ticker
router.post('/:ticker', addResearchNote);

// GET /research-notes/:ticker - Get notes for a ticker
router.get('/:ticker', getResearchNotes);

module.exports = router;



