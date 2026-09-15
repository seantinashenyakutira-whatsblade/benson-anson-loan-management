# Scope Creep: src/middleware.ts

## Classification: REAL_CODE_UNTESTED

This file contains 19 lines — a thin wrapper that calls the
supabase/middleware.ts updateSession function. Belongs to Phase 2.

## Original Contents

```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|manifest.json|sw.js).*)',
  ],
};
```

## Action
Stripped back to empty stub. Phase 2 will rebuild.
