import { Bus } from "lucide-react";

export function Header() {
    return (
        <header className="glass-card-dark absolute left-4 top-4 z-10 flex items-center gap-3 px-4 py-3 animate-slideUp">
            {/* Bus Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Bus size={20} className="text-white" />
            </div>

            <div>
                <h1 className="font-heading text-base font-bold tracking-tight text-muted">BU Tram</h1>
                <p className="text-xs text-white/40">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-fresh animate-pulse-soft" />
                        Live Tracking
                    </span>
                </p>
            </div>
        </header>
    );
}
