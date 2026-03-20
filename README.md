# TRITEC Who's Who

Employee recognition quiz with persistent leaderboard and admin dashboard.

## Local Development

```bash
npm install
npm run dev
```

Local dev uses JSON files in `data/` for storage. No external services needed.

## Deploy to Vercel (Free)

### 1. Push to GitHub
```bash
git init && git add -A && git commit -m "init"
gh repo create tritec-whos-who --private --push
```

### 2. Import to Vercel
Go to [vercel.com/new](https://vercel.com/new), import the repo.

### 3. Create Storage (in Vercel Dashboard)
- **Storage > Create Store > KV** > Connect to project
- **Storage > Create Store > Blob** > Connect to project

Both are free tier. Env vars are auto-set when you connect.

### 4. Set Admin Password
- **Settings > Environment Variables** > Add `ADMIN_PASSWORD` = your password

### 5. Deploy
Vercel auto-deploys on push. Done.

## Routes

- `/` Landing page
- `/quiz` The quiz (20 per round, auto-advance)
- `/leaderboard` Persistent score rankings
- `/admin` Employee CRUD (password protected)

## How It Works

- 73 employees, served in rounds of 20
- Name distractors are gender-matched
- Fun facts pop up on 3-correct streaks
- Leaderboard auto-submits after each round
- Admin can add/delete employees with photo upload
- Photos for new employees stored in Vercel Blob
- Original 73 headshots are static assets (no migration needed)
