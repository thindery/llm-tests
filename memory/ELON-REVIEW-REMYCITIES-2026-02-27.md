# ELON'S BRUTAL REVIEW: RemyCities MVP

**Date:** 2026-02-27  
**Tone:** First principles. Cut the bullshit.

---

## 🔥 THE HARD TRUTH

You're solving the wrong problem.

Tradespeople don't have websites because they don't have websites. They don't have them because **they don't need them**. A plumber's best marketing is a 5-star Google review from Mrs. Johnson down the street, not a slick Astro site.

You're building a rocketship when they need a bicycle.

---

## 1. CORE VALUE: WHY DOES THIS EXIST?

**Does a plumber want AI to build their site?**

No. They want a site that shows up when someone Googles "plumber near me" and a phone number that rings. That's it.

**What's their #1 problem?**

Getting jobs. Not building websites. Their pain is:
- Finding customers (lead gen)
- Managing bookings
- Getting paid
- Reviews/reputation

**You built a website builder for people who don't want to build websites.**

Delete 80% of the product. Focus on:  
`Text → Landing Page → Google My Business Integration → Done`

---

## 2. SPEED TO MARKET: WHY ISN'T THIS LIVE?

You're over-engineering.

**What's the MINIMUM for beta?**
```
- 3 starter templates (plumbing/HVAC/lawn)
- 1-click deploy to Vercel
- No billing (free trial)
- No GitHub automation
- No staging
- No tenant isolation
```

**Manual everything for 5 customers.** That's it.

**Why aren't you live right now?**

Because you're building features nobody asked for instead of talking to 5 plumbers.

STOP CODING. GO TALK TO PLUMBERS.
Call 10. Ask 3 questions:
1. Do you have a website?
2. If not, why not?
3. What would make you pay $29/month?

Build only what they ask for. Nothing else.

---

## 3. COST & EFFICIENCY: THE MATH IS BROKEN

**Unit Economics:**
```
Revenue: $29/month
Costs:
  - Vercel Pro: $20/month
  - Kimi API: ~$5-10/month (per active user)
  - Stripe fees: $0.87/month
  - Your time: INFINITE
  - Support: You don't have a support system
```

**You're losing money on every customer.**

At $29/month, you need to:
- Support costs <$5/customer
- Kimi costs <$3/customer
- Vercel needs to be Team plan shared across users

**Can you make this profitable?** No, not at $29/month with these costs.

Either:
1. Charge $79/month (test demand first)
2. Build your own infra (cut Vercel)
3. Raise prices 3x

**What's stopping copy-paste?**

Nothing. Your prompts will be reverse-engineered week one. Your advantage isn't AI—it's **workflow integration**. Lock in the plumber's entire workflow (scheduling + invoicing + reviews), not just the site builder.

---

## 4. MOAT: YOU HAVE NONE

**Why can't Wix crush you tomorrow?**

They can. And they will. Wix AI launched months ago. Squarespace has AI. GoDaddy has a $12/month AI builder.

**Your actual advantage?**

You're small. You can talk to every customer personally. You can iterate 10x faster than them.

But you're not using it. You're building like a bigco with 10% of the resources.

**Your ONLY defensibility:**
- Vertical specialization (trades only)
- Customer intimacy (know every plumber by name)
- Workflow lock-in (booking + reviews + invoicing)

A standalone site builder? **Dead in 6 months.**

---

## 5. WHAT TO ADD (CRITICAL)

**Before you launch, you NEED:**

1. **SMS Integration** (PAY FOR THIS NOW)  
   Tradespeople live on their phones. Dashboards are useless to them. Text them when they get a lead. Period.

2. **Google Reviews Auto-Request**  
   This is THE feature. After job completion, auto-text: "How did we do?" → 5 stars → happy customer. This is what they actually pay for.

3. **Before/After Photo Upload**  
   Plumbers LOVE showing off their work. Make it stupid easy to upload from phone → auto-generates portfolio section. No AI prompt needed.

4. **Template Gallery with REAL Screenshots**  
   "Here's Bob's plumbing site. Looks like this. Yours can look like this too."

**Without these, you're just a worse Wix.**

---

## 6. WHAT TO CUT (RUTHLESS EDITION)

**DELETE THESE NOW:**

- ❌ **Tenant Isolation** - Not needed for 5 beta users
- ❌ **GitHub Automation** - Manual repo creation for beta is fine
- ❌ **Stripe Billing** - Free trial, invoice later
- ❌ **Staging Environments** - Overkill for plumbers
- ❌ **Real-time SSE chat interface** - Make it async. They'll wait 30 seconds.
- ❌ **Astro starter complexity** - Just use Next.js templates

**Keep:**
- Landing page + signup
- 3 templates
- Text-to-site (keep it simple)
- Your phone number for support (yes, really)

---

## ✂️ THE PLAN: ELON CUTS

**Week 1:**
```
DELETE: GitHub automation, staging, tenant isolation
KEEP: Landing page, signup, 3 templates, basic AI site gen
BILLING: Invoice customers manually or free beta
CUSTOMERS: Get 3 plumbers to agree to test
```

**Week 2:**
```
BUILD: SMS integration (Twilio, $1/month)
BUILD: Google review request flow
CALL: Every beta customer daily
```

**Week 3:**
```
LAUNCH: Soft launch with 3 customers
PRICE: $0 for 30 days, then $79/month (not $29)
GOAL: Get 3 paying customers OR pivot
```

**IF NO ONE PAYS, KILL IT.**

---

## 🎯 FINAL VERDICT

You're building in the wrong direction.

**The real product isn't "AI builds your site."**

**The real product is "you never have to think about marketing again."**

Plumbers don't care about websites. They care about:
1. Phone ringing
2. Jobs booked
3. Reviews flowing
4. Getting paid

Your site builder is a feature. Your moat is **the full workflow**.

**TL;DR:** Delete 80% of your code, talk to 5 plumbers, build only what they ask for, charge 3x more, specialize in trades, add SMS and review generation.

**Stop building. Start selling.**

Everything else is masturbation.

---

*Written as Elon Musk reviewing RemyCities MVP*  
*Date: 2026-02-27*
