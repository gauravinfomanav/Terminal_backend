const { getFirestore, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const VALID_ACTIONS = ['Buy', 'Sell', 'Hold', 'Reduce', 'Add'];
const MIN_CONVICTION = 1;
const MAX_CONVICTION = 5;

const cleanNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const cleaned = value.toString().replace(/,/g, '').trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

const validateSupportingReports = (reports) => {
  if (reports === undefined || reports === null) {
    return [];
  }

  if (!Array.isArray(reports)) {
    throw new Error('supporting_reports must be an array of URLs');
  }

  const sanitized = reports.map((report) => {
    if (typeof report !== 'string' || !report.trim()) {
      throw new Error('Each supporting report must be a non-empty string URL');
    }
    return report.trim();
  });

  return sanitized;
};

const parseConviction = (value) => {
  const parsed = cleanNumber(value);

  if (parsed === null) {
    throw new Error('conviction is required and must be a number between 1 and 5');
  }

  if (parsed < MIN_CONVICTION || parsed > MAX_CONVICTION) {
    throw new Error(`conviction must be between ${MIN_CONVICTION} and ${MAX_CONVICTION}`);
  }

  return parsed;
};

// GET /trading-ideas
const getTradingIdeas = async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('trading_ideas')
      .orderBy('created_at', 'desc')
      .get();

    const ideas = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name,
        title: data.title,
        company: data.company,
        ticker: data.ticker,
        r_org: data.r_org || null,
        action: data.action,
        target: data.target,
        current: data.current,
        supporting_reports: data.supporting_reports || [],
        conviction: data.conviction ?? null,
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || null
      };
    });

    res.status(200).json({
      status: 'success',
      data: ideas,
      count: ideas.length
    });
  } catch (error) {
    console.error('Error in getTradingIdeas:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// POST /trading-ideas
const createTradingIdea = async (req, res) => {
  try {
    const db = getFirestore();
    const {
      name,
      title,
      company,
      ticker,
      action,
      target,
      current,
      supporting_reports,
      conviction,
      r_org
    } = req.body;

    if (!name || !title || !company || !action) {
      return res.status(400).json({
        status: 'error',
        message: 'name, title, company, and action are required'
      });
    }

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: `action must be one of: ${VALID_ACTIONS.join(', ')}`
      });
    }

    let reports;
    try {
      reports = validateSupportingReports(supporting_reports);
    } catch (validationError) {
      return res.status(400).json({
        status: 'error',
        message: validationError.message
      });
    }

    let convictionScore;
    try {
      convictionScore = parseConviction(conviction);
    } catch (validationError) {
      return res.status(400).json({
        status: 'error',
        message: validationError.message
      });
    }

    const ideaId = uuidv4();
    const ideaData = {
      name: name.trim(),
      title: title.trim(),
      company: company.trim(),
      ticker: ticker?.trim() || null,
      r_org: r_org?.trim() || null,
      action,
      target: cleanNumber(target),
      current: cleanNumber(current),
      supporting_reports: reports,
      conviction: convictionScore,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('trading_ideas').doc(ideaId).set(ideaData);

    // Fetch the document back to get the actual server timestamps
    const createdDoc = await db.collection('trading_ideas').doc(ideaId).get();
    const createdData = createdDoc.data();

    res.status(201).json({
      status: 'success',
      message: 'Trading idea created successfully',
      data: {
        id: ideaId,
        name: createdData.name,
        title: createdData.title,
        company: createdData.company,
        ticker: createdData.ticker,
        r_org: createdData.r_org || null,
        action: createdData.action,
        target: createdData.target,
        current: createdData.current,
        supporting_reports: createdData.supporting_reports || [],
        conviction: createdData.conviction ?? null,
        created_at: createdData.created_at?.toDate?.()?.toISOString() || null,
        updated_at: createdData.updated_at?.toDate?.()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error in createTradingIdea:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  getTradingIdeas,
  createTradingIdea
};

