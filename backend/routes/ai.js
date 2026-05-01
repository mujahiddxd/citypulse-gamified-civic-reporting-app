/**
 * routes/ai.js — AI Garbage Photo Analysis
 * ------------------------------------------
 * Uses the HuggingFace Inference API (free tier) to classify
 * uploaded images and detect whether they contain garbage/trash.
 *
 * Routes (all under /api/ai):
 *   POST /analyze-garbage  → Analyze an image for garbage content
 *
 * The AI does NOT auto-reject. It provides an advisory verdict:
 *   - verified = true/false (AI opinion)
 *   - confidence percentage
 *   - severity estimate (Low/Medium/High)
 *   - statement (human-readable summary)
 *
 * The user can STILL submit even if AI says "not garbage" — they
 * just get a warning. The admin always has the final say.
 *
 * Two verification modes are supported (set on the complaint record):
 *   - "ai_only"    → AI checks, admin can see + override
 *   - "ai_admin"   → Both AI + admin must verify
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// ── Garbage-related ImageNet labels ────────────────────────────────────────────
// COMPREHENSIVE list covering ALL types of garbage — from a single bottle to
// massive landfills. Uses EXACT full-label matching on comma-separated sub-labels.
const GARBAGE_LABELS_EXACT = new Set([
  // ── Direct garbage / waste containers ──
  'ashcan', 'trash can', 'garbage can', 'wastebasket', 'waste container',
  'dumpster', 'dustbin', 'ash bin', 'ash-bin', 'ashbin',
  'trash barrel', 'trash bin', 'wastebin', 'dustcart',
  'garbage truck', 'refuse truck', 'waste truck',
  // ── Bags ──
  'plastic bag', 'garbage bag', 'trash bag', 'bin bag', 'bin liner',
  // ── Bottles (littered) ──
  'pop bottle', 'soda bottle', 'water bottle', 'beer bottle',
  'wine bottle', 'bottle', 'beer glass',
  // ── Cans ──
  'tin can', 'beer can', 'soda can',
  // ── Containers / packaging ──
  'crate', 'carton', 'cardboard', 'cardboard box',
  'packet', 'wrapper', 'packaging',
  'bucket', 'pail',
  // ── Disposable items / litter ──
  'diaper', 'nappy', 'nappie', 'napkin',
  'toilet tissue', 'toilet paper', 'bathroom tissue', 'paper towel',
  'tissue', 'facial tissue',
  'band aid', 'bandaid',
  'syringe', 'needle',
  'mask', 'face mask',
  'straw', 'drinking straw',
  'cigarette', 'cigarette butt', 'ashtray',
  'swab', 'cotton swab',
  // ── Rubber / tires (illegal dumping) ──
  'tire', 'tyre', 'rubber tire',
  // ── Broken / discarded objects ──
  'wreck', 'rubble', 'scrap',
  'shopping cart', 'shopping basket',
  // ── Waste environments ──
  'landfill', 'junkyard', 'scrapyard', 'wrecking yard',
  'compost', 'sludge', 'sewage',
  // ── Street / drain indicators ──
  'manhole cover', 'storm drain', 'gutter', 'drain',
  // ── Food waste (when discarded) ──
  'banana peel', 'apple core', 'food waste',
  'plate', 'paper plate', 'styrofoam',
  'cup', 'paper cup', 'disposable cup',
]);

// Labels that PARTIALLY indicate garbage when a sub-label CONTAINS these keywords.
// Broader coverage for catching any garbage-related classification.
const GARBAGE_HINTS = [
  // Core garbage terms
  'trash', 'garbage', 'waste', 'rubbish', 'litter', 'refuse',
  'dump', 'junk', 'debris', 'scrap', 'wreck',
  // Containers
  'dustbin', 'ashcan', 'wastebasket', 'dumpster', 'dustcart',
  'trash can', 'trash bin', 'waste bin', 'garbage can',
  // Bags
  'plastic bag', 'garbage bag', 'trash bag',
  // Bottles / cans (litter)
  'soda bottle', 'pop bottle', 'beer bottle', 'water bottle',
  'tin can', 'beer can',
  // Environmental
  'landfill', 'junkyard', 'scrapyard', 'compost', 'sewage', 'sludge',
  // Disposables
  'diaper', 'nappy', 'tissue', 'paper towel', 'syringe',
  'cigarette', 'straw',
  // Packaging
  'cardboard', 'carton', 'wrapper', 'packaging',
  // Vehicles
  'garbage truck', 'refuse truck', 'dustcart',
];

// ── NOT-GARBAGE blocklist ──────────────────────────────────────────────────────
// Labels that should NEVER count as garbage, even if they partially match.
// This prevents false positives from stationery, furniture, food, etc.
const NOT_GARBAGE_LABELS = new Set([
  // Stationery / office
  'binder', 'ring binder', 'ring-binder', 'notebook', 'envelope',
  'ballpoint', 'ballpoint pen', 'ballpen', 'biro',
  'fountain pen', 'pencil', 'rubber eraser', 'pencil eraser',
  'ruler', 'paper clip', 'stapler', 'pencil box', 'pencil case',
  'desk', 'file', 'folder', 'letter opener',
  // Books / paper
  'book', 'book jacket', 'comic book', 'menu', 'newspaper',
  'crossword puzzle', 'jigsaw puzzle', 'web site',
  // Electronics
  'laptop', 'desktop computer', 'monitor', 'keyboard', 'mouse',
  'cell phone', 'cellphone', 'cellular telephone', 'remote control',
  'iPod', 'notebook computer', 'screen', 'television',
  // Clothing
  'jersey', 't-shirt', 'jean', 'shoe', 'running shoe',
  'sock', 'suit', 'shirt', 'coat', 'jacket',
  // Furniture / home
  'desk', 'table', 'chair', 'couch', 'bed', 'pillow',
  'bookcase', 'bookshelf', 'wardrobe', 'cabinet',
  // Food (fresh / prepared — not waste)
  'pizza', 'hamburger', 'hotdog', 'ice cream', 'cake',
  'banana', 'apple', 'orange', 'lemon', 'pineapple',
  'plate', 'bowl', 'cup', 'coffee mug', 'wine glass',
  // Vehicles
  'car', 'bus', 'truck', 'bicycle', 'motorcycle',
  // Animals
  'dog', 'cat', 'bird', 'fish',
  // Nature
  'tree', 'flower', 'grass', 'mountain', 'lake',
]);

/**
 * Calculate garbage confidence from HuggingFace classification results.
 * Uses STRICT matching to avoid false positives.
 * Returns { isGarbage, confidence, topLabels, severity, statement }
 */
function analyzeClassificationResults(results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return {
      isGarbage: false,
      confidence: 0,
      topLabels: [],
      severity: null,
      statement: 'Could not analyze the image. Please try again.',
    };
  }

  let garbageScore = 0;
  const topLabels = [];
  const matchedLabels = [];

  for (const item of results) {
    const fullLabel = (item.label || '').toLowerCase().trim();
    const score = item.score || 0;

    topLabels.push({ label: item.label, score: Math.round(score * 100) });

    // ImageNet labels often come as comma-separated alternatives
    // e.g. "garbage truck, dustcart" or "ashcan, trash can, garbage can"
    // Split them and check EACH individual term
    const subLabels = fullLabel.split(',').map(s => s.trim()).filter(Boolean);

    let hasGarbageMatch = false;
    let isOnlyNonGarbage = true;

    for (const sub of subLabels) {
      // Check if this sub-label is a garbage indicator
      const isExact = GARBAGE_LABELS_EXACT.has(sub);
      const isHint = GARBAGE_HINTS.some(hint => sub.includes(hint));

      if (isExact || isHint) {
        hasGarbageMatch = true;
        isOnlyNonGarbage = false;
        break; // One garbage match is enough
      }

      // Check if this sub-label is clearly NOT garbage
      const isBlocked = NOT_GARBAGE_LABELS.has(sub);
      if (!isBlocked) {
        isOnlyNonGarbage = false; // Unknown label — don't auto-block
      }
    }

    // If ANY sub-label matches garbage → count it (even if other sub-labels are non-garbage)
    // This ensures "garbage truck, dustcart" is counted as garbage
    if (hasGarbageMatch) {
      // Check if it's an exact match (stronger signal)
      const hasExact = subLabels.some(s => GARBAGE_LABELS_EXACT.has(s));
      if (hasExact) {
        garbageScore += score * 1.5;
      } else {
        garbageScore += score * 1.0;
      }
      matchedLabels.push(item.label);
    }
    // If ALL sub-labels are known non-garbage → skip (no score added)
    // If mixed unknown → also skip (no score added, no penalty)
  }

  // Normalize to 0-100 range (cap at 100)
  const confidence = Math.min(Math.round(garbageScore * 100), 100);
  // 30% threshold — balanced between catching real garbage and avoiding false positives
  const isGarbage = confidence >= 30;

  // Determine severity based on confidence
  let severity = null;
  if (isGarbage) {
    if (confidence >= 75) severity = 'High';
    else if (confidence >= 55) severity = 'Medium';
    else severity = 'Low';
  }

  // Generate human-readable statement
  let statement;
  if (isGarbage) {
    if (confidence >= 75) {
      statement = 'Significant garbage accumulation detected in the image. Immediate attention recommended.';
    } else if (confidence >= 55) {
      statement = 'Garbage or waste materials detected in the image. Area appears to need cleaning.';
    } else {
      statement = 'Possible garbage/litter detected in the image. Minor waste visible.';
    }
  } else {
    statement = 'This image does not appear to contain garbage or waste. You can still submit if you believe this is a valid garbage report.';
  }

  return {
    isGarbage,
    confidence,
    topLabels: topLabels.slice(0, 5),
    matchedLabels: matchedLabels.slice(0, 5),
    severity,
    statement,
  };
}

// ── POST /api/ai/analyze-garbage ────────────────────────────────────────────
// Receives a base64-encoded image, sends it to HuggingFace for classification,
// and returns a garbage verification result.
//
// Body: { image: "data:image/jpeg;base64,..." }
// Returns: { verified, confidence, severity, statement, labels, mode }
router.post('/analyze-garbage', authenticate, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const HF_API_KEY = process.env.HF_API_KEY;

    // If no API key is configured, return a "manual review" fallback
    if (!HF_API_KEY) {
      console.warn('⚠️  HF_API_KEY not set — AI analysis unavailable, falling back to admin review');
      return res.json({
        verified: null,
        confidence: 0,
        severity: null,
        statement: 'AI analysis is currently unavailable. Your report will be reviewed manually by an admin.',
        labels: [],
        mode: 'admin_fallback',
        ai_available: false,
      });
    }

    // Extract raw base64 data (strip the data:image/...;base64, prefix)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Call HuggingFace Serverless Inference API
    // Using router.huggingface.co (the new endpoint, replacing deprecated api-inference.huggingface.co)
    const hfResponse = await fetch(
      'https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      }
    );

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error('HuggingFace API error:', hfResponse.status, errText);

      // Model might be loading (cold start) — return loading status
      if (hfResponse.status === 503) {
        return res.json({
          verified: null,
          confidence: 0,
          severity: null,
          statement: 'AI model is warming up. Please try again in 20-30 seconds.',
          labels: [],
          mode: 'model_loading',
          ai_available: false,
        });
      }

      // Other API errors — fallback to admin review
      return res.json({
        verified: null,
        confidence: 0,
        severity: null,
        statement: 'AI analysis temporarily unavailable. Your report will be reviewed by an admin.',
        labels: [],
        mode: 'admin_fallback',
        ai_available: false,
      });
    }

    const classificationResults = await hfResponse.json();
    const analysis = analyzeClassificationResults(classificationResults);

    res.json({
      verified: analysis.isGarbage,
      confidence: analysis.confidence,
      severity: analysis.severity,
      statement: analysis.statement,
      labels: analysis.topLabels,
      matched_labels: analysis.matchedLabels,
      mode: 'ai_analyzed',
      ai_available: true,
    });

  } catch (err) {
    console.error('AI analysis error:', err);
    // Graceful degradation — never block the user
    res.json({
      verified: null,
      confidence: 0,
      severity: null,
      statement: 'AI analysis encountered an error. Your report will be reviewed manually by an admin.',
      labels: [],
      mode: 'admin_fallback',
      ai_available: false,
    });
  }
});

module.exports = router;
