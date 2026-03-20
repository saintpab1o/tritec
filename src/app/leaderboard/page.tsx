"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEntries(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];
  const medalBg = ["bg-yellow-50", "bg-gray-50", "bg-amber-50"];

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-tritec-blue">Leaderboard</h1>
            <p className="text-gray-400 text-sm mt-1">Top scores across all quiz attempts</p>
          </div>
          <Link
            href="/quiz"
            className="px-5 py-2.5 bg-tritec-blue text-white font-display font-semibold text-sm rounded-xl hover:bg-tritec-blue-light transition-all"
          >
            Take Quiz
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="animate-pulse text-gray-400">Loading scores...</div>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.27.853m0 0H12m0 0a6.002 6.002 0 01-2.27-.853" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-gray-600 mb-1">No scores yet</h3>
            <p className="text-sm text-gray-400">Be the first to take the quiz!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[36px_1fr_auto] gap-2 px-4 sm:px-6 py-3 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <div>#</div>
              <div>Player</div>
              <div className="text-right">Score</div>
            </div>

            <div className="divide-y divide-gray-50">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className="lb-row grid grid-cols-[36px_1fr_auto] gap-2 px-4 sm:px-6 py-3.5 items-center"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div>
                    {i < 3 ? (
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${medalBg[i]} ${medalColors[i]}`}
                      >
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold text-gray-400 bg-gray-50">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{entry.playerName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-600">{entry.score}/{entry.totalQuestions}</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        entry.percentage >= 80
                          ? "bg-green-100 text-green-700"
                          : entry.percentage >= 50
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {entry.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
