import { consola } from 'consola';
import type { PlatformVerifier, VerifyResult } from './types';

const logger = consola.withTag('platform:atcoder');

function decodeHtmlEntities(input: string): string {
    return input
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function extractAffiliation(html: string): string | null {
    const match = html.match(
        /<tr>\s*<th[^>]*>\s*Affiliation\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/i
    );
    if (!match) {
        return null;
    }

    const affiliationCell = match[1];
    if (!affiliationCell) {
        return null;
    }

    const raw = affiliationCell
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();

    return decodeHtmlEntities(raw).trim();
}

export const atcoderVerifier: PlatformVerifier = {
    platform: 'atcoder',
    displayName: 'AtCoder',

    async verify({ platformUid, code, credential }): Promise<VerifyResult> {
        const username = platformUid.trim();

        if (!username) {
            return {
                success: false,
                platformUid,
                error: 'AtCoder username is required'
            };
        }

        void credential;

        logger.info(`Verifying AtCoder profile for username=${username}`);

        try {
            const html = await $fetch<string>(
                `https://atcoder.jp/users/${encodeURIComponent(username)}`,
                {
                    responseType: 'text',
                    headers: {
                        'user-agent': 'CP-OAuth/1.0 (+https://atcoder.jp)'
                    }
                }
            );

            const affiliation = extractAffiliation(html);
            if (!affiliation) {
                logger.warn(`Affiliation row not found for username=${username}`);
                return {
                    success: false,
                    platformUid: username,
                    error: 'Affiliation not found on AtCoder profile'
                };
            }

            if (!affiliation.includes(code)) {
                logger.warn(`Verification code not found in affiliation for username=${username}`);
                return {
                    success: false,
                    platformUid: username,
                    error: 'Verification code not found in Affiliation'
                };
            }

            logger.success(`Verified: username=${username}`);
            return {
                success: true,
                platformUid: username,
                platformUsername: username
            };
        } catch (e: unknown) {
            const err = e as { statusCode?: number; message?: string };
            if (err.statusCode === 404) {
                return {
                    success: false,
                    platformUid: username,
                    error: 'AtCoder user not found'
                };
            }
            return {
                success: false,
                platformUid: username,
                error: err.message || 'Verification failed'
            };
        }
    }
};
