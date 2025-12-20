// MCHP Backend API Proxy
// Bypasses CORS by fetching pump.fun data server-side

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (your frontend can access this)
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'MCHP Backend API Proxy',
    version: '1.0.0',
    endpoints: {
      coins: '/api/coins',
      coin: '/api/coin/:address'
    }
  });
});

// Get list of coins from pump.fun
app.get('/api/coins', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    const includeNsfw = req.query.includeNsfw || 'false';
    
    console.log(`[${new Date().toISOString()}] Fetching coins: limit=${limit}, offset=${offset}`);
    
    const url = `https://frontend-api.pump.fun/coins?offset=${offset}&limit=${limit}&includeNsfw=${includeNsfw}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`pump.fun API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`[${new Date().toISOString()}] Successfully fetched ${data.length} coins`);
    
    res.json(data);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching coins:`, error.message);
    res.status(500).json({
      error: 'Failed to fetch coins',
      message: error.message
    });
  }
});

// Get single coin data
app.get('/api/coin/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    console.log(`[${new Date().toISOString()}] Fetching coin: ${address}`);
    
    const url = `https://frontend-api.pump.fun/coins/${address}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`pump.fun API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`[${new Date().toISOString()}] Successfully fetched coin ${address}`);
    
    res.json(data);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching coin:`, error.message);
    res.status(500).json({
      error: 'Failed to fetch coin',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 MCHP Backend API Proxy');
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Coins API: http://localhost:${PORT}/api/coins`);
  console.log('='.repeat(50));
});
