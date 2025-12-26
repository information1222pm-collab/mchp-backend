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

// ===== TOKEN LISTING WITH MULTI-SOURCE AGGREGATION =====
app.get('/api/coins', async (req, res) => {
  try {
    console.log('📊 Fetching tokens from MULTIPLE sources...');
    
    const allTokens = [];
    const seenMints = new Set();
    
    // ===== SOURCE 1: BIRDEYE (TOP 50 BY VOLUME) =====
    const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
    if (BIRDEYE_API_KEY) {
      try {
        console.log('🐦 Fetching from Birdeye...');
        const birdeyeResponse = await fetch(
          'https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=50',
          {
            headers: {
              'X-API-KEY': BIRDEYE_API_KEY,
              'Accept': 'application/json'
            }
          }
        );
        
        if (birdeyeResponse.ok) {
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
            
            tokens.forEach(t => {
              if (!seenMints.has(t.mint)) {
                seenMints.add(t.mint);
                allTokens.push(t);
              }
            });
            console.log(`✅ Birdeye: ${tokens.length} tokens`);
          }
        }
      } catch (e) {
        console.log('❌ Birdeye failed:', e.message);
      }
    }
    
    // ===== SOURCE 2: DEXSCREENER (TOP 100 TRENDING) =====
    try {
      console.log('📊 Fetching from DexScreener...');
      const dexResponse = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana/trending');
      
      if (dexResponse.ok) {
        const dexData = await dexResponse.json();
        if (dexData.pairs && Array.isArray(dexData.pairs)) {
          const tokens = dexData.pairs.slice(0, 100).map(p => ({
            mint: p.baseToken?.address || p.tokenAddress,
            name: p.baseToken?.name || 'Unknown',
            symbol: p.baseToken?.symbol || 'UNKNOWN',
            price: parseFloat(p.priceUsd) || 0,
            marketCap: parseFloat(p.fdv) || 0,
            liquidity: parseFloat(p.liquidity?.usd) || 0,
            volume24h: parseFloat(p.volume?.h24) || 0,
            priceChange24h: parseFloat(p.priceChange?.h24) || 0,
            created_timestamp: p.pairCreatedAt || Date.now(),
            source: 'dexscreener'
          }));
          
          tokens.forEach(t => {
            if (t.mint && !seenMints.has(t.mint)) {
              seenMints.add(t.mint);
              allTokens.push(t);
            }
          });
          console.log(`✅ DexScreener: ${tokens.length} tokens`);
        }
      }
    } catch (e) {
      console.log('❌ DexScreener failed:', e.message);
    }
    
    // ===== SOURCE 3: GECKOTERMINAL (TOP 50 TRENDING) =====
    try {
      console.log('🦎 Fetching from GeckoTerminal...');
      const geckoResponse = await fetch('https://api.geckoterminal.com/api/v2/networks/solana/trending_pools');
      
      if (geckoResponse.ok) {
        const geckoData = await geckoResponse.json();
        if (geckoData.data && Array.isArray(geckoData.data)) {
          const tokens = geckoData.data.slice(0, 50).map(p => {
            const baseToken = p.relationships?.base_token?.data;
            return {
              mint: baseToken?.id?.split('_')[1] || p.attributes?.address,
              name: p.attributes?.name || 'Unknown',
              symbol: baseToken?.id?.split('_')[1]?.slice(0, 6) || 'UNKNOWN',
              price: parseFloat(p.attributes?.base_token_price_usd) || 0,
              marketCap: parseFloat(p.attributes?.fdv_usd) || 0,
              liquidity: parseFloat(p.attributes?.reserve_in_usd) || 0,
              volume24h: parseFloat(p.attributes?.volume_usd?.h24) || 0,
              priceChange24h: parseFloat(p.attributes?.price_change_percentage?.h24) || 0,
              created_timestamp: Date.now(),
              source: 'geckoterminal'
            };
          });
          
          tokens.forEach(t => {
            if (t.mint && !seenMints.has(t.mint)) {
              seenMints.add(t.mint);
              allTokens.push(t);
            }
          });
          console.log(`✅ GeckoTerminal: ${tokens.length} tokens`);
        }
      }
    } catch (e) {
      console.log('❌ GeckoTerminal failed:', e.message);
    }
    
    // ===== SOURCE 4: PUMPFUN (NEWEST 50) =====
    try {
      console.log('🎪 Fetching from PumpFun...');
      const pumpUrl = 'https://frontend-api.pump.fun/coins?limit=50&sort=created_timestamp&order=DESC&includeNsfw=false';
      
      const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
      const fetchUrl = SCRAPER_API_KEY 
        ? `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(pumpUrl)}`
        : pumpUrl;
      
      const pumpResponse = await fetch(fetchUrl, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (pumpResponse.ok) {
        const pumpData = await pumpResponse.json();
        if (Array.isArray(pumpData)) {
          const tokens = pumpData.slice(0, 50).map(t => ({
            mint: t.mint,
            name: t.name,
            symbol: t.symbol,
            price: t.usd_market_cap ? t.usd_market_cap / (t.total_supply || 1) : 0,
            marketCap: t.usd_market_cap || 0,
            liquidity: t.liquidity || 0,
            volume24h: t.volume_24h || 0,
            priceChange24h: 0,
            created_timestamp: t.created_timestamp || Date.now(),
            source: 'pumpfun'
          }));
          
          tokens.forEach(t => {
            if (t.mint && !seenMints.has(t.mint)) {
              seenMints.add(t.mint);
              allTokens.push(t);
            }
          });
          console.log(`✅ PumpFun: ${tokens.length} tokens`);
        }
      }
    } catch (e) {
      console.log('❌ PumpFun failed:', e.message);
    }
    
    // ===== RESULTS =====
    console.log(`\n🎉 TOTAL UNIQUE TOKENS: ${allTokens.length}`);
    console.log(`📊 Sources: Birdeye, DexScreener, GeckoTerminal, PumpFun\n`);
    
    if (allTokens.length === 0) {
      throw new Error('All data sources failed - no tokens retrieved');
    }
    
    res.json(allTokens);
    
  } catch (error) {
    console.error('❌ Token fetch error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Multi-source fetch failed. Check API availability.'
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
