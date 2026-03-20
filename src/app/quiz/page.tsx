"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { funFacts } from "@/data/funFacts";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  title: string;
  headshot: string;
  gender: "M" | "F";
}

interface QuizResult {
  employee: Employee;
  nameCorrect: boolean;
  titleCorrect: boolean;
}

type Phase = "loading" | "name-entry" | "name-guess" | "title-guess" | "round-results" | "final-results";

const ROUND_SIZE = 20;
const AUTO_ADVANCE_MS = 1700;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let pass = 0; pass < 2; pass++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }
  return a;
}

function buildOptions(correct: string, distractors: string[]): string[] {
  const getRandomInt = (max: number) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };
  const slots: string[] = new Array(3);
  const correctSlot = getRandomInt(3);
  slots[correctSlot] = correct;
  let d = 0;
  for (let i = 0; i < 3; i++) {
    if (i !== correctSlot) {
      slots[i] = distractors[d] || `Unknown ${d}`;
      d++;
    }
  }
  return slots;
}

function pickGenderMatchedDistractors(correct: Employee, allEmployees: Employee[], count: number): string[] {
  const sameGender = allEmployees.filter((e) => e.gender === correct.gender && e.displayName !== correct.displayName);
  return shuffleArray(sameGender).slice(0, count).map((e) => e.displayName);
}

function pickTitleDistractors(correct: string, allEmployees: Employee[], count: number): string[] {
  const otherTitles = Array.from(new Set(allEmployees.map((e) => e.title).filter((t) => t !== correct)));
  return shuffleArray(otherTitles).slice(0, count);
}

// Direct API call - not in React lifecycle, no stale closures
async function submitToLeaderboard(name: string, score: number, total: number): Promise<boolean> {
  try {
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: name.trim(),
        score,
        totalQuestions: total,
      }),
    });
    const data = await res.json();
    console.log("Leaderboard response:", res.status, data);
    return res.ok;
  } catch (e) {
    console.error("Leaderboard submit error:", e);
    return false;
  }
}

export default function QuizPage() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [masterOrder, setMasterOrder] = useState<Employee[]>([]);
  const [roundEmployees, setRoundEmployees] = useState<Employee[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundStartIdx, setRoundStartIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [playerName, setPlayerName] = useState("");

  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [roundResults, setRoundResults] = useState<QuizResult[]>([]);

  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [locked, setLocked] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const [nameSelection, setNameSelection] = useState<{ value: string; correct: boolean } | null>(null);
  const [titleSelection, setTitleSelection] = useState<{ value: string; correct: boolean } | null>(null);

  const [activeFunFact, setActiveFunFact] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [usedFunFacts, setUsedFunFacts] = useState<number[]>([]);

  // Leaderboard save tracking
  const [leaderboardSaved, setLeaderboardSaved] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for data that needs to be current in callbacks
  const allResultsRef = useRef<QuizResult[]>([]);
  const playerNameRef = useRef("");

  // Keep refs in sync
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data: Employee[]) => {
        setAllEmployees(data);
        setMasterOrder(shuffleArray(data));
        setPhase("name-entry");
      })
      .catch(console.error);
  }, []);

  const isLastRound = roundStartIdx + roundEmployees.length >= masterOrder.length;

  const setupQuestion = useCallback((emp: Employee, emps: Employee[]) => {
    const nameDistractors = pickGenderMatchedDistractors(emp, emps, 2);
    setNameOptions(buildOptions(emp.displayName, nameDistractors));
    const titleDistractors = pickTitleDistractors(emp.title, emps, 2);
    setTitleOptions(buildOptions(emp.title, titleDistractors));
    setSelectedName("");
    setNameSelection(null);
    setTitleSelection(null);
    setLocked(false);
  }, []);

  const startRound = useCallback((startIdx: number, rNum: number) => {
    const chunk = masterOrder.slice(startIdx, startIdx + ROUND_SIZE);
    setRoundEmployees(chunk);
    setRoundResults([]);
    setCurrentIndex(0);
    setRoundNumber(rNum);
    setRoundStartIdx(startIdx);
    setLeaderboardSaved(false);
    setLeaderboardError(false);
    setTransitioning(false);

    const emp = chunk[0];
    if (!emp) return;
    setupQuestion(emp, allEmployees);
    setPhase("name-guess");
  }, [masterOrder, allEmployees, setupQuestion]);

  const currentEmployee = roundEmployees[currentIndex];
  const roundTotal = roundEmployees.length;
  const progress = roundTotal > 0 ? (currentIndex / roundTotal) * 100 : 0;

  const finishRound = useCallback(async () => {
    setPhase("round-results");
    // Submit immediately using refs (always current)
    const results = allResultsRef.current;
    const name = playerNameRef.current;
    const score = results.filter((r) => r.nameCorrect && r.titleCorrect).length;
    const total = results.length;
    if (name && total > 0) {
      const ok = await submitToLeaderboard(name, score, total);
      setLeaderboardSaved(ok);
      setLeaderboardError(!ok);
    }
  }, []);

  const advanceToNext = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= roundTotal) {
      finishRound();
      return;
    }

    setTransitioning(true);
    setTimeout(() => {
      const emp = roundEmployees[nextIdx];
      if (!emp) return;
      setupQuestion(emp, allEmployees);
      setCurrentIndex(nextIdx);
      setPhase("name-guess");
      setTimeout(() => setTransitioning(false), 50);
    }, 300);
  }, [currentIndex, roundTotal, roundEmployees, allEmployees, setupQuestion, finishRound]);

  const getRandomFunFact = useCallback((): string | null => {
    const available = funFacts.map((_, i) => i).filter((i) => !usedFunFacts.includes(i));
    if (available.length === 0) return null;
    const pick = available[Math.floor(Math.random() * available.length)];
    setUsedFunFacts((prev) => [...prev, pick]);
    return funFacts[pick];
  }, [usedFunFacts]);

  const addResult = (result: QuizResult) => {
    setRoundResults((prev) => [...prev, result]);
    setAllResults((prev) => {
      const next = [...prev, result];
      allResultsRef.current = next;
      return next;
    });
  };

  const handleNameSelect = (name: string) => {
    if (locked) return;
    setLocked(true);
    const correct = name === currentEmployee.displayName;
    setSelectedName(name);
    setNameSelection({ value: name, correct });

    if (correct) {
      setTimeout(() => {
        setNameSelection(null);
        setLocked(false);
        setPhase("title-guess");
      }, 600);
    } else {
      setStreak(0);
      setActiveFunFact(null);
      addResult({ employee: currentEmployee, nameCorrect: false, titleCorrect: false });
      timerRef.current = setTimeout(() => advanceToNext(), AUTO_ADVANCE_MS);
    }
  };

  const handleTitleSelect = (title: string) => {
    if (locked) return;
    setLocked(true);
    const correct = title === currentEmployee.title;
    setTitleSelection({ value: title, correct });
    addResult({ employee: currentEmployee, nameCorrect: true, titleCorrect: correct });

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > 0 && newStreak % 3 === 0) {
        const fact = getRandomFunFact();
        if (fact) {
          setActiveFunFact(fact);
          timerRef.current = setTimeout(() => {
            setActiveFunFact(null);
            advanceToNext();
          }, 7000);
          return;
        }
      }
    } else {
      setStreak(0);
      setActiveFunFact(null);
    }

    timerRef.current = setTimeout(() => advanceToNext(), AUTO_ADVANCE_MS);
  };

  const skipFunFact = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveFunFact(null);
    advanceToNext();
  };

  const retryLeaderboard = async () => {
    const results = allResultsRef.current;
    const score = results.filter((r) => r.nameCorrect && r.titleCorrect).length;
    const total = results.length;
    const ok = await submitToLeaderboard(playerName, score, total);
    setLeaderboardSaved(ok);
    setLeaderboardError(!ok);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const roundScore = roundResults.filter((r) => r.nameCorrect && r.titleCorrect).length;
  const cumulativeScore = allResults.filter((r) => r.nameCorrect && r.titleCorrect).length;

  const startQuiz = () => {
    if (!playerName.trim()) return;
    startRound(0, 1);
  };

  const continueNextRound = () => {
    const nextStart = roundStartIdx + roundEmployees.length;
    if (nextStart >= masterOrder.length) {
      setPhase("final-results");
      return;
    }
    startRound(nextStart, roundNumber + 1);
  };

  // Button classes - zero hover, zero transition, zero active color
  const getNameBtnClass = (name: string) => {
    if (!nameSelection) return "bg-gray-50 border-2 border-gray-100 text-gray-700";
    if (name === nameSelection.value && nameSelection.correct) return "bg-green-50 border-2 border-green-400 text-green-700 ring-2 ring-green-200";
    if (name === nameSelection.value && !nameSelection.correct) return "bg-red-50 border-2 border-red-400 text-red-600 ring-2 ring-red-200";
    if (!nameSelection.correct && name === currentEmployee.displayName) return "bg-green-50 border-2 border-green-300 text-green-700";
    return "bg-gray-50 border-2 border-gray-100 text-gray-400 opacity-50";
  };

  const getTitleBtnClass = (title: string) => {
    if (!titleSelection) return "bg-gray-50 border-2 border-gray-100 text-gray-700";
    if (title === titleSelection.value && titleSelection.correct) return "bg-green-50 border-2 border-green-400 text-green-700 ring-2 ring-green-200";
    if (title === titleSelection.value && !titleSelection.correct) return "bg-red-50 border-2 border-red-400 text-red-600 ring-2 ring-red-200";
    if (!titleSelection.correct && title === currentEmployee.title) return "bg-green-50 border-2 border-green-300 text-green-700";
    return "bg-gray-50 border-2 border-gray-100 text-gray-400 opacity-50";
  };

  // --- LOADING ---
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-pulse text-gray-400 font-display text-lg">Loading team data...</div>
        </div>
      </div>
    );
  }

  // --- NAME ENTRY ---
  if (phase === "name-entry") {
    const totalRounds = Math.ceil(allEmployees.length / ROUND_SIZE);
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header />
        <main className="max-w-md mx-auto px-4 pt-20">
          <div className="animate-fade-in-up bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-tritec-blue/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-tritec-blue" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-tritec-blue mb-2">Enter Your Name</h2>
            <p className="text-gray-400 text-sm mb-6">This will appear on the leaderboard</p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startQuiz()}
              placeholder="Your name..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center font-medium text-lg focus:border-tritec-blue focus:outline-none mb-4"
              autoFocus
            />
            <button onClick={startQuiz} disabled={!playerName.trim()} className="w-full py-3 bg-tritec-blue text-white font-display font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed">
              Let&apos;s Go
            </button>
            <p className="text-sm text-gray-500 font-medium mt-4">
              {allEmployees.length} team members across {totalRounds} round{totalRounds > 1 ? "s" : ""} of {ROUND_SIZE}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // --- ROUND RESULTS / FINAL ---
  if (phase === "round-results" || phase === "final-results") {
    const showingFinal = phase === "final-results" || isLastRound;
    const displayResults = showingFinal ? allResults : roundResults;
    const displayScore = showingFinal ? cumulativeScore : roundScore;
    const displayTotal = displayResults.length;
    const percentage = displayTotal > 0 ? Math.round((displayScore / displayTotal) * 100) : 0;
    const nameOnlyCorrect = displayResults.filter((r) => r.nameCorrect && !r.titleCorrect).length;
    const totalWrong = displayResults.filter((r) => !r.nameCorrect).length;
    const nextRoundStart = roundStartIdx + roundEmployees.length;
    const moreRemaining = nextRoundStart < masterOrder.length;

    let emoji = "🏆";
    let message = "Perfect score! You know everyone!";
    if (percentage < 100 && percentage >= 80) { emoji = "🌟"; message = "Impressive! You really know the team."; }
    else if (percentage >= 50) { emoji = "👍"; message = "Solid effort! Keep getting to know the team."; }
    else if (percentage >= 25) { emoji = "📚"; message = "Room to grow! Time to walk the halls more."; }
    else { emoji = "🤔"; message = "Looks like some introductions are in order!"; }

    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header />
        <main className="max-w-2xl mx-auto px-4 pt-12 pb-16">
          <div className="animate-fade-in-up bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mb-6">
            <div className="text-5xl mb-4">{emoji}</div>
            <h2 className="font-display text-3xl font-bold text-tritec-blue mb-1">
              {showingFinal ? "Quiz Complete!" : `Round ${roundNumber} Complete!`}
            </h2>
            <p className="text-gray-400 text-sm mb-6">{message}</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-2xl font-display font-bold text-green-600">{displayScore}</div>
                <div className="text-xs text-green-600/70 font-medium mt-1">Perfect</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="text-2xl font-display font-bold text-amber-600">{nameOnlyCorrect}</div>
                <div className="text-xs text-amber-600/70 font-medium mt-1">Name Only</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-2xl font-display font-bold text-red-500">{totalWrong}</div>
                <div className="text-xs text-red-500/70 font-medium mt-1">Missed</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-5xl font-display font-extrabold text-tritec-blue">{percentage}</span>
              <span className="text-2xl font-display font-bold text-gray-300">%</span>
            </div>

            {leaderboardSaved && (
              <p className="text-xs text-green-600 font-medium mb-4">Score saved to leaderboard</p>
            )}
            {leaderboardError && (
              <div className="mb-4">
                <p className="text-xs text-red-500 font-medium mb-2">Failed to save score</p>
                <button onClick={retryLeaderboard} className="px-4 py-2 bg-tritec-gold text-white text-sm font-semibold rounded-xl">
                  Retry Save
                </button>
              </div>
            )}
            {!leaderboardSaved && !leaderboardError && (
              <p className="text-xs text-gray-400 mb-4">Saving score...</p>
            )}

            {!showingFinal && moreRemaining && (
              <p className="text-sm text-gray-500 mb-4">{masterOrder.length - nextRoundStart} team members remaining</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!showingFinal && moreRemaining && (
                <button onClick={continueNextRound} className="px-6 py-3 bg-tritec-gold text-white font-display font-semibold rounded-xl">
                  Continue (Round {roundNumber + 1})
                </button>
              )}
              <Link href="/leaderboard" className="px-6 py-3 bg-tritec-blue text-white font-display font-semibold rounded-xl">
                View Leaderboard
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-display font-semibold text-tritec-blue">
                {showingFinal ? "Full Results" : `Round ${roundNumber} Results`}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {displayResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    <Image src={r.employee.headshot} alt={r.employee.displayName} width={40} height={40} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.employee.displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{r.employee.title}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${r.nameCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {r.nameCorrect ? "Name ✓" : "Name ✗"}
                    </span>
                    {r.nameCorrect && (
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${r.titleCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {r.titleCorrect ? "Title ✓" : "Title ✗"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!showingFinal && allResults.length > roundResults.length && (
            <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Cumulative</p>
              <p className="font-display font-bold text-tritec-blue">
                {cumulativeScore}/{allResults.length} correct ({allResults.length > 0 ? Math.round((cumulativeScore / allResults.length) * 100) : 0}%)
              </p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- QUIZ IN PROGRESS ---
  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      <main className="max-w-lg mx-auto px-4 pt-8 pb-16">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">Round {roundNumber} — {currentIndex + 1} of {roundTotal}</span>
            <span className="text-xs font-semibold text-tritec-blue">{roundScore} correct</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-tritec-blue to-tritec-gold rounded-full progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {currentEmployee && (
          <div className={`${transitioning ? "opacity-0" : "opacity-100"}`} style={{ transition: "opacity 0.3s" }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="mx-auto mb-5 w-44 rounded-2xl overflow-hidden bg-gray-100 shadow-lg ring-4 ring-tritec-blue/10" style={{ aspectRatio: "3/4" }}>
                <Image src={currentEmployee.headshot} alt="Employee" width={220} height={293} className="w-full h-full object-cover object-center" priority />
              </div>

              {phase === "name-guess" && (
                <>
                  <h3 className="font-display text-lg font-bold text-tritec-blue mb-1">Who is this?</h3>
                  <p className="text-xs text-gray-400 mb-5">Select their name</p>
                  <div className="space-y-2.5">
                    {nameOptions.map((name) => (
                      <button
                        key={name}
                        onClick={() => handleNameSelect(name)}
                        disabled={locked}
                        className={`quiz-option w-full py-3.5 px-4 rounded-xl font-medium text-sm ${getNameBtnClass(name)} ${locked ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {nameSelection?.value === name && nameSelection.correct && (
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          )}
                          {nameSelection?.value === name && !nameSelection.correct && (
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                          {nameSelection && !nameSelection.correct && name === currentEmployee.displayName && nameSelection.value !== name && (
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          )}
                          {name}
                        </span>
                      </button>
                    ))}
                  </div>
                  {nameSelection && !nameSelection.correct && (
                    <div className="mt-4 py-2 px-4 bg-red-50 rounded-xl animate-fade-in-up">
                      <p className="text-sm text-red-600 font-medium">{currentEmployee.displayName} — {currentEmployee.title}</p>
                    </div>
                  )}
                </>
              )}

              {phase === "title-guess" && (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold mb-3">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {currentEmployee.displayName}
                  </div>
                  <h3 className="font-display text-lg font-bold text-tritec-blue mb-1">What&apos;s their title?</h3>
                  <p className="text-xs text-gray-400 mb-5">Select the correct title</p>
                  <div className="space-y-2.5">
                    {titleOptions.map((title) => (
                      <button
                        key={title}
                        onClick={() => handleTitleSelect(title)}
                        disabled={locked}
                        className={`quiz-option w-full py-3.5 px-4 rounded-xl font-medium text-sm ${getTitleBtnClass(title)} ${locked ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {titleSelection?.value === title && titleSelection.correct && (
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          )}
                          {titleSelection?.value === title && !titleSelection.correct && (
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                          {titleSelection && !titleSelection.correct && title === currentEmployee.title && titleSelection.value !== title && (
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          )}
                          {title}
                        </span>
                      </button>
                    ))}
                  </div>
                  {titleSelection && !titleSelection.correct && (
                    <div className="mt-4 py-2 px-4 bg-amber-50 rounded-xl animate-fade-in-up">
                      <p className="text-sm text-amber-700 font-medium">Correct title: {currentEmployee.title}</p>
                    </div>
                  )}
                  {titleSelection && titleSelection.correct && (
                    <div className="mt-4 py-2 px-4 bg-green-50 rounded-xl animate-fade-in-up">
                      <p className="text-sm text-green-700 font-medium">Nailed it!</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Fun Fact Modal */}
      {activeFunFact && (
        <>
          <div
            className="modal-backdrop"
            style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 9998 }}
            onClick={skipFunFact}
          />
          <div
            className="modal-content"
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999, width: "90%", maxWidth: "420px" }}
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="text-5xl mb-3">🔥</div>
              <p className="font-display font-extrabold text-tritec-gold text-lg mb-1">{streak} in a row!</p>
              <div className="w-10 h-0.5 bg-tritec-gold/30 mx-auto my-3 rounded-full" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Did you know...</p>
              <p className="text-lg text-tritec-blue font-medium leading-relaxed mb-8">{activeFunFact}</p>
              <button onClick={skipFunFact} className="w-full py-3.5 bg-tritec-blue text-white font-display font-semibold text-base rounded-xl shadow-lg shadow-tritec-blue/20">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
