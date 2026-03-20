"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.jpeg"
            alt="TRITEC"
            width={48}
            height={48}
            className="rounded"
            priority
          />
          <div className="hidden sm:block">
            <h1 className="font-display text-lg font-bold tracking-tight text-tritec-blue leading-none">
              TRITEC
            </h1>
            <p className="text-[13px] font-medium leading-tight mt-0.5">
              <span className="text-tritec-blue">Have Fun</span>
              <span className="text-tritec-gold mx-1.5 font-bold">\</span>
              <span className="text-tritec-blue">Win</span>
              <span className="text-tritec-gold mx-1.5 font-bold">\</span>
              <span className="text-tritec-blue">Be Nice</span>
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-tritec-blue rounded-lg hover:bg-gray-50 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/quiz"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-tritec-blue rounded-lg hover:bg-gray-50 transition-colors"
          >
            Quiz
          </Link>
          <Link
            href="/leaderboard"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-tritec-blue rounded-lg hover:bg-gray-50 transition-colors"
          >
            Leaderboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
