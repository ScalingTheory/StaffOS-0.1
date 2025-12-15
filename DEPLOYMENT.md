# StaffOS Deployment Guide

## Architecture Overview
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Express.js)
- **Database**: Neon (PostgreSQL)

---

## Step 1: Setup Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up/login
2. Click **"Create Project"**
3. Name: `staffos-production`
4. Region: Choose closest to your users
5. Click **"Create Project"**
6. Click **"Connect"** button on dashboard
7. Copy the **connection string** (save this securely):
   ```
   postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Push Code to GitHub Organization

### From your current Replit project, push to your org repo:

```bash
# Add your org's repo as remote (if not already)
git remote add org https://github.com/ScalingTheory/StaffOS-0.1.git

# Fetch latest from org
git fetch org

# Push to dev branch
git push org HEAD:dev

# Or if you want to force push (be careful!)
git push org HEAD:dev --force
```

### Or clone and copy files:
```bash
# Clone org repo locally
git clone https://github.com/ScalingTheory/StaffOS-0.1.git
cd StaffOS-0.1

# Switch to dev branch
git checkout dev

# Copy all files from Replit project to this folder
# Then commit and push
git add .
git commit -m "Prepare for deployment"
git push origin dev
```

---

## Step 3: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect to `ScalingTheory/StaffOS-0.1` repository
4. Select **dev** branch
5. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `staffos-backend` |
   | **Environment** | `Node` |
   | **Region** | Oregon (or closest) |
   | **Branch** | `dev` |
   | **Build Command** | `npm install && npm run build:backend` |
   | **Start Command** | `npm run start:backend` |
   | **Instance Type** | Starter ($7/mo) or Free |

6. Click **"Advanced"** and add Environment Variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Your Neon connection string |
   | `SESSION_SECRET` | Generate a random 32+ char string |
   | `FRONTEND_URL` | `https://staffos-dev.vercel.app` (update after Vercel deploy) |
   | `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID (optional) |
   | `GOOGLE_CLIENT_SECRET` | Your Google OAuth Secret (optional) |

7. Click **"Create Web Service"**
8. Wait for deployment (2-5 minutes)
9. Copy your backend URL: `https://staffos-backend.onrender.com`

---

## Step 4: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New"** → **"Project"**
3. Import `ScalingTheory/StaffOS-0.1` repository
4. Configure:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `.` (leave empty) |
   | **Build Command** | Leave as default (uses vercel.json) |
   | **Output Directory** | Leave as default (uses vercel.json) |

5. Click **"Environment Variables"** and add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://staffos-backend.onrender.com` |

6. Under **"Git"** section:
   - Production Branch: `main`
   - Preview Branches: Enable for `dev` branch

7. Click **"Deploy"**
8. Copy your frontend URL: `https://staffos-0-1.vercel.app`

---

## Step 5: Update Backend CORS

After getting your Vercel URL, update the `FRONTEND_URL` environment variable in Render:

1. Go to Render Dashboard → Your Service → Environment
2. Update `FRONTEND_URL` to your actual Vercel URL
3. Click **"Save Changes"** (this will redeploy)

---

## Step 6: Run Database Migrations

### Option A: From Local Machine
```bash
# Set the DATABASE_URL environment variable
export DATABASE_URL="postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require"

# Run migrations
npm run db:push
```

### Option B: From Render Shell
1. Go to Render Dashboard → Your Service → Shell
2. Run:
   ```bash
   npm run db:push
   ```

---

## Environment Variables Summary

### Render (Backend)
| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `production` | Yes |
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Random 32+ character string | Yes |
| `FRONTEND_URL` | Your Vercel frontend URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | Optional |

### Vercel (Frontend)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Your Render backend URL | Yes |

---

## Verify Deployment

### 1. Test Backend Health
```bash
curl https://staffos-backend.onrender.com/api/health
```
Should return: `{"status":"ok"}`

### 2. Test Frontend
Visit your Vercel URL in browser - should load the StaffOS homepage

### 3. Test API Connection
- Try logging in or any feature that requires the backend
- Check browser console for any CORS errors

---

## Troubleshooting

### Backend Issues
- **503 Error**: Render free tier spins down after 15 min inactivity. First request takes 30-60s.
- **CORS Errors**: Check `FRONTEND_URL` in Render matches your Vercel URL exactly
- **Database Errors**: Verify `DATABASE_URL` is correct and Neon project is active

### Frontend Issues
- **API Not Working**: Check `VITE_API_URL` is set correctly in Vercel
- **Blank Page**: Check browser console for JavaScript errors
- **Routing Issues**: The vercel.json handles SPA routing

### Database Issues
- **Connection Refused**: Check Neon project is not suspended
- **SSL Error**: Ensure `?sslmode=require` is in connection string

---

## Auto-Deploy Setup

### Render
- Automatically deploys on push to connected branch
- Configure in Settings → Build & Deploy

### Vercel
- Automatically deploys on push
- Preview deployments for PRs
- Configure branch settings in Project Settings → Git

---

## Custom Domain (Optional)

### Vercel
1. Settings → Domains → Add
2. Add your domain (e.g., `app.staffos.com`)
3. Configure DNS as instructed

### Render
1. Settings → Custom Domains → Add
2. Add your domain (e.g., `api.staffos.com`)
3. Configure DNS as instructed

---

## Production Checklist

- [ ] Neon database created and connection string saved
- [ ] Backend deployed to Render with all env vars
- [ ] Frontend deployed to Vercel with VITE_API_URL
- [ ] FRONTEND_URL updated in Render after Vercel deploy
- [ ] Database migrations run successfully
- [ ] Health check endpoint responding
- [ ] Frontend loads correctly
- [ ] Login/signup works
- [ ] All features tested
