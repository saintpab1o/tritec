import { Employee, defaultEmployees } from '@/data/employees';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
}

// Upstash Redis sets these env vars when connected via Vercel Marketplace
const useRedis = !!process.env.KV_REST_API_URL || !!process.env.UPSTASH_REDIS_REST_URL;

// ---- Upstash Redis ----
async function getRedis() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
  });
}

// ---- File fallback for local dev ----
async function getFS() {
  const { promises: fs } = await import('fs');
  const path = await import('path');
  const DATA_DIR = path.join(process.cwd(), 'data');
  const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
  const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

  async function ensureDir() {
    try { await fs.access(DATA_DIR); } catch { await fs.mkdir(DATA_DIR, { recursive: true }); }
  }

  return { fs, ensureDir, EMPLOYEES_FILE, LEADERBOARD_FILE };
}

// ---- Employees ----

export async function getEmployees(): Promise<Employee[]> {
  if (useRedis) {
    const redis = await getRedis();
    const employees = await redis.get<Employee[]>('employees');
    if (!employees || employees.length === 0) {
      await redis.set('employees', JSON.stringify(defaultEmployees));
      return defaultEmployees;
    }
    return typeof employees === 'string' ? JSON.parse(employees) : employees;
  }

  const { fs, ensureDir, EMPLOYEES_FILE } = await getFS();
  await ensureDir();
  try {
    const data = await fs.readFile(EMPLOYEES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(defaultEmployees, null, 2));
    return defaultEmployees;
  }
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  if (useRedis) {
    const redis = await getRedis();
    await redis.set('employees', JSON.stringify(employees));
    return;
  }

  const { fs, ensureDir, EMPLOYEES_FILE } = await getFS();
  await ensureDir();
  await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(employees, null, 2));
}

export async function addEmployee(employee: Employee): Promise<Employee[]> {
  const employees = await getEmployees();
  employees.push(employee);
  await saveEmployees(employees);
  return employees;
}

export async function deleteEmployee(id: string): Promise<Employee[]> {
  let employees = await getEmployees();
  employees = employees.filter(e => e.id !== id);
  await saveEmployees(employees);
  return employees;
}

// ---- Leaderboard ----

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (useRedis) {
    const redis = await getRedis();
    const leaderboard = await redis.get<LeaderboardEntry[]>('leaderboard');
    if (!leaderboard) return [];
    return typeof leaderboard === 'string' ? JSON.parse(leaderboard) : leaderboard;
  }

  const { fs, ensureDir, LEADERBOARD_FILE } = await getFS();
  await ensureDir();
  try {
    const data = await fs.readFile(LEADERBOARD_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify([]));
    return [];
  }
}

export async function addLeaderboardEntry(entry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
  const leaderboard = await getLeaderboard();
  
  // Upsert: one entry per player name, keep whichever has more total correct
  // If tied on total correct, keep the higher percentage
  const existingIdx = leaderboard.findIndex(
    (e) => e.playerName.toLowerCase() === entry.playerName.toLowerCase()
  );

  if (existingIdx !== -1) {
    const existing = leaderboard[existingIdx];
    // Replace if new attempt has more correct, or same correct but higher %
    if (
      entry.score > existing.score ||
      (entry.score === existing.score && entry.percentage > existing.percentage)
    ) {
      leaderboard[existingIdx] = entry;
    }
    // Otherwise keep existing (their old score was better)
  } else {
    leaderboard.push(entry);
  }

  // Sort: primary = total correct (desc), tiebreak = percentage (desc), then date (newest)
  leaderboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (useRedis) {
    const redis = await getRedis();
    await redis.set('leaderboard', JSON.stringify(leaderboard));
  } else {
    const { fs, ensureDir, LEADERBOARD_FILE } = await getFS();
    await ensureDir();
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  }

  return leaderboard;
}

export async function clearLeaderboard(): Promise<void> {
  if (useRedis) {
    const redis = await getRedis();
    await redis.set('leaderboard', JSON.stringify([]));
    return;
  }

  const { fs, ensureDir, LEADERBOARD_FILE } = await getFS();
  await ensureDir();
  await fs.writeFile(LEADERBOARD_FILE, JSON.stringify([]));
}
