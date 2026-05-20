# SayaSanaa OS — v0.1

Интерьер дизайны студийн дотоод удирдлагын систем. Эхний хувилбарт **Нэвтрэлт + Ажилтны бүртгэл** модулийг бүрэн хэрэгжүүлсэн. Цаашид Төсөл, FF&E, Худалдан авалт, Санхүү, Захиалагчийн портал зэрэг модулиуд нэмэгдэнэ.

## Технологи

- **Next.js 16** (App Router, Server Actions) + React 19 + TypeScript
- **Supabase** (managed PostgreSQL) + **Prisma ORM**
- Custom Auth: **bcrypt** + JWT (jose) + **TOTP 2FA** (otplib)
- **Tailwind CSS** dark theme
- **Vercel** hosting

## Шаардлага

- Node.js 20+
- npm 10+
- [Supabase](https://supabase.com) акаунт (үнэгүй tier хангалттай)

## Анхны суулгалт

```bash
# 1. Supabase project үүсгэж DATABASE_URL, DIRECT_URL хуулах
#    Дэлгэрэнгүй: DEPLOY.md → 1-р хэсэг

# 2. .env үүсгэх
cp .env.example .env
#    DATABASE_URL, DIRECT_URL, AUTH_SECRET-ийг бөглөх

# 3. Хамаарлууд
npm install

# 4. Өгөгдлийн сангийн схемээ Supabase руу түлхэх
npm run db:push

# 5. Анхны админ үүсгэх
npm run db:seed
# admin@saysanaa.mn / Admin@123

# 6. Хөгжүүлэлтийн сервер
npm run dev
```

Бүрэн deploy заавар: [DEPLOY.md](./DEPLOY.md)

Дараа нь http://localhost:3000 руу нэвтэрнэ.

## Нэвтрэлтийн урсгал

1. `/login` → и-мэйл + нууц үг
2. Анх удаагийн нэвтрэлтэд → `/2fa/setup` (QR код, Google Authenticator)
3. Дараагийн нэвтрэлтүүдэд → `/2fa` (6 оронтой код)
4. → `/dashboard`

## Эрхийн систем (RBAC)

| Эрх | Тайлбар | Ажилтны модуль |
|---|---|---|
| **ADMIN** | Системийн админ | бүх эрх (нэмэх, засах, идэвхгүй болгох, нууц үг шинэчлэх) |
| **PM** | Төслийн менежер | харах, нэмэх, засах |
| **DESIGNER** | Дизайнер | харагдахгүй |
| **ACCOUNTANT** | Нягтлан | харагдахгүй |
| **CLIENT** | Захиалагч | харагдахгүй |

## Файлын бүтэц

```
src/
  app/
    (app)/              # Нэвтэрсний дараах хуудаснууд
      layout.tsx        # Sidebar + Topbar
      dashboard/
      employees/        # CRUD + actions.ts
    login/              # /login + server actions
    2fa/                # /2fa, /2fa/setup
  components/           # Sidebar, Topbar, EmployeeForm
  lib/
    db.ts               # Prisma client
    session.ts          # JWT session, requireUser/Role
    totp.ts             # TOTP 2FA helpers
    audit.ts            # AuditLog бичлэг
    labels.ts           # Монгол хэлний шошго
  middleware.ts         # Route guard
prisma/
  schema.prisma         # User, Employee, AuditLog
  seed.ts               # Анхны админ
```

## Дараагийн модулиуд

Системийн дизайн нь шинэ модуль нэмэхэд хялбар. Жишээ нь `/projects` модуль нэмэх бол:

1. `prisma/schema.prisma`-д `Project` моделыг нэмэх
2. `src/app/(app)/projects/` доор хуудаснуудаа үүсгэх
3. `src/components/Sidebar.tsx`-д цэс нэмэх

Бүх auth, session, RBAC, audit log аль хэдийн бэлэн.
