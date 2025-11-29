'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrophyIcon,
  HeartIcon,
  SparklesIcon,
  MapPinIcon,
  ClockIcon,
  ChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ArrowRightIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolid, StarIcon as StarSolid, FireIcon as FireSolid } from '@heroicons/react/24/solid';
import Navbar from '@/components/navigation/Navbar';

interface Challenge {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
  total: number;
  category: 'daily' | 'weekly' | 'achievement';
  unlocked: boolean;
  completed: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

const challenges: Challenge[] = [
  {
    id: '1',
    title: 'Morning Air Scout',
    description: 'Check air quality before 9 AM for 3 consecutive days',
    xp: 50,
    icon: ClockIcon,
    progress: 2,
    total: 3,
    category: 'daily',
    unlocked: true,
    completed: false,
  },
  {
    id: '2',
    title: 'Clean Route Champion',
    description: 'Choose a lower-pollution route 5 times this week',
    xp: 100,
    icon: MapPinIcon,
    progress: 3,
    total: 5,
    category: 'weekly',
    unlocked: true,
    completed: false,
  },
  {
    id: '3',
    title: 'Health Guardian',
    description: 'Maintain a low-exposure streak for 7 days',
    xp: 200,
    icon: HeartIcon,
    progress: 7,
    total: 7,
    category: 'achievement',
    unlocked: true,
    completed: true,
  },
  {
    id: '4',
    title: 'Transit Hero',
    description: 'Use public transit on high-pollution days 10 times',
    xp: 150,
    icon: BoltIcon,
    progress: 6,
    total: 10,
    category: 'weekly',
    unlocked: true,
    completed: false,
  },
  {
    id: '5',
    title: 'Air Quality Analyst',
    description: 'Log air quality data at 20 different locations',
    xp: 300,
    icon: ChartBarIcon,
    progress: 0,
    total: 20,
    category: 'achievement',
    unlocked: false,
    completed: false,
  },
];

const badges: Badge[] = [
  { id: '1', name: 'First Breath', description: 'Complete your first air quality check', icon: '🌬️', earned: true, earnedDate: '2025-11-28' },
  { id: '2', name: 'Week Warrior', description: '7-day streak of checking air quality', icon: '🔥', earned: true, earnedDate: '2025-11-29' },
  { id: '3', name: 'Clean Air Advocate', description: 'Share air quality data 10 times', icon: '📢', earned: false },
  { id: '4', name: 'Health Hero', description: 'Avoid high-pollution areas for 30 days', icon: '🦸', earned: false },
  { id: '5', name: 'Data Scientist', description: 'Contribute 100 air quality readings', icon: '🔬', earned: false },
  { id: '6', name: 'Community Guardian', description: 'Help 50 people find clean routes', icon: '🛡️', earned: false },
];

const leaderboard = [
  { rank: 1, name: 'AirHero_MY', xp: 12500, streak: 45, avatar: '🏆' },
  { rank: 2, name: 'CleanBreath', xp: 11200, streak: 38, avatar: '🥈' },
  { rank: 3, name: 'HealthyKL', xp: 10800, streak: 42, avatar: '🥉' },
  { rank: 4, name: 'You', xp: 2450, streak: 8, avatar: '⭐', isUser: true },
  { rank: 5, name: 'GreenLungs', xp: 2100, streak: 12, avatar: '🌿' },
];

export default function GamificationPage() {
  const [activeTab, setActiveTab] = useState<'challenges' | 'badges' | 'leaderboard'>('challenges');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'daily' | 'weekly' | 'achievement'>('all');

  const userStats = {
    level: 12,
    xp: 2450,
    nextLevelXp: 3000,
    streak: 8,
    totalChallenges: 24,
    badgesEarned: 2,
  };

  const filteredChallenges = categoryFilter === 'all' 
    ? challenges 
    : challenges.filter(c => c.category === categoryFilter);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] pt-20">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-10">
          {/* Hero Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 text-sm text-emerald-600 mb-2">
              <TrophyIcon className="h-4 w-4" />
              <span className="font-medium">BreathQuest</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Your Clean Air Journey
            </h1>
            <p className="text-slate-600 max-w-2xl">
              Complete challenges, earn rewards, and contribute to healthier cities. Every action you take helps build better air quality data for Malaysia.
            </p>
          </section>

          {/* User Stats Card */}
          <section className="card rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Level Progress */}
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{userStats.level}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-1">
                    <StarSolid className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-1">Level {userStats.level} • Air Guardian</p>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${(userStats.xp / userStats.nextLevelXp) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{userStats.xp} / {userStats.nextLevelXp} XP</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4 md:gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                    <FireSolid className="h-5 w-5" />
                    <span className="text-2xl font-bold">{userStats.streak}</span>
                  </div>
                  <p className="text-xs text-slate-500">Day Streak</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="text-2xl font-bold">{userStats.totalChallenges}</span>
                  </div>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                    <TrophySolid className="h-5 w-5" />
                    <span className="text-2xl font-bold">{userStats.badgesEarned}</span>
                  </div>
                  <p className="text-xs text-slate-500">Badges</p>
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(['challenges', 'badges', 'leaderboard'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white'
                    : 'bg-white/80 text-slate-600 hover:bg-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Challenges Tab */}
          {activeTab === 'challenges' && (
            <section>
              {/* Category Filter */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {(['all', 'daily', 'weekly', 'achievement'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>

              {/* Challenges Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className={`card rounded-xl p-5 transition-all duration-300 ${
                      !challenge.unlocked ? 'opacity-60' : ''
                    } ${challenge.completed ? 'ring-2 ring-emerald-500/30' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        challenge.completed 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : challenge.unlocked
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {challenge.unlocked ? (
                          <challenge.icon className="h-6 w-6" />
                        ) : (
                          <LockClosedIcon className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate">{challenge.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            challenge.category === 'daily' ? 'bg-sky-100 text-sky-700' :
                            challenge.category === 'weekly' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {challenge.category}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{challenge.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{challenge.progress}/{challenge.total}</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                challenge.completed ? 'bg-emerald-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-amber-600">
                            <SparklesIcon className="h-4 w-4" />
                            <span className="text-sm font-semibold">{challenge.xp} XP</span>
                          </div>
                          {challenge.completed && (
                            <span className="flex items-center gap-1 text-emerald-600 text-sm">
                              <CheckCircleIcon className="h-4 w-4" />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Badges Tab */}
          {activeTab === 'badges' && (
            <section>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`card rounded-xl p-5 text-center transition-all duration-300 ${
                      badge.earned ? '' : 'opacity-50 grayscale'
                    }`}
                  >
                    <div className="text-4xl mb-3">{badge.icon}</div>
                    <h3 className="font-semibold text-slate-900 mb-1">{badge.name}</h3>
                    <p className="text-xs text-slate-500 mb-2">{badge.description}</p>
                    {badge.earned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircleIcon className="h-3 w-3" />
                        Earned {badge.earnedDate}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        <LockClosedIcon className="h-3 w-3" />
                        Locked
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <section>
              <div className="card rounded-xl overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-sky-500">
                  <h3 className="text-white font-semibold">Weekly Leaderboard</h3>
                  <p className="text-white/80 text-sm">Top air quality champions in Malaysia</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {leaderboard.map((user) => (
                    <div
                      key={user.rank}
                      className={`flex items-center gap-4 p-4 transition-colors ${
                        user.isUser ? 'bg-sky-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        user.rank === 1 ? 'bg-amber-100' :
                        user.rank === 2 ? 'bg-slate-200' :
                        user.rank === 3 ? 'bg-orange-100' :
                        'bg-slate-100'
                      }`}>
                        {user.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${user.isUser ? 'text-sky-700' : 'text-slate-900'}`}>
                          {user.name}
                          {user.isUser && <span className="ml-2 text-xs bg-sky-200 text-sky-700 px-2 py-0.5 rounded-full">You</span>}
                        </p>
                        <p className="text-xs text-slate-500">{user.streak} day streak</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{user.xp.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">XP</p>
                      </div>
                      <div className="w-8 text-center font-bold text-slate-400">
                        #{user.rank}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Health Impact Section */}
          <section className="mt-12 card rounded-2xl p-6 bg-gradient-to-br from-rose-50 to-amber-50 border-rose-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <HeartIcon className="h-8 w-8 text-rose-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
                  Your Health Impact
                </h3>
                <p className="text-slate-600 mb-4">
                  Every challenge you complete contributes to building a healthier Malaysia. Your air quality data helps identify pollution hotspots and protect vulnerable communities.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">127</p>
                    <p className="text-xs text-slate-500">Data Points Shared</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-sky-600">45</p>
                    <p className="text-xs text-slate-500">Clean Routes Found</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">12</p>
                    <p className="text-xs text-slate-500">People Helped</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-rose-600">8</p>
                    <p className="text-xs text-slate-500">Alerts Sent</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="mt-8 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <SparklesIcon className="h-5 w-5" />
              Check Air Quality & Earn XP
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
