import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const port = Number(process.env.API_PORT || 8787);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const trustProxy = process.env.TRUST_PROXY === 'true';
const cache = new Map();
const cacheTtlMs = Number(process.env.ACHIEVEMENT_CACHE_TTL_MS || 300000);

app.set('trust proxy', trustProxy ? 1 : false);
app.use(helmet());
app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));

const normalized = ({ platform, gameTitle, achievementName, description = '', unlocked = false,
  unlockedAt = null, iconUrl = null, gameId = null, achievementId = null }) => ({
  platform, gameTitle, achievementName, description, unlocked, timestamp: unlockedAt,
  iconUrl, gameId, achievementId
});

function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value);
  return loader().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
  });
}

async function json(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`${response.status} from platform API`);
  return response.json();
}

async function steamAchievements(steamId, appId) {
  if (!process.env.STEAM_API_KEY) throw new Error('Steam is not configured: set STEAM_API_KEY');
  if (!steamId || !appId) throw new Error('Steam requires steamId and appId');
  const [schema, player] = await Promise.all([
    json(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${encodeURIComponent(process.env.STEAM_API_KEY)}&appid=${encodeURIComponent(appId)}`),
    json(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${encodeURIComponent(process.env.STEAM_API_KEY)}&steamid=${encodeURIComponent(steamId)}&appid=${encodeURIComponent(appId)}`)
  ]);
  const definitions = new Map((schema.game?.availableGameStats?.achievements || []).map((item) => [item.name, item]));
  return (player.playerstats?.achievements || []).map((item) => {
    const definition = definitions.get(item.apiname) || {};
    return normalized({ platform: 'steam', gameTitle: player.playerstats?.gameName || `Steam game ${appId}`,
      gameId: String(appId), achievementId: item.apiname, achievementName: definition.displayName || item.apiname,
      description: definition.description || '', unlocked: item.achieved === 1,
      unlockedAt: item.unlocktime ? new Date(item.unlocktime * 1000).toISOString() : null, iconUrl: definition.icon || null });
  });
}

async function xboxAchievements(xuid, titleId) {
  if (!process.env.XBOX_ACCESS_TOKEN) throw new Error('Xbox is not configured: set XBOX_ACCESS_TOKEN');
  if (!xuid || !titleId) throw new Error('Xbox requires xuid and titleId');
  const base = process.env.XBOX_API_BASE_URL || 'https://achievements.xboxlive.com';
  const data = await json(`${base}/users/xuid(${encodeURIComponent(xuid)})/achievements?titleId=${encodeURIComponent(titleId)}`, {
    headers: { Authorization: `Bearer ${process.env.XBOX_ACCESS_TOKEN}`, 'x-xbl-contract-version': '2' }
  });
  return (data.achievements || []).map((item) => normalized({ platform: 'xbox', gameTitle: item.titleName || `Xbox title ${titleId}`,
    gameId: String(titleId), achievementId: item.id, achievementName: item.name || item.id, description: item.description || '',
    unlocked: item.progressState === 'Achieved', unlockedAt: item.rewards?.[0]?.earnedDateTime || null,
    iconUrl: item.mediaAssets?.[0]?.url || null }));
}

async function playstationAchievements(accountId, titleId) {
  if (!process.env.PSN_NPSSO) throw new Error('PlayStation is not configured: set PSN_NPSSO');
  if (!accountId || !titleId) throw new Error('PlayStation requires accountId and titleId');
  let psn;
  try { psn = await import('psn-api'); } catch { throw new Error('Install psn-api to enable PlayStation support'); }
  const auth = await psn.exchangeNpssoForCode(process.env.PSN_NPSSO).then(psn.exchangeCodeForAccessToken);
  const [title, trophies] = await Promise.all([
    psn.getTitleTrophies({ accessToken: auth.accessToken }, titleId, 'default', { npServiceName: 'trophy' }),
    psn.getUserTrophiesEarnedForTitle({ accessToken: auth.accessToken }, accountId, titleId, 'default', { npServiceName: 'trophy' })
  ]);
  const earned = new Map((trophies.trophies || []).map((item) => [item.trophyId, item.earnedDateTime || null]));
  return (title.trophies || []).map((item) => normalized({ platform: 'playstation', gameTitle: title.gameTitle || `PlayStation title ${titleId}`,
    gameId: String(titleId), achievementId: String(item.trophyId), achievementName: item.trophyName || `Trophy ${item.trophyId}`,
    description: item.trophyDetail || '', unlocked: earned.has(item.trophyId), unlockedAt: earned.get(item.trophyId), iconUrl: item.trophyIconUrl || null }));
}

function route(platform, loader) {
  return async (request, response) => {
    try {
      const key = `${platform}:${JSON.stringify(request.query)}`;
      response.json({ platform, achievements: await cached(key, () => loader(request.query)) });
    } catch (error) { response.status(502).json({ error: error.message }); }
  };
}

app.get('/api/health', (_request, response) => response.json({ ok: true }));
app.get('/api/achievements/steam', route('steam', ({ steamId, appId }) => steamAchievements(steamId, appId)));
app.get('/api/achievements/xbox', route('xbox', ({ xuid, titleId }) => xboxAchievements(xuid, titleId)));
app.get('/api/achievements/playstation', route('playstation', ({ accountId, titleId }) => playstationAchievements(accountId, titleId)));

app.listen(port, () => console.log(`Achievement API listening on http://localhost:${port}`));
