# SayaSanaa OS · Deploy Guide

Стек: **Supabase (Postgres)** + **GitHub** + **Vercel**

---

## 1. Supabase төсөл үүсгэх

1. https://supabase.com → New Project үүсгэх
   - **Region**: `Southeast Asia (Singapore)` — Монголд хамгийн ойр
   - **Database Password**: хүчтэй нууц үг үүсгэн хадгална
2. **Project Settings → Database → Connection string**-аас 2 URL хуулна:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`
   - **Session pooler / Direct** (port `5432`) → `DIRECT_URL`
3. URL дотор `[YOUR-PASSWORD]` хэсэгт алхам 1-д тогтоосон нууц үгээ оруулна.

Жишээ:

```
DATABASE_URL="postgresql://postgres.abcxyz:MySecret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.abcxyz:MySecret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

## 2. Локал орчинд тест

```bash
# .env-д DATABASE_URL, DIRECT_URL, AUTH_SECRET-аа оруулсан байх ёстой
npm install
npm run db:push       # схемийг Supabase руу түлхэнэ
npm run db:seed       # admin@saysanaa.mn / Admin@123
npm run dev
```

## 3. GitHub repo

```bash
# Локал
git add -A
git commit -m "feat: initial SayaSanaa OS scaffold"

# GitHub дээр шинэ repo үүсгээд (UI эсвэл gh CLI)
git remote add origin https://github.com/<USER>/saysanaa-os.git
git branch -M main
git push -u origin main
```

> **Service token (PAT) ашиглах**:
> ```bash
> git push https://<USER>:<GITHUB_PAT>@github.com/<USER>/saysanaa-os.git main
> ```
> PAT-г `Settings → Developer settings → Personal access tokens` дотроос `repo` эрхтэй үүсгэнэ.

## 4. Vercel deploy

1. https://vercel.com/new → **Import** товчоор GitHub repo сонгоно.
2. Framework: **Next.js** (автоматаар таних)
3. **Environment Variables** хэсэгт нэмнэ (Production + Preview + Development):
   - `DATABASE_URL` (pooled, 6543)
   - `DIRECT_URL` (direct, 5432)
   - `AUTH_SECRET` (Vercel дээр `openssl rand -base64 48` гэж шинээр үүсгэх)
   - `APP_NAME` = `SayaSanaa OS`
4. **Deploy** дарна. Дараагийн `git push` бүр автомат deploy хийгдэнэ.

### Анхны schema-г production-д түлхэх

Vercel deploy-ийн өмнө эсвэл дараа локалаас:

```bash
DATABASE_URL="<prod direct url>" DIRECT_URL="<prod direct url>" npm run db:push
DATABASE_URL="<prod direct url>" DIRECT_URL="<prod direct url>" npm run db:seed
```

> ℹ️ Анхны seed-г нэг л удаа ажиллуулна. Дараа нь нууц үгийг `admin@saysanaa.mn`-аар нэвтэрч өөрчилнө.

## 5. Production шалгах

1. Vercel-ийн өгсөн URL руу нэвтэрнэ.
2. `admin@saysanaa.mn` / `Admin@123` → 2FA setup → ажилтан нэмэх.
3. **Анх удаа deploy-ийн дараа дараах зүйлсийг хийнэ:**
   - Admin нууц үгийг солих (ажилтнаа засаад нууц үг шинэчилнэ)
   - `AUTH_SECRET` нь production-д үнэхээр санамсаргүй болохыг шалгах
   - Supabase RLS (Row Level Security) — бид Prisma-аар хандаж байгаа учир хэрэггүй, гэхдээ public anon key-г задлахгүй

## 6. Дараагийн алхамууд

- **Supabase Storage**: ажилтны зургийг upload хийх. `photoUrl`-ийг URL-аар хадгалаад, Storage bucket-ийн public URL-г оноох.
- **Custom domain**: Vercel → Project → Domains.
- **Backup**: Supabase Pro plan-аас Point-in-Time Recovery.
- **Audit log review**: `AuditLog` table-ийг Supabase Dashboard-аас харах.

---

## Common errors

| Алдаа | Шийдэл |
|---|---|
| `prepared statement "s0" already exists` | `DATABASE_URL`-д `?pgbouncer=true&connection_limit=1` хийсэн эсэхээ шалгах |
| `Can't reach database server` | Supabase project paused эсэх — Dashboard дээр Resume |
| `P3009 migrate failed` | `DIRECT_URL` тохируулаагүй, эсвэл port буруу (5432 байх ёстой) |
| Vercel build "PrismaClient is unable to be run in the browser" | `postinstall: prisma generate` ажилласан эсэхийг шалгах |
