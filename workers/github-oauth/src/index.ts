interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  ALLOWED_ORIGIN: string
  CALLBACK_URL: string
}

type TokenRequest = {
  code?: string
  code_verifier?: string
}

const isPkceValue = (value: string | null) =>
  Boolean(value && /^[a-zA-Z0-9._~-]{43,128}$/.test(value))

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  ...securityHeaders,
  Vary: 'Origin',
})

const json = (body: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/authorize') {
      const state = url.searchParams.get('state')
      const codeChallenge = url.searchParams.get('code_challenge')
      if (!state || !/^[a-zA-Z0-9_-]{32,160}$/.test(state)) {
        return json({ error: 'Invalid OAuth state.' }, 400, env.ALLOWED_ORIGIN)
      }
      if (!isPkceValue(codeChallenge)) {
        return json({ error: 'Invalid PKCE challenge.' }, 400, env.ALLOWED_ORIGIN)
      }

      const authorize = new URL('https://github.com/login/oauth/authorize')
      authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
      authorize.searchParams.set('redirect_uri', env.CALLBACK_URL)
      authorize.searchParams.set('scope', 'read:user public_repo')
      authorize.searchParams.set('state', state)
      authorize.searchParams.set('code_challenge', codeChallenge!)
      authorize.searchParams.set('code_challenge_method', 'S256')
      return new Response(null, {
        status: 302,
        headers: {
          ...securityHeaders,
          Location: authorize.toString(),
        },
      })
    }

    const origin = request.headers.get('Origin') ?? ''
    if (origin !== env.ALLOWED_ORIGIN) {
      return json({ error: 'Origin is not allowed.' }, 403, env.ALLOWED_ORIGIN)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'POST' || url.pathname !== '/token') {
      return json({ error: 'Not found.' }, 404, origin)
    }
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
      return json({ error: 'Content-Type must be application/json.' }, 415, origin)
    }

    const body = (await request.json().catch(() => ({}))) as TokenRequest
    if (!body.code || !isPkceValue(body.code_verifier ?? null)) {
      return json({ error: 'Missing OAuth code or PKCE verifier.' }, 400, origin)
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: body.code,
        code_verifier: body.code_verifier,
        redirect_uri: env.CALLBACK_URL,
      }),
    })
    const result = (await response.json()) as Record<string, unknown>

    if (!response.ok || typeof result.access_token !== 'string') {
      return json(
        {
          error:
            typeof result.error_description === 'string'
              ? result.error_description
              : 'GitHub OAuth exchange failed.',
        },
        400,
        origin,
      )
    }

    return json(
      {
        access_token: result.access_token,
        scope: result.scope,
        token_type: result.token_type,
      },
      200,
      origin,
    )
  },
}
