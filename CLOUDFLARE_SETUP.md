# Cloudflare Worker Setup

## 1. Deploy the Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to Workers & Pages
3. Create a new Worker
4. Replace the default code with the content from `cloudflare-worker.js`
5. Set your worker name (e.g., `openrouter-proxy`)

## 2. Set Environment Variables

In your worker settings, add:
- `OPENROUTER_API_KEY`: Your OpenRouter API key

## 3. Update Frontend URLs

Replace `https://your-worker.your-subdomain.workers.dev` in the code with your actual worker URL:
- `https://openrouter-proxy.your-subdomain.workers.dev`

## 4. Test the Worker

Your worker should be accessible at:
- `https://your-worker-name.your-subdomain.workers.dev/onboard-goal`
- `https://your-worker-name.your-subdomain.workers.dev/generate-plan`

## Benefits

- ✅ No cold starts (unlike Supabase Edge Functions)
- ✅ Global edge network for fast responses
- ✅ Secure API key storage
- ✅ Free tier: 100,000 requests/day
- ✅ Simple deployment and updates