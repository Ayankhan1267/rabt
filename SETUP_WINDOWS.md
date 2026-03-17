# 🚀 RABT HQ — Windows Setup Guide
# Bilkul beginner ke liye — step by step

## ═══════════════════════════════════
## STEP 1: Node.js Install karo
## ═══════════════════════════════════

1. Browser mein jao: https://nodejs.org
2. "LTS" wala green button click karo (18.x ya 20.x)
3. Download hogi ek .msi file
4. Double click karo → Next → Next → Install
5. Installation complete hone do

Verify karo: PowerShell kholo aur type karo:
```
node --version
```
v18.x.x ya v20.x.x dikhega — perfect!

## ═══════════════════════════════════
## STEP 2: Project folder banao
## ═══════════════════════════════════

1. C:\Users\(tumhara naam)\ folder mein jao
2. New folder banao: "rabt-hq"
3. Ye sari files us folder mein copy karo:
   - package.json
   - next.config.js
   - tailwind.config.js
   - postcss.config.js
   - tsconfig.json
   - .env.local
   - app/ folder (sara)
   - lib/ folder (sara)
   - supabase/ folder (sara)

## ═══════════════════════════════════
## STEP 3: PowerShell mein run karo
## ═══════════════════════════════════

Windows key + R → "powershell" type karo → Enter

Phir ye commands ek ek karke run karo:

```powershell
# 1. Folder mein jao
cd C:\Users\YOUR_NAME\rabt-hq

# 2. Dependencies install karo (5-10 minutes lagenge)
npm install

# 3. Dev server start karo
npm run dev
```

Browser mein jao: http://localhost:3000
Dashboard dikhega! 🎉

## ═══════════════════════════════════
## STEP 4: Environment Variables Set karo
## ═══════════════════════════════════

.env.local file kholo (Notepad se) aur fill karo:

```
NEXT_PUBLIC_SUPABASE_URL=https://jaethgobdyjrgeyfeedn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0NImIRAeX9jzLGjikURSxg_O0JPgnog
SUPABASE_SERVICE_ROLE_KEY=  ← Supabase Dashboard > Settings > API > service_role
MONGO_URI=mongodb+srv://rabtnaturals:Wd1cex7xub@cluster0.toblnpp.mongodb.net/rabt
ANTHROPIC_API_KEY=  ← claude.ai pe jaake API key lena
NEXT_PUBLIC_MONGO_API_URL=https://rabt-api.onrender.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

.env.local save karo → PowerShell mein Ctrl+C → dobara npm run dev

## ═══════════════════════════════════
## STEP 5: Supabase Database Setup
## ═══════════════════════════════════

1. Supabase Dashboard kholo: https://supabase.com
2. Project: jaethgobdyjrgeyfeedn
3. Left sidebar: SQL Editor
4. "New query" click karo
5. supabase/schema.sql file ka poora content copy karo
6. Paste karo SQL Editor mein
7. "Run" button click karo

Tables ban jaayengi! ✅

## ═══════════════════════════════════
## STEP 6: Vercel pe Deploy karo (FREE)
## ═══════════════════════════════════

Vercel pe deploy karne se tumhara dashboard 24/7 live rahega.

1. GitHub pe jao: https://github.com
2. New repository: "rabt-hq"
3. Upload karo saari files

Phir:
1. Vercel pe jao: https://vercel.com
2. "New Project" → GitHub se import karo "rabt-hq"
3. Environment Variables add karo (wahi .env.local wale)
4. Deploy!

URL milega: https://rabt-hq.vercel.app 🚀

## ═══════════════════════════════════
## COMMON ERRORS & FIXES
## ═══════════════════════════════════

Error: "node is not recognized"
→ Node.js properly install nahi hua. Restart karo computer aur dobara try karo.

Error: "npm ERR! code ENOENT"  
→ Sahi folder mein nahi ho. cd C:\Users\NAME\rabt-hq type karo

Error: "Module not found"
→ npm install dobara run karo

Error: "NEXT_PUBLIC_SUPABASE_URL missing"
→ .env.local file check karo, sahi jagah hai na?

## ═══════════════════════════════════
## DONE! Dashboard Features:
## ═══════════════════════════════════

✅ Login (Supabase Auth)
✅ Dashboard with KPIs + Charts
✅ Orders (MongoDB + HQ, COD/Prepaid filter)
✅ CRM with WhatsApp direct connect
✅ Finance with full P&L
✅ Real-time notifications
✅ Role-based access (Founder, Manager, Specialist, Ops, Support)
✅ MongoDB integration (live website data)

Aur bahut kuch aur pages hai jo same pattern se kaam karte hain!
