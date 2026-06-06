# Resend Email Setup

## Status

✅ **Email address:** hello@tradereceptionist.com  
✅ **API key in local .env:** YES  
⏳ **API key in Railway:** NEEDS SETUP (see below)

---

## What Is Resend?

Resend is the transactional email service we use to send:
- Welcome emails (when users sign up)
- Call summaries (after each call)
- Booking confirmations
- Support replies

---

## Setup Steps (One-Time)

### 1. Log into Resend Dashboard

Go to: https://resend.com/dashboard

(You should have a login — if not, create one or ask for access)

### 2. Verify Domain

1. Click **Domains** (left sidebar)
2. Find or add **tradereceptionist.com**
3. Follow the DNS verification steps (add CNAME records to your domain host)
4. Once verified, you can send from **hello@tradereceptionist.com**

### 3. Copy API Key

1. Go to **API Keys** (left sidebar)
2. Copy your API key (starts with `re_`)
3. Add it to Railway (see below)

---

## Setting the API Key in Railway

You have two options:

### Option A: Via Railway Dashboard (Recommended)

1. Go to: https://railway.app → Select project **respectful-success**
2. Click **Trade-receptionist** service
3. Go to **Variables**
4. Click **+ New Variable**
5. Add:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_MypdDsqc_...` (paste your API key)
6. Click **Save**

Railway will auto-redeploy (~2 minutes).

### Option B: Via Terminal

```bash
# Set locally (already done)
echo "RESEND_API_KEY=re_..." >> .env

# You would push to Railway via: (requires Railway CLI)
railway env push
```

---

## Verification

After setting the API key in Railway, test it:

1. **Make a test call** via `/test-call` in the dashboard
2. **Check email** — you should receive a welcome email at your registered email
3. **Check subject** — should say "Welcome, Nicholas" (or your business name)
4. **Check from address** — should show `hello@tradereceptionist.com`

If you don't get the email:
- Wait 2 minutes (Resend takes time)
- Check spam/junk folder
- Check Railway logs for errors (look for "RESEND_API_KEY not set")

---

## Current Config

**Local .env (✅):**
```
RESEND_API_KEY=re_MypdDsqc_3TxT8FJqM69MHnt89FJmcMXT
RESEND_FROM_EMAIL=hello@tradereceptionist.com
```

**Railway (⏳):**
- RESEND_API_KEY: NOT SET — needs to be added manually
- RESEND_FROM_EMAIL: Not needed (defaults to hello@tradereceptionist.com in code)

---

## What Happens If API Key Isn't Set?

If the API key is missing from Railway:
- Welcome emails won't send (users won't get their number + divert code)
- Call summaries won't send
- Booking confirmations won't send
- Users can still use the product, but won't get automated email notifications

**This is a blocker for launch.** You need to set it before going live.

---

## Troubleshooting

### "Resend failed: unauthorized"
- API key is invalid or expired
- Check you copied it correctly
- Regenerate a new one in Resend dashboard

### "RESEND_API_KEY not set"
- Not set in Railway
- Check Railway Variables (should be there after you save)
- Restart the Railway service if needed

### Welcome email sending from wrong address
- Check `RESEND_FROM_EMAIL` env var
- Make sure the domain is verified in Resend
- Resend won't send from unverified domains

### Emails going to spam
- Add SPF/DKIM records (Resend provides these — check domain setup)
- After adding records, wait 24–48 hours for propagation
- Test with Raisebox or similar to check deliverability

---

## Support

If anything breaks:
- Check Resend status: https://status.resend.com
- Check Railway logs: Select service → Logs tab
- Reach out to: hello@tradereceptionist.com (or your backup contact)

---

**Next:** After setting the API key, verify with a test call and you're ready to launch. 🚀
