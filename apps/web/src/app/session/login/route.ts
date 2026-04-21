import { NextRequest, NextResponse } from 'next/server';
import { exchangePasswordCredentials, persistSession } from '../../../lib/auth';

const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type IdentityContext = {
  roles?: string[];
};

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth') || value.startsWith('/become-')) {
    return '/dashboard';
  }

  return value;
}

function deriveRole(roles?: string[]) {
  if (roles?.includes('platform_admin')) return 'admin';
  if (roles?.includes('logistics_company')) return 'logistics';
  if (roles?.includes('customs_broker')) return 'customs';
  if (roles?.includes('supplier_user')) return 'supplier';
  if (roles?.includes('customer_user')) return 'buyer';
  return 'guest';
}

function resolvePostLoginPath(returnTo: string, role: string) {
  const genericTargets = new Set(['/', '/dashboard', '/signin', '/register', '/register/buyer', '/register/supplier']);

  if (!genericTargets.has(returnTo)) {
    return returnTo;
  }

  if (role === 'logistics') {
    return '/logistics';
  }

  if (role === 'customs') {
    return '/customs';
  }

  if (role === 'supplier' || role === 'buyer' || role === 'admin') {
    return '/dashboard';
  }

  return returnTo;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      returnTo?: string;
    };
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';
    const returnTo = normalizeReturnTo(body.returnTo ?? '/dashboard');

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const session = await exchangePasswordCredentials(email, password, request.headers.get('host'));

    if (session.profile.emailVerified === false) {
      return NextResponse.json(
        {
          success: false,
          error: 'Verify your email before signing in.'
        },
        { status: 403 }
      );
    }

    await persistSession(session);

    let role = 'guest';
    try {
      const response = await fetch(`${internalApiBaseUrl}/api/identity/context`, {
        headers: {
          authorization: `Bearer ${session.accessToken}`
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const context = (await response.json()) as IdentityContext;
        role = deriveRole(context.roles);
      }
    } catch {
      // Fall back to a safe generic destination if role lookup fails.
    }

    return NextResponse.json({
      success: true,
      redirectTo: resolvePostLoginPath(returnTo, role)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign in right now.';
    return NextResponse.json({ success: false, error: message }, { status: message === 'Invalid email or password.' ? 401 : 500 });
  }
}
