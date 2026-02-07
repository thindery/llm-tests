# Store Setup Guide: store.remylobster.com

**Goal:** Printful + Shopify integration for zero-fulfillment merch.

---

## Step 1: Create Shopify Store (15 min)

1. Go to **shopify.com**
2. Start free trial
3. Store name: "Remy Store" or "Built in Public"
4. Skip all the setup wizards (we'll configure manually)

**Important:** Shopify gives you a free `remy-store.myshopify.com` subdomain temporarily. We'll change to custom domain later.

---

## Step 2: Install Printful App (5 min)

1. In Shopify admin → Apps
2. Search "Printful" → Install
3. Connect Printful account (create one if needed)
4. Authorize Printful to manage products

---

## Step 3: Create Products (20 min)

**In Printful dashboard:**
1. Click "Add Product"
2. Choose category (Men's Clothing → T-Shirts)
3. Upload your avatar image
4. Position it on the product mockup
5. Select variants (sizes, colors)
6. Set prices (Printful shows base cost + your markup)

**Repeat for:**
- Hoodie
- Sticker pack
- Mug
- Phone case

**Printful automatically:**
- Creates products in Shopify
- Syncs inventory (always "in stock" for POD)
- Sets up mockup images
- Handles pricing

---

## Step 4: Configure Subdomain (10 min)

**In Shopify:**
1. Settings → Domains
2. "Connect existing domain"
3. Enter: `store.remylobster.com`

**In Cloudflare DNS:**
```
Type: CNAME
Name: store
Target: shops.myshopify.com
Proxy status: DNS only (gray cloud)
```

**Verify:** Wait for SSL certificate auto-provision (5-30 min)

---

## Step 5: Customize Store (30 min)

**Shopify Theme:**
1. Online Store → Themes
2. Pick "Dawn" (free, clean, fast)
3. Customize colors to match blog:
   - Primary: #E85C2B (lobster orange)
   - Background: #FDF8F3 (cream) or #1A1F36 (navy dark)

**Essential Pages:**
- Home (featured products)
- Shop (all products)
- About (link to main blog)
- FAQ (shipping, returns — Printful handles both)

**Navigation:**
- Logo links to remylobster.com
- "Blog" link in nav back to main site

---

## Step 6: Connect to Main Blog (5 min)

**In remy-blog nav (Header.astro):**
Add link: `<a href="https://store.remylobster.com">Store</a>`

**In store footer:**
Add link: "Read the Blog" → remylobster.com

---

## Step 7: Test Order (Optional)

1. Place test order (use your own address)
2. See Printful fulfillment flow
3. Verify shipping notification emails
4. **Cancel test order before it prints**

---

## Ongoing: Zero Work

Once set up, this runs itself:

| Task | Who |
|------|-----|
| Printing | Printful |
| Shipping | Printful |
| Inventory | Infinite (POD) |
| Customer questions | You (rare) |
| Returns | Printful handles |
| New product ideas | You (when inspired) |

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Shopify Basic | $29/mo |
| Printful | $0 (pay per product printed + shipping) |
| Domain | $0 (subdomain uses existing) |
| **Total fixed cost** | **$29/mo** |

**Break-even:** 3 t-shirt sales/month covers Shopify cost.

---

## Design Assets Needed

Upload to Printful:
- [ ] Avatar PNG (transparent background, 3000x3000px ideal)
- [ ] "Built in Public" text asset for backs of shirts
- [ ] Logo mark (simplified lobster for small stickers)

---

## Launch Checklist

- [ ] Shopify store created
- [ ] Printful app installed & connected
- [ ] 5 products created and synced
- [ ] store.remylobster.com subdomain connected
- [ ] Theme customized to match blog
- [ ] Blog nav updated with Store link
- [ ] Test order placed and canceled
- [ ] First real customer order 🎉

---

**Time to launch:** ~90 minutes one-time setup

**Time per month after:** ~0 minutes (fully automated)

🦞💰 Let's sell some lobster swag.
