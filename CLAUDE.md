# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
```bash
# Development
npm run dev              # Start development server with Turbopack

# Building and Production
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run type-check      # TypeScript type checking

# Database
npm run migrate         # Run database migrations (via MCP)

# Testing
npm run test:e2e        # Run Playwright E2E tests
```

### Git Workflow
```bash
# After implementing features
git add .
git commit -m "feat: [実装内容の日本語要約]"
git push origin main
```

## Architecture

### Technology Stack
- **Framework**: Next.js 15.3.2 with App Router
- **Language**: TypeScript (strict mode)
- **UI**: Shadcn/ui components (Radix UI based)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Payments**: Stripe
- **I18n**: next-intl (ja/en)

### Project Structure
```
src/
├── app/[locale]/          # Internationalized routes
│   ├── (public)/         # Public photobook pages
│   ├── admin/            # Admin dashboard
│   ├── auth/             # Authentication
│   ├── bookings/         # Booking management
│   ├── instant/          # Instant photo requests
│   ├── messages/         # Messaging system
│   ├── photo-sessions/   # Photo session management
│   └── photobooks/       # Digital photobooks
├── components/           # React components
├── lib/                 # Utilities and configs
└── types/               # TypeScript definitions
```

### Key Design Patterns

#### 1. Server Components First
- Use Server Components by default
- Client Components only when necessary (user interaction, browser APIs)
- Server Actions for data mutations

#### 2. Type Safety
- 100% TypeScript coverage
- No `any` types allowed
- Next.js 15 page props must be Promise types:
```typescript
interface PageProps {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string }>;
}
```

#### 3. UI/UX Protection Rules
**CRITICAL**: Never modify layouts, designs, colors, spacing, or any visual elements without explicit user request. Only bug fixes and accessibility improvements are allowed.

#### 4. Internationalization
All user-facing text must use translation keys. No hardcoded Japanese/English text allowed:
```typescript
// ❌ Bad
<Button>予約する</Button>

// ✅ Good
const t = useTranslations('booking');
<Button>{t('reserve')}</Button>
```

#### 5. Date/Time Formatting
Use provided utility functions, NOT toLocaleString():
```typescript
import { formatDateLocalized, formatTimeLocalized } from '@/lib/utils/date';

// ✅ Correct
formatDateLocalized(new Date(date), 'ja', 'long')

// ❌ Wrong - causes errors
<DateTime value={date} format="date-long" />
```

### Database Schema
- 35+ tables with Row Level Security (RLS)
- Complex relationships for users, sessions, bookings, payments
- Real-time features via Supabase
- Migrations in `supabase/migrations/`

### Important Development Rules

#### TODO Management
After implementing any feature:
1. Update `.cursor/rules/dev-rules/todo.mdc`
2. Mark completed tasks: `[ ]` → `[x]`
3. Record implementation time and technical achievements
4. Commit and push changes

#### Commit Rules
- Use Japanese commit messages
- Follow conventional commits format:
```
feat: 新機能追加の要約
fix: バグ修正の内容
docs: ドキュメント更新
refactor: リファクタリング内容
```

#### Dependency Management
- Check compatibility before adding packages
- Use `--legacy-peer-deps` for peer dependency conflicts
- Always run `npm run build` after changes
- Update `.npmrc` if needed

### Critical Warnings

1. **UI/UX Changes**: Absolutely forbidden without explicit request
2. **Hardcoded Text**: All text must use i18n keys
3. **DateTime Component**: Do NOT use - causes "Invalid time value" errors
4. **Any Types**: Forbidden - use `unknown` instead
5. **Console Logs**: Remove before committing

### Testing
- E2E tests with Playwright
- Run before major changes: `npm run test:e2e`
- Test files in `/tests/e2e/`

### Useful Resources
- Development rules: `.cursor/rules/dev-rules/development.mdc`
- UI guide: `.cursor/rules/dev-rules/ui-guide.mdc`
- TODO list: `.cursor/rules/dev-rules/todo.mdc`
- Feature docs: `.cursor/rules/dev-rules/[feature].mdc`