# GitHub Pages Setup Guide

## 🚀 Quick Setup (5 minutes)

Your game is now ready to play on GitHub Pages! Follow these steps:

### Option 1: Automatic Deployment (Recommended)

The GitHub Actions workflow is already configured. Just push to main:

```bash
# In your space-travel directory
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

Then:

1. Go to your repository: https://github.com/ipaliog-a11y/space-travel
2. Click on **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Wait 2-3 minutes for deployment
5. Your game will be live at: `https://ipaliog-a11y.github.io/space-travel/`

### Option 2: Manual Deployment

If you prefer manual control:

1. Go to **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose branch: **main**, folder: **/ (root)**
4. Click **Save**
5. Your game will be live at: `https://ipaliog-a11y.github.io/space-travel/`

---

## 🎮 What Gets Deployed

The following files are served:

- **index.html** - Landing page with "Play Now" button
- **starwake.html** - The actual game
- **docs/** - Documentation (optional)
- All assets and styles are embedded (single-file deployment)

---

## ✅ Verification

After deployment:

1. Visit: https://ipaliog-a11y.github.io/space-travel/
2. You should see the landing page
3. Click "Play Now" to start the game
4. Click "Engage" to unlock audio
5. Start flying!

---

## 🔧 Troubleshooting

### Issue: 404 Error

**Solution:**
- Wait 2-3 minutes after pushing
- Check that GitHub Pages is enabled in Settings → Pages
- Verify the workflow ran successfully (Actions tab)

### Issue: WebGL Not Working

**Solution:**
- Make sure you're using Chrome, Firefox, or Edge
- Check browser console for errors (F12)
- Ensure HTTPS is enabled (GitHub Pages does this automatically)

### Issue: Audio Not Working

**Solution:**
- Click "Engage" button first (required by browsers)
- Check that audio isn't muted
- Try a different browser (Safari on iOS can be restrictive)

### Issue: Controls Not Responding

**Solution:**
- Click "Engage" to start the game
- Make sure focus is on the game canvas (click once)
- Try keyboard controls (WASD) instead of touch

---

## 📊 GitHub Pages Limits

- **Bandwidth**: 100 GB/month (plenty for a game)
- **Storage**: 1 GB (your game is ~50 KB)
- **Build minutes**: 2,000/month (deployment takes ~2 minutes)

Your game is well within all limits!

---

## 🎯 Custom Domain (Optional)

To use your own domain:

1. Go to **Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Update DNS records:
   ```
   Type: CNAME
   Name: www
   Value: ipaliog-a11y.github.io
   ```
4. Create a `CNAME` file in your repo:
   ```
   yourdomain.com
   ```

---

## 📈 Analytics (Optional)

Add Google Analytics to track players:

1. Create a Google Analytics account
2. Add the tracking code to `index.html` before `</head>`:
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'GA_MEASUREMENT_ID');
   </script>
   ```

---

## 🔄 Updating the Game

To update after changes:

```bash
git add .
git commit -m "Update: [describe changes]"
git push origin main
```

The GitHub Actions workflow will automatically redeploy in 2-3 minutes.

---

## 🎉 Success!

Once deployed, you can:

- Share the link with friends
- Embed it in websites
- Add it to your portfolio
- Track usage with analytics

**Your game URL**: `https://ipaliog-a11y.github.io/space-travel/`

---

## 📞 Need Help?

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Report an Issue](https://github.com/ipaliog-a11y/space-travel/issues)

---

**Last Updated**: 2026-08-26
