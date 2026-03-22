/* eslint-disable @typescript-eslint/no-explicit-any */

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptLoadPromise: Promise<void> | null = null;

function ensureScript(): Promise<void> {
    if ((window as any).turnstile) return Promise.resolve();

    if (scriptLoadPromise) return scriptLoadPromise;

    scriptLoadPromise = new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(SCRIPT_ID);
        if (existing) {
            // Script tag exists but hasn't finished loading yet
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Turnstile script failed')));
            // If it already loaded (race condition), turnstile will be on window
            if ((window as any).turnstile) resolve();
            return;
        }

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Turnstile script failed'));
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
}

export function useTurnstile(siteKey: Ref<string> | ComputedRef<string>) {
    const token = ref('');
    const el = ref<HTMLElement>();
    let widgetId: string | null = null;

    async function render() {
        if (!el.value || !siteKey.value) return;

        try {
            await ensureScript();
        } catch {
            return;
        }

        const ts = (window as any).turnstile;
        if (!ts) return;

        // Remove previous widget if exists
        if (widgetId !== null) {
            try {
                ts.remove(widgetId);
            } catch {
                // ignore
            }
            widgetId = null;
        }

        widgetId = ts.render(el.value, {
            sitekey: siteKey.value,
            callback: (t: string) => {
                token.value = t;
            },
            'expired-callback': () => {
                token.value = '';
            },
            'error-callback': () => {
                token.value = '';
            }
        });
    }

    onMounted(() => {
        render();
    });

    onBeforeUnmount(() => {
        if (widgetId !== null && (window as any).turnstile) {
            try {
                (window as any).turnstile.remove(widgetId);
            } catch {
                // ignore
            }
            widgetId = null;
        }
    });

    return { token, el };
}
