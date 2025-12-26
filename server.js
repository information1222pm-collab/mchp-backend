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

// ===== TOKEN LISTING WITH BIRDEYE + PUMPFUN FALLBACK =====
app.get('/api/coins', async (req, res) => {
  try {
    console.log('📊 Fetching tokens...');
    
    // Try Birdeye first (most reliable, has PumpFun data)
    const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
    
    if (BIRDEYE_API_KEY) {
      try {
        console.log('🐦 Trying Birdeye API with multiple calls...');
        console.log('🔑 Key length:', BIRDEYE_API_KEY.length);
        
        // Make 10 calls to get 1000 tokens (100 per call to avoid rate limits)
        const allTokens = [];
        const callsToMake = 10;
        const tokensPerCall = 100;
        
        for (let i = 0; i < callsToMake; i++) {
          const offset = i * tokensPerCall;
          console.log(`📞 API Call ${i + 1}/${callsToMake} (offset: ${offset})`);
          
          const birdeyeResponse = await fetch(
            `https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=${offset}&limit=${tokensPerCall}`,
            {
              headers: {
                'X-API-KEY': BIRDEYE_API_KEY,
                'Accept': 'application/json'
              }
            }
          );
          
          if (!birdeyeResponse.ok) {
            const errorText = await birdeyeResponse.text();
            console.log(`❌ Call ${i + 1} failed: ${birdeyeResponse.status} - ${errorText}`);
            break; // Stop on error
          }
          
          const birdeyeData = await birdeyeResponse.json();
          
          if (birdeyeData.success && birdeyeData.data && birdeyeData.data.tokens) {
            const tokens = birdeyeData.data.tokens.map(t => ({
              mint: t.address,
              name: t.name,
              symbol: t.symbol,
              price: t.price || 0,
              marketCap: t.mc || 0,
              liquidity: t.liquidity || 0,
              volume24h: t.v24hUSD || 0,
              priceChange24h: t.priceChange24h || 0,
              created_timestamp: Date.now(),
              source: 'birdeye'
            }));
            
            allTokens.push(...tokens);
            console.log(`✅ Call ${i + 1}: Got ${tokens.length} tokens. Total so far: ${allTokens.length}`);
            
            // Small delay between calls to avoid rate limits
            if (i < callsToMake - 1) {
              await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
            }
          } else {
            console.log(`⚠️ Call ${i + 1} returned no tokens`);
            break;
          }
        }
        
        if (allTokens.length > 0) {
          console.log(`🎉 Birdeye SUCCESS: ${allTokens.length} total tokens from ${callsToMake} API calls`);
          return res.json(allTokens);
        } else {
          console.log('⚠️ No tokens collected from Birdeye');
        }
        
      } catch (birdeyeError) {
        console.log('❌ Birdeye exception:', birdeyeError.message);
      }
    } else {
      console.log('⚠️ No BIRDEYE_API_KEY found');
    }
    
    // Fallback to PumpFun with ScraperAPI
    console.log('📊 Falling back to PumpFun...');
    const pumpFunUrl = 'https://frontend-api.pump.fun/coins?limit=100&sort=created_timestamp&order=DESC&includeNsfw=false';
    
    const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
    
    let fetchUrl;
    if (SCRAPER_API_KEY) {
      fetchUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(pumpFunUrl)}`;
      console.log('🔒 Using ScraperAPI proxy for PumpFun');
    } else {
      fetchUrl = pumpFunUrl;
      console.log('⚠️ Direct PumpFun request');
    }
    
    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`PumpFun API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ PumpFun: ${data.length} tokens`);
    
    res.json(data);
    
  } catch (error) {
    console.error('❌ Token fetch error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Add BIRDEYE_API_KEY for better reliability. Get free key at: https://docs.birdeye.so'
    });
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
