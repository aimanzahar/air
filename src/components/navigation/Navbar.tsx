'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ChartBarIcon,
  TrophyIcon,
  SparklesIcon,
  HeartIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import './Navbar.css';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    name: 'Home',
    href: '/',
    icon: HomeIcon,
    description: 'Welcome & Overview',
  },
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: ChartBarIcon,
    description: 'Live Air Quality',
  },
  {
    name: 'BreathQuest',
    href: '/gamification',
    icon: TrophyIcon,
    description: 'Challenges & Rewards',
    badge: 'NEW',
  },
  {
    name: 'AI Health',
    href: '/ai-health',
    icon: SparklesIcon,
    description: 'Smart Predictions',
    badge: 'AI',
  },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <div className="navbar-logo-icon">
            <HeartIcon className="h-5 w-5 text-emerald-600" />
            <MapIcon className="h-3 w-3 text-sky-500 absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="navbar-logo-text">
            <span className="navbar-brand">NafasLokal</span>
            <span className="navbar-tagline">Air Quality Wellness</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-desktop">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`navbar-link ${isActive ? 'navbar-link-active' : ''}`}
              >
                <item.icon className="navbar-link-icon" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className={`navbar-badge ${item.badge === 'AI' ? 'navbar-badge-ai' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="navbar-cta-wrapper">
          <Link href="/dashboard" className="navbar-cta">
            <SparklesIcon className="h-4 w-4" />
            <span>Check Air Now</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="navbar-mobile-btn"
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`navbar-mobile ${isOpen ? 'navbar-mobile-open' : ''}`}>
        <div className="navbar-mobile-inner">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`navbar-mobile-link ${isActive ? 'navbar-mobile-link-active' : ''}`}
              >
                <div className="navbar-mobile-link-icon">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="navbar-mobile-link-content">
                  <span className="navbar-mobile-link-name">
                    {item.name}
                    {item.badge && (
                      <span className={`navbar-badge navbar-badge-sm ${item.badge === 'AI' ? 'navbar-badge-ai' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className="navbar-mobile-link-desc">{item.description}</span>
                </div>
              </Link>
            );
          })}
          
          {/* Mobile CTA */}
          <div className="navbar-mobile-cta">
            <Link href="/dashboard" className="navbar-cta navbar-cta-full">
              <SparklesIcon className="h-4 w-4" />
              <span>Check Your Air Quality</span>
            </Link>
          </div>

          {/* Health Mission Info */}
          <div className="navbar-sdg-info">
            <div className="navbar-sdg-badge">
              <HeartIcon className="h-4 w-4" />
              <span>Health First</span>
            </div>
            <p>AI-driven air quality insights for healthier Malaysian cities</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
