import { Settings, Bell, Search } from "lucide-react";

export function Header() {
    return (
        <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full flex-col gap-4 bg-gradient-to-b from-white/95 via-white/70 to-transparent px-4 pb-6 pt-6 dark:from-[#111111]/95 dark:via-[#111111]/70 md:top-4 md:left-4 md:w-[380px] md:rounded-3xl md:bg-white/90 md:pt-6 md:pb-6 md:shadow-2xl md:backdrop-blur-xl md:border md:border-white/20 md:dark:bg-[#111111]/90 md:dark:border-white/5 md:bg-none">
            {/* Top Navigation */}
            <div className="pointer-events-auto flex w-full items-center justify-between">
                <button className="p-1.5 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white/50 dark:bg-black/20 rounded-full md:bg-transparent">
                    <Settings size={22} strokeWidth={1.5} />
                </button>

                <h1 className="text-lg font-bold text-[#1e293b] tracking-wide dark:text-white">
                    BU Bus
                </h1>

                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 border border-orange-100 text-orange-400 transition-colors hover:bg-orange-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:bg-orange-500/10 dark:border-orange-500/20 dark:hover:bg-orange-500/20">
                    <Bell size={18} strokeWidth={2.5} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="pointer-events-auto relative mt-1 w-full rounded-[2rem] bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md border border-gray-100/50 dark:bg-[#1f1f1f]/95 dark:border-white/5 dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] md:shadow-inner md:bg-gray-50/80 md:dark:bg-black/40">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                    <Search size={18} className="text-gray-400/80" strokeWidth={2} />
                </div>
                <input
                    type="text"
                    placeholder="Search"
                    className="block w-full border-none bg-transparent py-3.5 pl-12 pr-4 text-[15px] placeholder-gray-400/80 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white rounded-[2rem]"
                />
            </div>
        </header>
    );
}
