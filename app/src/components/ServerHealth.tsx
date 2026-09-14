import { useEffect } from "react";
import { api, syncLocalData } from "../api";

export default function ServerHealth() {
    useEffect(() => {
        let isMounted = true;
        let healthTimeout: ReturnType<typeof setTimeout>;

        const checkHealth = async () => {
            try {
                const res = await api.healthCheck();
                if (!isMounted) return;

                if (res && res.status === 200) {
                    // When server is online, trigger pending sync in background
                    void syncLocalData().catch(() => {});
                    // Recheck in 10 minutes
                    healthTimeout = setTimeout(checkHealth, 10 * 60 * 1000);
                } else {
                    // Retry in 30 seconds
                    healthTimeout = setTimeout(checkHealth, 30 * 1000);
                }
            } catch {
                if (!isMounted) return;
                // Server unavailable; continue working with SQLite and retry in 30s
                healthTimeout = setTimeout(checkHealth, 30 * 1000);
            }
        };

        // Fire health check in background when app loads
        checkHealth();

        return () => {
            isMounted = false;
            if (healthTimeout) clearTimeout(healthTimeout);
        };
    }, []);

    // Never block user with full-screen "Connecting to server" modal
    return null;
}
