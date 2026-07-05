import { useQuery } from '@tanstack/react-query';
import { useSession } from '../auth/hooks';
import { fetchMailbox } from '../api/accountMailbox';
import { getApiBaseUrl } from '../api/client';
export function useCurrentMailUser() {
    const session = useSession();
    const email = session?.user.email ?? 'guest@kora.local';
    const name = session?.user.displayName ?? 'You';
    return { email, name };
}
export function useUnreadCount() {
    const session = useSession();
    const apiBaseUrl = getApiBaseUrl();
    const { data } = useQuery({
        queryKey: ['mailbox', session?.user.email],
        queryFn: ({ signal }) => fetchMailbox(apiBaseUrl, session.token, signal),
        enabled: Boolean(session?.token),
        staleTime: 30_000,
    });
    return (data?.messages ?? []).filter((message) => message.folder === 'inbox' && !message.read).length;
}
