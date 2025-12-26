// MCHP Backend Server with Jupiter Proxy
// This handles all API calls to avoid CORS issues

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'MCHP Backend Running',
    endpoints: [
      'GET /api/coins',
      'POST /api/jupiter/quote',
      'POST /api/jupiter/swap',
      'GET /api/price-history/:mint'
    ]
  });
});

// ===== EXISTING ENDPOINT: Get recent tokens =====
app.get('/api/coins', async (req, res) => {
  try {
    // Fetch from PumpFun API
    const response = await fetch('https://frontend-api.pump.fun/coins?limit=50&sort=created_timestamp&order=DESC&includeNsfw=false');
    
    if (!response.ok) {
      throw new Error(`PumpFun API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json(data);
    
  } catch (error) {
    console.error('Coins fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== NEW: JUPITER QUOTE ENDPOINT =====
app.post('/api/jupiter/quote', async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippageBps } = req.body;
    
    console.log('📊 Jupiter Quote Request:', {
      inputMint: inputMint?.slice(0, 8) + '...',
      outputMint: outputMint?.slice(0, 8) + '...',
      amount,
      slippageBps
    });
    
    // Build Jupiter API URL
    const jupiterUrl = `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${inputMint}&` +
      `outputMint=${outputMint}&` +
      `amount=${amount}&` +
      `slippageBps=${slippageBps || 50}`;
    
    // Fetch from Jupiter (server-side, no CORS!)
    const response = await fetch(jupiterUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jupiter API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Jupiter Quote Success:', {
      outAmount: data.outAmount,
      priceImpact: data.priceImpactPct
    });
    
    res.json(data);
    
  } catch (error) {
    console.error('❌ Jupiter quote error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to get Jupiter quote'
    });
  }
});

// ===== NEW: JUPITER SWAP ENDPOINT =====
app.post('/api/jupiter/swap', async (req, res) => {
  try {
    const { quoteResponse, userPublicKey } = req.body;
    
    console.log('🔄 Jupiter Swap Request:', {
      userPublicKey: userPublicKey?.slice(0, 8) + '...',
      inAmount: quoteResponse?.inAmount,
      outAmount: quoteResponse?.outAmount
    });
    
    // Call Jupiter swap API (server-side, no CORS!)
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: 'auto',
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jupiter swap API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Jupiter Swap Success:', {
      hasTransaction: !!data.swapTransaction
    });
    
    res.json(data);
    
  } catch (error) {
    console.error('❌ Jupiter swap error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to get swap transaction'
    });
  }
});

// ===== NEW: PRICE HISTORY ENDPOINT =====
app.get('/api/price-history/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const { interval, limit } = req.query;
    
    console.log('📈 Price History Request:', { mint: mint.slice(0, 8) + '...', interval, limit });
    
    // Fetch from DexScreener
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`
    );
    
    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Generate mock candle data for now
    // In production, implement proper candle aggregation
    const mockCandles = [];
    const numCandles = parseInt(limit) || 60;
    const now = Date.now();
    const intervalMs = interval === '1m' ? 60000 : interval === '15m' ? 900000 : interval === '1h' ? 3600000 : 86400000;
    
    for (let i = 0; i < numCandles; i++) {
      const price = Math.random() * 0.001;
      mockCandles.push({
        timestamp: now - (i * intervalMs),
        open: price * (0.95 + Math.random() * 0.1),
        high: price * (1.0 + Math.random() * 0.1),
        low: price * (0.9 + Math.random() * 0.05),
        close: price,
        volume: Math.random() * 1000000
      });
    }
    
    res.json({ 
      candles: mockCandles.reverse(),
      pair: data.pairs?.[0] 
    });
    
  } catch (error) {
    console.error('❌ Price history error:', error);
    res.status(500).json({ 
      error: error.message,
      candles: [] 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 MCHP Backend Server Started!');
  console.log('================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Endpoints:`);
  console.log(`   GET  /api/coins`);
  console.log(`   POST /api/jupiter/quote`);
  console.log(`   POST /api/jupiter/swap`);
  console.log(`   GET  /api/price-history/:mint`);
  console.log('================================');
  console.log('');
});
