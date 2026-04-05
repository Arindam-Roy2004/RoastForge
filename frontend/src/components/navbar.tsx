"use client";

import { display } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FaBars,
  FaEllipsisV,
  FaHome,
  FaTimes,
  FaUpload,
  FaUserCircle,
  FaSearch,
  FaBriefcase,
  FaFolderOpen,
  FaSignOutAlt,
} from "react-icons/fa";

import { useAuth } from "@/store/auth";

export default function Navbar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const loggedIn = !!user;

  return (
    <nav className="sticky top-0 z-50 bg-teal comic-border rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/"
            className={cn(display.className, "comic-btn bg-cream comic-shadow-3 comic-lift text-sm")}
          >
            <FaHome /> Home
          </Link>
          <Link
            href="/upload"
            className={cn(display.className, "comic-btn bg-peach comic-shadow-3 comic-lift text-sm")}
          >
            <FaUpload /> Upload Resume
          </Link>
        </div>

        {/* Brand */}
        <Link href="/" className="flex flex-col items-center">
          <span
            className={cn(display.className, "text-2xl md:text-3xl text-[#2c2c2c] tracking-wide")}
          >
            ROASTFORGE
          </span>
          <span className="text-[10px] font-bold text-[#2c2c2c]/70 tracking-widest hidden sm:block">
            ROAST YOUR RESUME
          </span>
        </Link>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/projects"
            className={cn(display.className, "comic-btn bg-beige comic-shadow-3 comic-lift text-sm")}
          >
            <FaFolderOpen /> Projects
          </Link>
          {loggedIn ? (
            <>
              <Link
                href="/profile"
                className={cn(display.className, "comic-btn bg-yellow comic-shadow-3 comic-lift text-sm")}
              >
                <FaUserCircle /> Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try { await logout(); } catch {}
                  router.push("/");
                }}
                className={cn(display.className, "comic-btn bg-red-400 comic-shadow-3 comic-lift text-sm")}
              >
                <FaSignOutAlt />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={cn(display.className, "comic-btn bg-green-400 comic-shadow-3 comic-lift text-sm")}
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Left */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setIsNavOpen(!isNavOpen); setIsProfileOpen(false); }}
            className={cn(display.className, "comic-icon-btn bg-cream comic-shadow-3 comic-lift")}
          >
            {isNavOpen ? <FaTimes /> : <FaBars />}
          </button>
          {isNavOpen && (
            <div className="absolute top-16 left-4 z-50 w-56 rounded-2xl comic-border bg-[#EBDDBF] comic-shadow-6 overflow-hidden">
              <Link href="/" onClick={() => setIsNavOpen(false)} className={cn(display.className, "flex items-center gap-3 px-4 py-3 text-base font-bold hover:bg-[#EFD7B7] border-b border-[#2c2c2c]/20")}>
                <FaHome /> Home
              </Link>
              <Link href="/upload" onClick={() => setIsNavOpen(false)} className={cn(display.className, "flex items-center gap-3 px-4 py-3 text-base font-bold hover:bg-[#F8E4C6] border-b border-[#2c2c2c]/20")}>
                <FaUpload /> Upload Resume
              </Link>
              <Link href="/projects" onClick={() => setIsNavOpen(false)} className={cn(display.className, "flex items-center gap-3 px-4 py-3 text-base font-bold hover:bg-[#F2D5A3] border-b border-[#2c2c2c]/20")}>
                <FaFolderOpen /> Projects
              </Link>
              <Link href="/recruiter" onClick={() => setIsNavOpen(false)} className={cn(display.className, "flex items-center gap-3 px-4 py-3 text-base font-bold hover:bg-[#97D4D5]")}>
                <FaBriefcase /> Recruiter
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Right */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNavOpen(false); }}
            className={cn(display.className, "comic-icon-btn bg-yellow comic-shadow-3 comic-lift")}
          >
            {isProfileOpen ? <FaTimes /> : <FaEllipsisV />}
          </button>
          {isProfileOpen && (
            <div className="absolute top-16 right-4 z-50 w-56 rounded-2xl comic-border bg-[#EBDDBF] comic-shadow-6 overflow-hidden">
              <Link href="/profile" onClick={() => setIsProfileOpen(false)} className={cn(display.className, "flex items-center gap-3 px-4 py-3 text-base font-bold hover:bg-[#F2D5A3] border-b border-[#2c2c2c]/20")}>
                <FaUserCircle /> My Profile
              </Link>
              {loggedIn ? (
                <button type="button" onClick={async () => { try { await logout(); } catch {} setIsProfileOpen(false); router.push("/"); }} className={cn(display.className, "flex items-center gap-3 px-4 py-3 text-base font-bold hover:bg-red-300 w-full text-left")}>
                  <FaSignOutAlt /> Sign Out
                </button>
              ) : (
                <Link href="/login" onClick={() => setIsProfileOpen(false)} className={cn(display.className, "flex items-center gap-3 px-4 py-3 text-base font-bold hover:bg-green-300")}>
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Close overlay */}
        {(isNavOpen || isProfileOpen) && (
          <div className="fixed inset-0 z-40" onClick={() => { setIsNavOpen(false); setIsProfileOpen(false); }} />
        )}
      </div>
    </nav>
  );
}
