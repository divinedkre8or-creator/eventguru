# Vercel Deployment Guide — MYEVENTGURU

Your application is fully prepared for Vercel deployment!

## 📋 Vercel Dashboard Environment Variables

When importing this repository into Vercel, configure the following Environment Variables under **Project Settings → Environment Variables**:

| Variable Name | Description | Example / Value |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project API URL | `https://edpnvsakkudorleqqhxv.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Public Anon Key | `eyJhbGciOi...` |
| `VITE_SUPABASE_PROJECT_ID` | Supabase Project Reference | `edpnvsakkudorleqqhxv` |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack Inline Key (Optional) | `pk_test_...` |

---

## ⚡ Deployment Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Single Page Application Rewrites**: Pre-configured in `vercel.json` (`/(.*)` $\rightarrow$ `/index.html`)

---

## 🚀 Step-by-Step Vercel Deployment
1. Push your local branch to GitHub / GitLab:
   ```bash
   git push origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your **`MYEVENTGURU`** (`eventguru`) repository.
4. Add the Environment Variables listed above.
5. Click **Deploy**!
