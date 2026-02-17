"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, User, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Placeholder — will integrate BetterAuth later
        await new Promise((r) => setTimeout(r, 800));
        router.push("/editor");
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: "#1a1d23" }}
        >
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
                style={{ background: "radial-gradient(circle, #C28437 0%, transparent 70%)" }}
            />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[420px] mx-4">

                <div className="rounded-2xl border border-white/[0.08] p-8 md:p-10"
                    style={{ background: "rgba(30, 33, 39, 0.95)", backdropFilter: "blur(20px)" }}
                >
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-4"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                            <Bus size={40} className="text-white/90" strokeWidth={1.5} />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">BU Bus</h1>
                        <p className="text-sm text-white/40 mt-1">ระบบจัดการเส้นทางรถตู้</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wide">Username</label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                                    <User size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all focus:ring-2 focus:ring-[#C28437]/50 border border-white/[0.08]"
                                    style={{ background: "rgba(255,255,255,0.04)" }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wide">Password</label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all focus:ring-2 focus:ring-[#C28437]/50 border border-white/[0.08]"
                                    style={{ background: "rgba(255,255,255,0.04)" }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                            style={{
                                background: "linear-gradient(135deg, #C28437 0%, #8a7344 50%, #C28437 100%)",
                                boxShadow: "0 4px 20px rgba(194, 132, 55, 0.3)",
                            }}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : "Sign In"}
                        </button>

                        {/* Terms Checkbox */}
                        <label className="flex items-start gap-2.5 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-[#C28437] focus:ring-[#C28437]/50 accent-[#C28437]"
                            />
                            <span className="text-[11px] leading-relaxed text-white/35 group-hover:text-white/50 transition-colors">
                                ข้าพเจ้ายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัวของระบบ BU Bus
                            </span>
                        </label>

                    </form>
                </div>
            </div>
        </div>
    );
}
