interface GoogleTokenResponse {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    id_token?: string;
    scope?: string;
}

interface GoogleUserInfo {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
}

export interface GoogleIdentity {
    platformUid: string;
    platformUsername: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    avatarUrl: string | null;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export function buildGoogleAuthorizationUrl(params: {
    clientId: string;
    redirectUri: string;
    state: string;
}): string {
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', params.state);
    return url.toString();
}

export async function exchangeGoogleAuthorizationCode(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}): Promise<GoogleTokenResponse> {
    const form = new URLSearchParams({
        code: params.code,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
        grant_type: 'authorization_code'
    });

    const token = await $fetch<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
    });

    if (!token.access_token) {
        throw createError({
            statusCode: 502,
            message: 'Google token response missing access_token'
        });
    }

    return token;
}

export async function resolveGoogleIdentity(accessToken: string): Promise<GoogleIdentity> {
    const user = await $fetch<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!user?.sub) {
        throw createError({ statusCode: 502, message: 'Unable to resolve Google user identity' });
    }

    const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : null;

    return {
        platformUid: user.sub,
        platformUsername: email || `google_${user.sub}`,
        email,
        emailVerified: Boolean(user.email_verified),
        displayName: user.name || null,
        avatarUrl: user.picture || null
    };
}
