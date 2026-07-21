"use client";

import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";
import { Search, Upload, Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserButton } from "@clerk/nextjs";

export function Navbar() {
  const { isSignedIn } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden items-center gap-1 md:flex">
            <Link href="/search">
              <Button variant="ghost" size="sm">
                Channels
              </Button>
            </Link>
            <Link href="/search?category=trending">
              <Button variant="ghost" size="sm">
                Trending
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>
          </div>
        </div>

        {/* Center - Search */}
        <div className="hidden flex-1 justify-center px-8 lg:flex">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search channels, videos, creators..."
              className="h-10 rounded-full border-border/50 bg-muted/50 pl-10 pr-4"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 lg:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {isSignedIn ? (
            <>
              <Link href="/upload" className="hidden sm:block">
                <Button size="sm" className="gap-2 bg-reel hover:bg-reel/90">
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-reel" />
              </Button>
              <ThemeToggle />
              <UserButton
                appearance={{
                  elements: { avatarBox: "h-8 w-8" },
                }}
              />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up" className="hidden sm:block">
                <Button size="sm" className="bg-reel hover:bg-reel/90">
                  Get Started
                </Button>
              </Link>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Search */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 px-4 py-3 lg:hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="h-10 rounded-full border-border/50 bg-muted/50 pl-10"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              <Link href="/search" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Channels
                </Button>
              </Link>
              <Link href="/search?category=trending" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Trending
                </Button>
              </Link>
              <Link href="/pricing" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Pricing
                </Button>
              </Link>
              {isSignedIn && (
                <Link href="/upload" className="block">
                  <Button className="w-full bg-reel hover:bg-reel/90">Upload Reel</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
