import { display, body } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AiOutlineHome, AiOutlineUpload, AiOutlineUser } from "react-icons/ai";

export default function Footer() {
  return (
    <footer className="bg-teal comic-border rounded-none border-x-0 border-b-0 mt-12">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className={cn(display.className, "text-2xl text-[#2c2c2c]")}>SIGNALTALENT</span>
            <p className={cn(body.className, "text-sm text-[#2c2c2c]/70")}>
              Get your resume roasted &amp; discover high-signal talent!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="comic-btn bg-cream comic-shadow-2 comic-lift text-sm">
              <AiOutlineHome /> Home
            </Link>
            <Link href="/upload" className="comic-btn bg-peach comic-shadow-2 comic-lift text-sm">
              <AiOutlineUpload /> Upload
            </Link>
            <Link href="/profile" className="comic-btn bg-yellow comic-shadow-2 comic-lift text-sm">
              <AiOutlineUser /> Profile
            </Link>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className={cn(body.className, "text-xs text-[#2c2c2c]/60")}>
            &copy; {new Date().getFullYear()} SignalTalent. Keep it kind!
          </p>
        </div>
      </div>
    </footer>
  );
}
