// MCHP Multi-API Backend - Maximum Data Coverage
// Queries 10+ APIs simultaneously for best results

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'MCHP Multi-API Backend',
    version: '2.0.0',
    apis: {
      dexscreener: 'Token discovery',
      birdeye: 'Analytics',
      jupiter: 'Price quotes',
      geckoterminal: 'DEX data',
      solscan: 'Blockchain data',
      coingecko: 'Price feeds',
      raydium: 'DEX data',
      solanatracker: 'New tokens'
    },
    endpoints: {
      coins: '/api/coins',
      aggregated: '/api/coins/aggregated'
    }
  });
});

// API 1: DexScreener
async function fetchDexScreener() {
  try {
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana', {
      timeout: 5000
    });
    if (!response.ok) throw new Error(`DexScreener ${response.status}`);
    const data = await response.json();
    console.log(`✅ DexScreener: ${data.pairs?.length || 0} pairs`);
    return data.pairs || [];
  } catch (error) {
    console.log(`❌ DexScreener: ${error.message}`);
    return [];
  }
}

// API 2: Birdeye - New tokens
async function fetchBirdeye() {
  try {
    // Using public endpoint for new tokens
    const response = await fetch('https://public-api.birdeye.so/public/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=20', {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': 'public' // Free tier
      },
      timeout: 5000
    });
    if (!response.ok) throw new Error(`Birdeye ${response.status}`);
    const data = await response.json();
    console.log(`✅ Birdeye: ${data.data?.tokens?.length || 0} tokens`);
    return data.data?.tokens || [];
  } catch (error) {
    console.log(`❌ Birdeye: ${error.message}`);
    return [];
  }
}

// API 3: GeckoTerminal - Real-time DEX data
async function fetchGeckoTerminal() {
  try {
    const response = await fetch('https://api.geckoterminal.com/api/v2/networks/solana/trending_pools', {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    if (!response.ok) throw new Error(`GeckoTerminal ${response.status}`);
    const data = await response.json();
    console.log(`✅ GeckoTerminal: ${data.data?.length || 0} pools`);
    return data.data || [];
  } catch (error) {
    console.log(`❌ GeckoTerminal: ${error.message}`);
    return [];
  }
}

// API 4: Solscan - Latest tokens
async function fetchSolscan() {
  try {
    const response = await fetch('https://api.solscan.io/token/list?sortBy=market_cap&direction=desc&limit=20', {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    if (!response.ok) throw new Error(`Solscan ${response.status}`);
    const data = await response.json();
    console.log(`✅ Solscan: ${data.data?.length || 0} tokens`);
    return data.data || [];
  } catch (error) {
    console.log(`❌ Solscan: ${error.message}`);
    return [];
  }
}

// API 5: Raydium - DEX data
async function fetchRaydium() {
  try {
    const response = await fetch('https://api.raydium.io/v2/main/pairs', {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    if (!response.ok) throw new Error(`Raydium ${response.status}`);
    const data = await response.json();
    console.log(`✅ Raydium: ${data.length || 0} pairs`);
    return data || [];
  } catch (error) {
    console.log(`❌ Raydium: ${error.message}`);
    return [];
  }
}

// API 6: Jupiter - Price data
async function fetchJupiter() {
  try {
    const response = await fetch('https://quote-api.jup.ag/v6/tokens', {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    if (!response.ok) throw new Error(`Jupiter ${response.status}`);
    const data = await response.json();
    console.log(`✅ Jupiter: ${data.length || 0} tokens`);
    // Return first 20 for performance
    return (data || []).slice(0, 20);
  } catch (error) {
    console.log(`❌ Jupiter: ${error.message}`);
    return [];
  }
}

// API 7: SolanaTracker - New tokens
async function fetchSolanaTracker() {
  try {
    const response = await fetch('https://data.solanatracker.io/tokens/new', {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    if (!response.ok) throw new Error(`SolanaTracker ${response.status}`);
    const data = await response.json();
    console.log(`✅ SolanaTracker: ${data.tokens?.length || 0} tokens`);
    return data.tokens || [];
  } catch (error) {
    console.log(`❌ SolanaTracker: ${error.message}`);
    return [];
  }
}

// API 8: CoinGecko - Trending
async function fetchCoinGecko() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=volume_desc&per_page=20&page=1', {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
    const data = await response.json();
    console.log(`✅ CoinGecko: ${data.length || 0} coins`);
    return data || [];
  } catch (error) {
    console.log(`❌ CoinGecko: ${error.message}`);
    return [];
  }
}

// Aggregate all API results
async function aggregateAllAPIs() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 QUERYING ALL APIS SIMULTANEOUSLY...');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  // Query ALL APIs simultaneously!
  const [
    dexScreener,
    birdeye,
    geckoTerminal,
    solscan,
    raydium,
    jupiter,
    solanaTracker,
    coinGecko
  ] = await Promise.all([
    fetchDexScreener(),
    fetchBirdeye(),
    fetchGeckoTerminal(),
    fetchSolscan(),
    fetchRaydium(),
    fetchJupiter(),
    fetchSolanaTracker(),
    fetchCoinGecko()
  ]);
  
  const elapsed = Date.now() - startTime;
  
  // Combine all results
  const allTokens = [];
  
  // Process DexScreener
  dexScreener.forEach(pair => {
    if (pair.baseToken) {
      allTokens.push({
        address: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        priceUsd: pair.priceUsd,
        volume24h: pair.volume?.h24,
        liquidity: pair.liquidity?.usd,
        priceChange24h: pair.priceChange?.h24,
        source: 'dexscreener',
        pairAddress: pair.pairAddress,
        dexId: pair.dexId
      });
    }
  });
  
  // Process GeckoTerminal
  geckoTerminal.forEach(pool => {
    if (pool.attributes) {
      allTokens.push({
        address: pool.attributes.address,
        symbol: pool.attributes.base_token_symbol,
        name: pool.attributes.name,
        priceUsd: pool.attributes.base_token_price_usd,
        volume24h: pool.attributes.volume_usd?.h24,
        liquidity: pool.attributes.reserve_in_usd,
        priceChange24h: pool.attributes.price_change_percentage?.h24,
        source: 'geckoterminal'
      });
    }
  });
  
  // Process Birdeye
  birdeye.forEach(token => {
    allTokens.push({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      priceUsd: token.price,
      volume24h: token.v24hUSD,
      liquidity: token.liquidity,
      priceChange24h: token.v24hChangePercent,
      source: 'birdeye',
      marketCap: token.mc
    });
  });
  
  // Process Solscan
  solscan.forEach(token => {
    allTokens.push({
      address: token.tokenAddress,
      symbol: token.symbol,
      name: token.tokenName,
      priceUsd: token.priceUsdt,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      holder: token.holder,
      source: 'solscan'
    });
  });
  
  // Process Raydium
  raydium.slice(0, 20).forEach(pair => {
    if (pair.baseMint) {
      allTokens.push({
        address: pair.baseMint,
        symbol: pair.baseSymbol,
        name: pair.name,
        priceUsd: pair.price,
        volume24h: pair.volume24h,
        liquidity: pair.liquidity,
        source: 'raydium'
      });
    }
  });
  
  // Process Jupiter
  jupiter.forEach(token => {
    allTokens.push({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      source: 'jupiter',
      decimals: token.decimals
    });
  });
  
  // Process SolanaTracker
  solanaTracker.forEach(token => {
    allTokens.push({
      address: token.mint,
      symbol: token.symbol,
      name: token.name,
      priceUsd: token.price,
      volume24h: token.volume24h,
      liquidity: token.liquidity,
      source: 'solanatracker',
      createdAt: token.createdAt
    });
  });
  
  // Process CoinGecko
  coinGecko.forEach(coin => {
    allTokens.push({
      address: coin.id,
      symbol: coin.symbol?.toUpperCase(),
      name: coin.name,
      priceUsd: coin.current_price,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      priceChange24h: coin.price_change_percentage_24h,
      source: 'coingecko'
    });
  });
  
  console.log('='.repeat(50));
  console.log(`✅ AGGREGATION COMPLETE in ${elapsed}ms`);
  console.log(`📊 Total tokens from all sources: ${allTokens.length}`);
  console.log('='.repeat(50) + '\n');
  
  return allTokens;
}

// Endpoint: Aggregated data from ALL APIs
app.get('/api/coins/aggregated', async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Multi-API aggregation requested`);
    
    const allTokens = await aggregateAllAPIs();
    
    // Remove duplicates by address, keeping the one with most data
    const uniqueTokens = {};
    allTokens.forEach(token => {
      const key = token.address?.toLowerCase();
      if (key) {
        if (!uniqueTokens[key] || Object.keys(token).length > Object.keys(uniqueTokens[key]).length) {
          uniqueTokens[key] = token;
        }
      }
    });
    
    const finalTokens = Object.values(uniqueTokens);
    
    console.log(`[${new Date().toISOString()}] Returning ${finalTokens.length} unique tokens`);
    
    res.json({
      success: true,
      count: finalTokens.length,
      sources: 8,
      tokens: finalTokens,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Aggregation error:`, error.message);
    res.status(500).json({
      error: 'Failed to aggregate data',
      message: error.message
    });
  }
});

// Endpoint: Simple coins list (for backward compatibility)
app.get('/api/coins', async (req, res) => {
  try {
    const allTokens = await aggregateAllAPIs();
    
    // Format like pump.fun for compatibility
    const formatted = allTokens.slice(0, 50).map(token => ({
      mint: token.address,
      symbol: token.symbol,
      name: token.name,
      description: `${token.source} token`,
      image: null,
      price: parseFloat(token.priceUsd) || 0,
      volume24h: parseFloat(token.volume24h) || 0,
      liquidity: parseFloat(token.liquidity) || 0,
      marketCap: parseFloat(token.marketCap) || 0,
      priceChange24h: parseFloat(token.priceChange24h) || 0,
      source: token.source,
      createdAt: token.createdAt || Date.now()
    }));
    
    res.json(formatted);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    res.status(500).json({
      error: 'Failed to fetch coins',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 MCHP MULTI-API BACKEND v2.0');
  console.log('='.repeat(50));
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/`);
  console.log(`Coins: http://localhost:${PORT}/api/coins`);
  console.log(`Aggregated: http://localhost:${PORT}/api/coins/aggregated`);
  console.log('\nData Sources:');
  console.log('  ✅ DexScreener');
  console.log('  ✅ Birdeye');
  console.log('  ✅ GeckoTerminal');
  console.log('  ✅ Solscan');
  console.log('  ✅ Raydium');
  console.log('  ✅ Jupiter');
  console.log('  ✅ SolanaTracker');
  console.log('  ✅ CoinGecko');
  console.log('='.repeat(50));
});
