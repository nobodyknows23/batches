// ============================================
// PW PROXY API - TOKEN-FREE VERSION
// ============================================

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================
// YOUR ENROLLED BATCHES (from localStorage)
// ============================================

const ENROLLED_BATCHES = [
  { batchId: '69047c05fc3bb2dd64711bd8', name: 'Harmukh JKBOSE 2026 Class-12th' },
  { batchId: '6779346f920e596fe7f0e247', name: 'Lakshya NEET 2027' }
];

// ============================================
// BATCH API (NO TOKEN REQUIRED)
// ============================================

app.get('/api/batches', (req, res) => {
  res.json({
    success: true,
    data: ENROLLED_BATCHES,
    message: 'Using enrolled batches from localStorage'
  });
});

app.get('/api/batch/:batchId', async (req, res) => {
  const { batchId } = req.params;
  
  // Check cache
  const cached = cache.get(`batch_${batchId}`);
  if (cached) {
    return res.json({ ...cached, _cached: true });
  }

  try {
    const response = await axios.get(
      `https://pwthor.live/api/BatchInfo?BatchId=${batchId}&Type=details`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    if (response.status === 200 && response.data?.success) {
      cache.set(`batch_${batchId}`, response.data);
      return res.json(response.data);
    }

    return res.status(404).json({
      success: false,
      error: 'Batch not found'
    });

  } catch (error) {
    console.error('Error fetching batch:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/subject/:batchId/:subjectId', async (req, res) => {
  const { batchId, subjectId } = req.params;
  const { page = 1 } = req.query;

  try {
    const response = await axios.get(
      `https://pwthor.live/api/SubjectInfo?BatchId=${batchId}&SubjectId=${subjectId}&page=${page}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    if (response.status === 200 && response.data?.success) {
      return res.json(response.data);
    }

    return res.status(404).json({
      success: false,
      error: 'Subject not found'
    });

  } catch (error) {
    console.error('Error fetching subject:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/topic/:batchId/:subjectId/:topicId', async (req, res) => {
  const { batchId, subjectId, topicId } = req.params;
  const { page = 1, contentType = 'videos' } = req.query;

  try {
    const response = await axios.get(
      `https://pwthor.live/api/TopicInfo?BatchId=${batchId}&SubjectId=${subjectId}&TopicId=${topicId}&ContentType=${contentType}&page=${page}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    if (response.status === 200 && response.data?.success) {
      return res.json(response.data);
    }

    return res.status(404).json({
      success: false,
      error: 'Topic not found'
    });

  } catch (error) {
    console.error('Error fetching topic:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    batches: ENROLLED_BATCHES,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 PW Proxy API (Token-Free)');
  console.log('='.repeat(50));
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`📚 Enrolled batches: ${ENROLLED_BATCHES.length}`);
  console.log('='.repeat(50));
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log(`  GET  /health`);
  console.log(`  GET  /api/batches`);
  console.log(`  GET  /api/batch/:batchId`);
  console.log(`  GET  /api/subject/:batchId/:subjectId`);
  console.log(`  GET  /api/topic/:batchId/:subjectId/:topicId`);
  console.log('='.repeat(50));
});