# DNS Setup Guide - userpaths.com

**Branch:** `feature/USER-243-domain`  
**Ticket:** REMY-243  
**Status:** Domain registration requires manual completion (browser-based payment)

---

## ✅ Domain Availability Check

```bash
./check-domain.py userpaths.com
```

**Result:** Domain is AVAILABLE ✅

---

## AC-001: Domain Registration (MANUAL REQUIRED)

### Option 1: Cloudflare Registrar (Recommended)

Cloudflare offers at-cost domain registration with:
- No add-on fees or inflated renewal costs
- Free WHOIS privacy protection (automatic)
- Free DNS, CDN, SSL included
- Native DNSSEC support

**Steps:**

1. **Create/Login to Cloudflare Account**
   - Visit: <https://dash.cloudflare.com/sign-up/registrar>
   - Sign up with email or Google/Apple/GitHub
   - Verify email address

2. **Register userpaths.com**
   - Go to: <https://domains.cloudflare.com/?domain=userpaths.com>
   - Search for `userpaths.com`
   - Add to cart and complete checkout
   - **Expected cost:** ~$10-12/year for .com domain

3. **Verify Domain Ownership**
   - Domain will appear in your Cloudflare dashboard automatically
   - WHOIS privacy is enabled by default (redacts personal info)

### Option 2: Namecheap (Alternative)

**Steps:**

1. Visit: <https://www.namecheap.com/domains/registration/results/?domain=userpaths.com>
2. Add to cart
3. Enable free domain privacy protection (WhoisGuard)
4. Complete checkout

---

## AC-002: DNS Configuration Records

After domain registration, configure these DNS records:

### Cloudflare DNS Records

| Type | Name | Content/Value | TTL | Proxy Status |
|------|------|---------------|-----|--------------|
| CNAME | `www` | `cname.vercel-dns.com` | Auto | Proxied (Orange Cloud) |
| A | `api` | `[Railway backend IP - PENDING]` | Auto | Proxied (Orange Cloud) |

### Redirect Configuration

**Root domain redirect:** `userpaths.com` → `www.userpaths.com`

In Cloudflare:
1. Go to **Rules** → **Transform Rules** or use **Page Rules**
2. Create URL forwarding:
   - **From:** `userpaths.com/*`
   - **To:** `https://www.userpaths.com/$1`
   - **Status:** 301 (Permanent)

---

## AC-003: Cloudflare Configuration

### Initial Setup

1. **Add Site to Cloudflare**
   - If using Cloudflare Registrar: Site is already added
   - If using other registrar: Add userpaths.com as a new site

2. **Update Nameservers (if not using Cloudflare Registrar)**
   
   Replace current nameservers with:
   ```
   lara.ns.cloudflare.com
   zeus.ns.cloudflare.com
   ```

### Proxy Configuration

Ensure these DNS records have proxy enabled (Orange Cloud ☁️):

| Record | Proxy Status | Why |
|--------|--------------|-----|
| `www.userpaths.com` | ✅ Proxied | Vercel frontend benefits from CDN |
| `api.userpaths.com` | ✅ Proxied | Railway backend needs SSL/TLS |

### SSL/TLS Configuration

1. Go to **SSL/TLS** → **Overview**
2. Select mode: **Full (strict)**
   - This ensures end-to-end encryption between Cloudflare and origin
3. Verify SSL certificate provisioning:
   - Cloudflare will automatically provision universal SSL
   - Status should show "Active" within ~15-30 minutes

### Additional Recommended Settings

```
SSL/TLS:
  - SSL/TLS encryption: Full (strict)
  - Edge certificates: Universal SSL (free)
  - Always Use HTTPS: ON
  - Automatic HTTPS Rewrites: ON

Security:
  - Security Level: Medium (default)
  - Bot Fight Mode: Optional

Performance:
  - Caching Level: Standard
  - Browser Cache TTL: 4 hours (adjust as needed)
  - Automatic Platform Optimization: ON (if using WordPress)
```

---

## AC-004: Post-Deployment Actions

After Railway backend is deployed:

1. **Get Railway IP**
   ```bash
   # From Railway dashboard
   # 1. Go to your project → Settings → Networking
   # 2. Note the assigned IP address
   ```

2. **Update DNS A Record**
   - Update `api.userpaths.com` A record with Railway IP

3. **Verify SSL Certificates**
   - Check https://www.userpaths.com
   - Check https://api.userpaths.com
   - Both should show valid SSL (lock icon)

4. **Complete the Event**
   ```bash
   openclaw system event --text "Done: USER-243 Domain - userpaths.com registered, DNS configured, SSL active" --mode now
   ```

---

## Verification Checklist

### Domain Registration
- [ ] Domain `userpaths.com` registered
- [ ] WHOIS privacy enabled
- [ ] Domain visible in Cloudflare dashboard

### DNS Records
- [ ] `www.userpaths.com` → CNAME → `cname.vercel-dns.com`
- [ ] `api.userpaths.com` → A → `[Railway IP]`
- [ ] Root domain redirect configured

### Cloudflare Configuration
- [ ] Cloudflare nameservers active (if applicable)
- [ ] Proxy enabled for www record
- [ ] Proxy enabled for api record
- [ ] SSL/TLS mode: Full (strict)
- [ ] Universal SSL certificate active

---

## Quick Reference

### Cloudflare Nameservers
```
lara.ns.cloudflare.com
zeus.ns.cloudflare.com
```

### DNS Records Summary
```
# A Records
api.userpaths.com A [Railway IP]

# CNAME Records
www.userpaths.com CNAME cname.vercel-dns.com

# Redirect
userpaths.com → 301 → www.userpaths.com
```

### Useful URLs
- Cloudflare Dashboard: <https://dash.cloudflare.com>
- Domain Search: <https://domains.cloudflare.com>
- Vercel DNS: <https://vercel.com/docs/rest-api#cname-value>
- Railway Custom Domains: <https://docs.railway.app/deploy/domains>

---

## Notes

- **Domain registration is manual** due to payment/CAPTCHA requirements
- **Vercel CNAME:** `cname.vercel-dns.com` (standard for Vercel custom domains)
- **Railway IP:** Will be provided after Railway deployment
- **Propagation Time:** DNS changes may take up to 24-48 hours to propagate globally

---

**Created:** 2026-03-28  
**Author:** OpenClaw Subagent  
**Branch:** feature/USER-243-domain
