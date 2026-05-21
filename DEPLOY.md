# SayaSanaa OS · Deploy Guide

Стек: **Supabase (Postgres + Storage)** + **GitHub** + **Vercel**

GitHub repo: https://github.com/grafx88104099/saysanaa

---

## 1. Vercel project үүсгэх

1. https://vercel.com/new нээх
2. **Import Git Repository** → GitHub аккаунттай холбоо тогтоосон бол `grafx88104099/saysanaa` гарна → **Import**
3. **Framework**: Next.js (автомат таних)
4. **Root Directory**: `/` (default)
5. **Build Command**: (vercel.json-аас уншигдана — `prisma generate && next build`)
6. **Install Command**: `npm install` (default)
7. **Environment Variables** — доорх 6 утгыг нэмнэ (Production + Preview + Development)

| Хувьсагч | Утга | Тайлбар |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<pw>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | Pooled (port 6543) |
| `DIRECT_URL` | `postgresql://postgres.<ref>:<pw>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres` | Direct (port 5432) — migrate-д |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Storage upload-д |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Storage service-role token |
| `AUTH_SECRET` | `openssl rand -base64 48` гэж шинэ үүсгэх | 32+ тэмдэгт |
| `APP_NAME` | `SayaSanaa OS` | (заавал биш) |

8. **Deploy** товч → ~2 минутын дотор build болоод live болно

---

## 2. Анхны setup (Production database)

Шинэ Supabase project бол schema бэлдэх + admin үүсгэх ажил локалаас хийнэ:

```bash
# Production DB-руу хандах .env.production файл түр үүсгэнэ
echo 'DATABASE_URL="<prod-direct-url>"' > .env.production
echo 'DIRECT_URL="<prod-direct-url>"' >> .env.production

# Schema push (бүх 10+ model)
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d'"' -f2) \
DIRECT_URL=$(grep DIRECT_URL .env.production | cut -d'"' -f2) \
npx prisma db push

# Admin seed
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d'"' -f2) \
DIRECT_URL=$(grep DIRECT_URL .env.production | cut -d'"' -f2) \
npm run db:seed

# Файлыг устгана (нууцлал)
rm .env.production
```

> Локал dev DB-г production болгож ашигладаг бол энэ алхам шаардлагагүй — мэдээллүүд аль хэдийн байгаа.

---

## 3. Анхны login (Vercel дээр)

1. Vercel-ийн өгсөн URL руу нэвтэрнэ (`https://<project>.vercel.app/login`)
2. И-мэйл: `admin@saysanaa.mn`, нууц үг: `Admin@123`
3. **/2fa/setup** руу шилжүүлнэ → Google Authenticator-аар QR уншуулж 2FA идэвхжүүлнэ
4. Profile хуудаст admin password-оо солих (production-д жинхэнэ нууц үгээр)

---

## 4. Дараагийн git push бүр автомат deploy

```bash
git add -A
git commit -m "feat: ..."
git push origin main
```

Vercel автоматаар шинэ build үүсгэж ~2 минутын дотор deploy хийнэ. PR-руу push хийвэл preview URL гарна.

---

## 5. Supabase Storage buckets

Vercel deploy-ийн дараа эхний удаа upload хийгдэхэд автоматаар үүснэ:
- `avatars` — ажилтны profile зураг
- `contracts` — төслийн гэрээ файл (PDF, DOC, XLS)
- `task-files` — Task-д хавсаргасан файлууд

Бүгд public read, гэхдээ upload зөвхөн нэвтэрсэн ADMIN/PM-д.

---

## 6. Production шалгалт

Deploy дууссаны дараа:

- [ ] `/login` нь HTTPS-ээр ачаалагдаж байна
- [ ] Admin нэвтэрч 2FA setup амжилттай хийгдэв
- [ ] `/admin/projects` дээр Supabase-ээс ирсэн 5 жишээ төсөл харагдана
- [ ] `/display` руу kiosk token-оор нэвтрэв
- [ ] `/admin/projects/[id]` дээр task үүсгэж файл хавсарган Storage руу upload хийгдэв
- [ ] Audit log-д `project.create`, `task.attach` зэрэг үйлдлүүд бичигдэв

---

## 7. Custom domain

Vercel → Project → **Domains** → "Add" дарж домэйнээ оруулна. DNS-д CNAME эсвэл A record нэмж баталгаажуулна.

---

## Алдаа гарвал

| Алдаа | Шийдэл |
|---|---|
| `Can't reach database server` | Supabase paused эсэх — Dashboard дээр Resume |
| `prepared statement "s0" already exists` | `DATABASE_URL`-д `?pgbouncer=true&connection_limit=1` байгаа эсэх |
| `PrismaClient is unable to be run in the browser` | `postinstall` script нь Vercel build дээр ажилласан эсэх (package.json) |
| Storage upload 400 | bucket анх удаа үүсэх үед service role key зөв эсэх |
| 2FA код "буруу" | server clock skew — Supabase region (Singapore/Tokyo) болон Vercel region ойрхон сонгох |

---

## Хэрэгцээ гарвал · Локал production-руу хандах

```bash
# Production DB-руу холбогдсон CLI
DATABASE_URL="<prod-direct-url>" npx prisma studio
```

Browser-аас `localhost:5555` дээр Prisma Studio нээгдэж production DB-ийг graph view-р удирдана.
