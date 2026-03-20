"use client";

import Header from "@/components/Header";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      <main className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="animate-fade-in-up">
          <div className="inline-block mb-8">
            <Image
              src="/logo.jpeg"
              alt="TRITEC"
              width={120}
              height={120}
              className="rounded-xl shadow-lg"
              priority
            />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-tritec-blue tracking-tight mb-3">
            Who&apos;s Who
          </h1>
          <p className="text-lg font-semibold mb-2">
            <span className="text-tritec-blue">Have Fun</span>
            <span className="text-tritec-gold mx-2 font-bold text-xl">\</span>
            <span className="text-tritec-blue">Win</span>
            <span className="text-tritec-gold mx-2 font-bold text-xl">\</span>
            <span className="text-tritec-blue">Be Nice</span>
          </p>
          <p className="text-gray-600 text-base mb-12 max-w-md mx-auto leading-relaxed">
            How well do you know your TRITEC team? Match faces to names and titles to prove it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-tritec-blue text-white font-display font-semibold text-lg rounded-xl hover:bg-tritec-blue-light transition-all shadow-lg shadow-tritec-blue/20 hover:shadow-xl hover:shadow-tritec-blue/25 hover:-translate-y-0.5"
            >
              Start Quiz
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-tritec-blue font-display font-semibold text-lg rounded-xl border-2 border-gray-200 hover:border-tritec-gold transition-all hover:-translate-y-0.5"
            >
              Leaderboard
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-5 px-3 text-center">
            <div className="text-4xl font-display font-extrabold text-tritec-blue">73</div>
            <div className="text-sm text-gray-600 mt-1 font-semibold">Team Members</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-5 px-3 text-center">
            <div className="text-4xl font-display font-extrabold text-tritec-gold">4</div>
            <div className="text-sm text-gray-600 mt-1 font-semibold">Rounds</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-5 px-3 text-center">
            <div className="text-4xl font-display font-extrabold text-tritec-blue">1</div>
            <div className="text-sm text-gray-600 mt-1 font-semibold">Winner</div>
          </div>
        </div>
      </main>
    </div>
  );
}
