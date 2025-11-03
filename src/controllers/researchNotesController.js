const { getFirestore, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// POST /research-notes/:ticker - Add a research note for a ticker
const addResearchNote = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Placeholder until auth is wired
    const { ticker } = req.params;
    const { note } = req.body;

    if (!ticker || typeof ticker !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Valid ticker is required'
      });
    }

    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Note text is required'
      });
    }

    const normalizedTicker = ticker.toUpperCase();
    const noteId = uuidv4();
    const now = new Date();

    const docRef = db
      .collection('research_notes')
      .doc(userId)
      .collection('notes')
      .doc(normalizedTicker);

    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      await docRef.set({
        ticker: normalizedTicker,
        notes: [
          {
            id: noteId,
            text: note.trim(),
            created_at: now
          }
        ],
        created_at: now,
        last_updated: now
      });
    } else {
      await docRef.update({
        notes: admin.firestore.FieldValue.arrayUnion({
          id: noteId,
          text: note.trim(),
          created_at: now
        }),
        last_updated: now
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Research note added successfully',
      data: {
        id: noteId,
        ticker: normalizedTicker,
        text: note.trim(),
        created_at: now
      }
    });
  } catch (error) {
    console.error('Error in addResearchNote:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /research-notes/:ticker - Get research notes for a ticker
const getResearchNotes = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Placeholder until auth is wired
    const { ticker } = req.params;

    if (!ticker || typeof ticker !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Valid ticker is required'
      });
    }

    const normalizedTicker = ticker.toUpperCase();

    const docRef = db
      .collection('research_notes')
      .doc(userId)
      .collection('notes')
      .doc(normalizedTicker);

    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(200).json({
        status: 'success',
        data: [],
        ticker: normalizedTicker,
        count: 0
      });
    }

    const data = docSnap.data();
    const notes = Array.isArray(data.notes) ? data.notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];

    return res.status(200).json({
      status: 'success',
      data: notes,
      ticker: normalizedTicker,
      count: notes.length
    });
  } catch (error) {
    console.error('Error in getResearchNotes:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  addResearchNote,
  getResearchNotes
};


