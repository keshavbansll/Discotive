// src/pages/Landing.jsx
// DISCOTIVE — MAANG-Grade Landing Page
// Architecture: Netflix-inspired mosaic hero + career discovery + reasons + FAQ + CTA + footer

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "../firebase";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  useInView,
} from "framer-motion";

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=Poppins:wght@300;400;500;600;700&display=swap');

.ld-root {
  --void: #030303;
  --depth: #080808;
  --surface: #0f0f0f;
  --elevated: #141414;
  --gold-1: #BFA264;
  --gold-2: #D4AF78;
  --gold-3: #8B7240;
  --gold-4: #E8D5A3;
  --gold-dim: rgba(191,162,100,0.08);
  --gold-border: rgba(191,162,100,0.22);
  --border: rgba(255,255,255,0.06);
  --text-primary: #F5F0E8;
  --text-secondary: rgba(245,240,232,0.6);
  --text-dim: rgba(245,240,232,0.28);
  --font-display: 'Montserrat', sans-serif;
  --font-body: 'Poppins', sans-serif;
  --success: #4ADE80;
  --error: #F87171;
  --nav-h: 68px;
}

.ld-root *, .ld-root *::before, .ld-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}

.ld-root {
  min-height: 100svh;
  background: var(--void);
  color: var(--text-primary);
  font-family: var(--font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* CURSOR */
.ld-cursor-dot, .ld-cursor-ring {
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  display: none;
  border-radius: 50%;
  will-change: transform;
}
@media (min-width: 900px) {
  .ld-cursor-dot, .ld-cursor-ring { display: block; }
  .ld-root { cursor: none; }
  .ld-root a, .ld-root button, .ld-root [role="button"] { cursor: none; }
}
.ld-cursor-dot {
  width: 6px; height: 6px;
  background: var(--gold-4);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px var(--gold-2), 0 0 20px rgba(191,162,100,0.4);
  transition: width 0.2s, height 0.2s, background 0.2s;
}
.ld-cursor-dot.hovering {
  width: 10px; height: 10px;
  background: var(--gold-2);
  box-shadow: 0 0 20px var(--gold-2), 0 0 40px rgba(191,162,100,0.5);
}
.ld-cursor-ring {
  width: 36px; height: 36px;
  border: 1.5px solid rgba(191,162,100,0.6);
  transform: translate(-50%, -50%);
  background: rgba(191,162,100,0.03);
  transition: width 0.3s cubic-bezier(0.23,1,0.32,1),
              height 0.3s cubic-bezier(0.23,1,0.32,1),
              border-color 0.3s, background 0.3s;
}
.ld-cursor-ring.hovering {
  width: 56px; height: 56px;
  border-color: var(--gold-2);
  background: rgba(191,162,100,0.08);
}
.ld-cursor-ring.clicking {
  width: 28px; height: 28px;
  background: rgba(191,162,100,0.18);
}

/* NAV */
.ld-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  transition: background 0.4s, backdrop-filter 0.4s, border-color 0.4s;
}
.ld-nav.scrolled {
  background: rgba(3,3,3,0.88);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 0.5px solid rgba(255,255,255,0.06);
}
@media (min-width: 900px) { .ld-nav { padding: 0 48px; } }

.ld-nav-logo {
  display: none; align-items: center;
}
@media (min-width: 900px) {
  .ld-nav-logo { display: flex; }
  .ld-nav-logo img { height: 34px; width: auto; object-fit: contain; }
}

.ld-nav-links {
  margin-left: auto;
  display: flex; align-items: center; gap: 6px;
}

.ld-nav-link {
  padding: 8px 14px;
  border: none; background: transparent;
  font-family: var(--font-body); font-size: 10px;
  font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--text-secondary); text-decoration: none;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
  display: inline-flex; align-items: center; white-space: nowrap;
}
.ld-nav-link:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }

.ld-nav-signin {
  padding: 9px 20px;
  background: linear-gradient(135deg, #8B7240, #BFA264 45%, #D4AF78 60%, #BFA264 80%, #6B5530);
  color: #0a0a0a;
  font-family: var(--font-body); font-size: 10px; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  border: none; border-radius: 999px;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
  position: relative; overflow: hidden;
}
.ld-nav-signin::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
  transform: translateX(-100%);
}
.ld-nav-signin:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(191,162,100,0.28); }
.ld-nav-signin:hover::after { animation: shimmer-slide 0.6s ease; }
.ld-nav-signin:active { transform: scale(0.97); }

/* Mobile nav — hamburger menu */
.ld-hamburger {
  display: flex; flex-direction: column; gap: 5px;
  background: none; border: none; padding: 8px; z-index: 10;
  margin-left: auto; /* Forces the menu to the absolute right */
}
.ld-hamburger span {
  display: block; width: 22px; height: 1.5px;
  background: var(--text-primary);
  border-radius: 1px;
  transition: all 0.3s;
}
.ld-hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.ld-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.ld-hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
@media (min-width: 900px) { .ld-hamburger { display: none; } }

.ld-mobile-menu {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(3,3,3,0.96);
  backdrop-filter: blur(24px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 80px 32px 40px;
}
.ld-mobile-menu-link {
  font-family: var(--font-display); font-weight: 700;
  font-size: clamp(28px, 8vw, 44px); letter-spacing: -0.03em;
  color: var(--text-secondary); text-decoration: none;
  background: none; border: none;
  transition: color 0.2s;
  text-align: center;
}
.ld-mobile-menu-link:hover, .ld-mobile-menu-link:active { color: var(--text-primary); }

/* HERO */
.ld-hero {
  position: relative;
  min-height: 100svh;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  overflow: hidden;
}

.ld-hero-grid {
  position: absolute; inset: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 3px;
  padding: 0;
  overflow: hidden;
}
@media (min-width: 640px) { .ld-hero-grid { grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(3, 1fr); } }
@media (min-width: 900px) { .ld-hero-grid { grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(3, 1fr); } }

.ld-hero-card {
  position: relative; overflow: hidden;
  background: var(--surface);
  border-radius: 3px;
}

.ld-hero-fade {
  position: absolute; inset: 0; z-index: 2;
  background: linear-gradient(
    180deg,
    rgba(3,3,3,0.2) 0%,
    rgba(3,3,3,0.35) 30%,
    rgba(3,3,3,0.65) 60%,
    rgba(3,3,3,0.92) 82%,
    #030303 100%
  );
}

.ld-hero-content {
  position: relative; z-index: 10;
  width: 100%;
  padding: 0 20px 56px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
@media (min-width: 640px) { .ld-hero-content { padding: 0 32px 80px; } }
@media (min-width: 900px) { .ld-hero-content { padding: 0 48px 100px; } }
@media (max-width: 639px) { .ld-hero-content { margin-top: 10vh !important; } }

/* NAV LINKS DESKTOP ONLY */
@media (max-width: 899px) {
  .ld-nav-links { display: none !important; }
}

@keyframes ambient-drift {
  0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
  50% { transform: translate(4%, -6%) scale(1.1); opacity: 0.7; }
  100% { transform: translate(-2%, 4%) scale(0.95); opacity: 0.4; }
}
.ld-hero-mesh {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  overflow: hidden;
}
.ld-hero-mesh-1 {
  position: absolute; top: -20%; left: -20%; width: 80vw; height: 80vw;
  background: radial-gradient(circle closest-side, rgba(191,162,100,0.15) 0%, rgba(191,162,100,0.05) 40%, transparent 100%);
  border-radius: 50%; will-change: transform;
  animation: ambient-drift 12s infinite ease-in-out alternate;
}
.ld-hero-mesh-2 {
  position: absolute; bottom: -20%; right: -20%; width: 90vw; height: 90vw;
  background: radial-gradient(circle closest-side, rgba(139,114,64,0.12) 0%, rgba(139,114,64,0.04) 40%, transparent 100%);
  border-radius: 50%; will-change: transform;
  animation: ambient-drift 15s infinite ease-in-out alternate-reverse;
}

.ld-hero-bg-logo {
  position: absolute;
  top: 24%; left: 50%; /* Pushed upwards on mobile */
  width: 85%;
  max-width: 1200px;
  display: flex; justify-content: center;
  user-select: none; pointer-events: none; z-index: 1;
}
@media (min-width: 640px) { .ld-hero-bg-logo { width: 100%; top: 38%; } }

/* EMAIL INPUT */
.ld-email-wrap {
  width: 100%; max-width: 520px;
  display: flex; flex-direction: row; gap: 0;
  margin-top: 24px;
}

/* Glowing container wrapper */
.ld-email-glow-wrap {
  position: relative;
  flex: 1;
  border-radius: 12px 0 0 12px;
}
.ld-email-glow-wrap::before {
  content: '';
  position: absolute; inset: -1.5px;
  border-radius: 13px 0 0 13px;
  background: linear-gradient(120deg, rgba(191,162,100,0.0) 0%, rgba(191,162,100,0.55) 35%, rgba(96,165,250,0.45) 65%, rgba(192,132,252,0.35) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: 0;
}
.ld-email-glow-wrap:focus-within::before { opacity: 1; }
.ld-email-glow-wrap::after {
  content: '';
  position: absolute; inset: -1px;
  border-radius: 12px 0 0 12px;
  background: linear-gradient(120deg, rgba(191,162,100,0.18) 0%, rgba(96,165,250,0.12) 100%);
  z-index: 0;
}

.ld-email-input {
  position: relative; z-index: 1;
  width: 100%; height: 48px;
  background: rgba(10,10,10,0.92);
  border: none;
  border-radius: 12px 0 0 12px;
  color: var(--text-primary);
  font-family: var(--font-body); font-size: 13px;
  padding: 0 16px; outline: none;
  transition: background 0.3s;
  backdrop-filter: blur(8px);
}
.ld-email-input::placeholder { color: rgba(245,240,232,0.35); }
.ld-email-input:focus { background: rgba(18,14,10,0.95); }

.ld-email-btn {
  height: 48px; padding: 0 16px;
  background: linear-gradient(135deg, #8B7240, #BFA264 45%, #D4AF78 60%, #BFA264 80%, #6B5530);
  color: #0a0a0a;
  font-family: var(--font-body); font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  border: none; border-radius: 0 12px 12px 0;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
  white-space: nowrap; position: relative; overflow: hidden;
}
.ld-email-btn::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0s;
}
.ld-email-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 12px 32px rgba(191,162,100,0.35), 0 0 0 1px rgba(191,162,100,0.3); }
.ld-email-btn:hover::after { animation: shimmer-slide 0.55s ease forwards; }
.ld-email-btn:active { transform: scale(0.97); }

@media (min-width: 640px) {
  .ld-email-glow-wrap { border-radius: 14px 0 0 14px; }
  .ld-email-glow-wrap::after { border-radius: 14px 0 0 14px; }
  .ld-email-glow-wrap::before { border-radius: 15px 0 0 15px; }
  .ld-email-input { height: 58px; font-size: 14px; padding: 0 20px; border-radius: 13px 0 0 13px; }
  .ld-email-btn { height: 58px; padding: 0 28px; font-size: 11px; letter-spacing: 0.14em; gap: 8px; border-radius: 0 14px 14px 0; }
}

/* SECTIONS */
.ld-section {
  padding: 72px 20px;
}
@media (min-width: 640px) { .ld-section { padding: 96px 32px; } }
@media (min-width: 900px) { .ld-section { padding: 120px 48px; } }

.ld-section-inner { max-width: 1200px; margin: 0 auto; }

.ld-section-label {
  font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--gold-3); font-family: var(--font-body); font-weight: 700;
  margin-bottom: 16px;
  display: flex; align-items: center; gap: 12px;
}
.ld-section-label::before {
  content: ''; display: block; width: 24px; height: 0.5px;
  background: var(--gold-3);
}

.ld-section-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 52px);
  font-weight: 800; letter-spacing: -0.035em;
  line-height: 1.08;
  color: var(--text-primary);
}

.ld-gold-text {
  background: linear-gradient(135deg, #BFA264 0%, #D4AF78 35%, #E8D5A3 55%, #BFA264 75%, #8B7240 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* DISCOVERY SECTION — Netflix-style */
.ld-discovery-outer {
  position: relative;
  margin: 0 -20px;
}
.ld-discovery-outer::before, .ld-discovery-outer::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  width: 48px;
  z-index: 10;
  pointer-events: none;
}
.ld-discovery-outer::before {
  left: 0;
  background: linear-gradient(to right, var(--void) 0%, transparent 100%);
}
.ld-discovery-outer::after {
  right: 0;
  background: linear-gradient(to left, var(--void) 0%, transparent 100%);
}
@media (min-width: 640px) { .ld-discovery-outer { margin: 0 -32px; } }
@media (min-width: 900px) { .ld-discovery-outer { margin: 0 -48px; } }

.ld-discovery-scroll {
  display: flex; gap: 10px;
  overflow-x: auto; overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding: 8px 20px 20px;
  scroll-behavior: smooth;
}
.ld-discovery-scroll::-webkit-scrollbar { display: none; }
@media (min-width: 640px) { .ld-discovery-scroll { padding: 8px 32px 24px; gap: 12px; } }
@media (min-width: 900px) { .ld-discovery-scroll { padding: 8px 48px 28px; gap: 14px; } }

.ld-discovery-card {
  flex-shrink: 0;
  scroll-snap-align: start;
  width: 160px;
  height: 220px;
  border-radius: 10px;
  position: relative; overflow: hidden;
  border: 0.5px solid var(--border);
  background: var(--surface);
  transition: transform 0.4s cubic-bezier(0.23,1,0.32,1),
              border-color 0.3s, box-shadow 0.4s;
  display: flex; flex-direction: column;
  cursor: pointer;
}
@media (min-width: 480px) { .ld-discovery-card { width: 180px; height: 240px; } }
@media (min-width: 900px) {
  .ld-discovery-card { width: 200px; height: 280px; }
  .ld-discovery-card:hover {
    transform: scale(1.06) translateY(-4px);
    border-color: rgba(255,255,255,0.22);
    box-shadow: 0 24px 56px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12);
    z-index: 2;
  }
}

/* The rank number overlay */
.ld-discovery-rank {
  position: absolute;
  bottom: -8px; left: -6px;
  font-family: var(--font-display);
  font-size: clamp(72px, 10vw, 100px);
  font-weight: 900;
  line-height: 1;
  color: #fff;
  -webkit-text-stroke: 2.5px rgba(245,240,232,0.85);
  text-stroke: 2.5px rgba(245,240,232,0.85);
  pointer-events: none;
  z-index: 3;
  letter-spacing: -0.05em;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));
}

.ld-discovery-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 10px;
  transition: transform 0.5s cubic-bezier(0.23,1,0.32,1);
}
@media (min-width: 900px) {
  .ld-discovery-card:hover .ld-discovery-img { transform: scale(1.04); }
}

.ld-discovery-img-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0,0,0,0.0) 40%,
    rgba(0,0,0,0.7) 75%,
    rgba(0,0,0,0.92) 100%
  );
  z-index: 1;
  border-radius: 10px;
}

/* Fallback card (no image) */
.ld-discovery-card-fallback {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: flex-start; justify-content: flex-end;
  padding: 16px;
  z-index: 2;
}

/* Arrow nav buttons */
.ld-discovery-arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px;
  background: rgba(20,20,20,0.85);
  border: 0.5px solid rgba(255,255,255,0.12);
  border-radius: 50%;
  display: none;
  align-items: center; justify-content: center;
  z-index: 10;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  backdrop-filter: blur(12px);
}
.ld-discovery-arrow:hover {
  background: rgba(40,40,40,0.95);
  border-color: rgba(255,255,255,0.3);
  transform: translateY(-50%) scale(1.08);
}
.ld-discovery-arrow:active { transform: translateY(-50%) scale(0.95); }
.ld-discovery-arrow-left { left: 4px; }
.ld-discovery-arrow-right { right: 4px; }
@media (min-width: 900px) {
  .ld-discovery-arrow { display: flex; width: 48px; height: 48px; }
  .ld-discovery-arrow-left { left: 8px; }
  .ld-discovery-arrow-right { right: 8px; }
}

/* REASONS — Cinematic feature cards */
.ld-reasons-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ld-reason-card {
  border-radius: 0;
  padding: clamp(28px, 4vw, 48px) clamp(20px, 4vw, 40px);
  background: var(--surface);
  border: none;
  border-top: 0.5px solid var(--border);
  position: relative; overflow: hidden;
  transition: background 0.4s;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.ld-reason-card:last-child { border-bottom: 0.5px solid var(--border); }

@media (min-width: 640px) {
  .ld-reasons-grid { gap: 0; }
  .ld-reason-card {
    flex-direction: row;
    align-items: center;
    gap: 0;
    padding: clamp(36px, 5vw, 60px) clamp(32px, 5vw, 56px);
    min-height: 180px;
  }
  .ld-reason-card:nth-child(even) { flex-direction: row-reverse; }
}

.ld-reason-card::before {
  content: '';
  position: absolute; inset: 0;
  opacity: 0;
  transition: opacity 0.4s;
}
@media (min-width: 900px) {
  .ld-reason-card:hover { background: rgba(255,255,255,0.018); }
  .ld-reason-card:hover::before { opacity: 1; }
}

/* left accent bar on desktop */
.ld-reason-accent-bar {
  flex-shrink: 0;
  width: 3px;
  align-self: stretch;
  border-radius: 2px;
  margin-right: 40px;
  opacity: 0.7;
}
@media (max-width: 639px) { .ld-reason-accent-bar { width: 32px; height: 3px; border-radius: 2px; } }
.ld-reason-card:nth-child(even) .ld-reason-accent-bar { margin-right: 0; margin-left: 40px; }

.ld-reason-icon {
  flex-shrink: 0;
  width: 64px; height: 64px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
}

.ld-reason-text { flex: 1; }

/* Large bg number */
.ld-reason-number {
  position: absolute;
  right: clamp(20px, 5vw, 60px);
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-display);
  font-size: clamp(80px, 12vw, 160px);
  font-weight: 900;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255,255,255,0.04);
  pointer-events: none;
  letter-spacing: -0.05em;
  user-select: none;
}
.ld-reason-card:nth-child(even) .ld-reason-number { right: auto; left: clamp(20px, 5vw, 60px); }

/* FAQ */
.ld-faq-item {
  border-bottom: 0.5px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.ld-faq-question {
  width: 100%; text-align: left;
  padding: 22px 0;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  background: none; border: none;
  font-family: var(--font-body); font-size: 15px; font-weight: 600;
  color: var(--text-primary);
  transition: color 0.2s;
}
@media (min-width: 640px) { .ld-faq-question { font-size: 17px; } }
.ld-faq-question:hover { color: var(--gold-2); }

.ld-faq-icon {
  width: 32px; height: 32px; flex-shrink: 0;
  border-radius: 8px;
  border: 0.5px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.3s, border-color 0.3s;
}
.ld-faq-icon.open { background: rgba(191,162,100,0.1); border-color: var(--gold-border); }

.ld-faq-answer {
  font-size: 14px; line-height: 1.8;
  color: var(--text-secondary);
  font-family: var(--font-body);
  padding-bottom: 22px;
  max-width: 680px;
}

/* FOOTER */
.ld-footer {
  border-top: 0.5px solid var(--border);
  padding: 52px 20px 32px;
}
@media (min-width: 640px) { .ld-footer { padding: 64px 32px 36px; } }
@media (min-width: 900px) { .ld-footer { padding: 64px 48px 36px; } }

.ld-footer-grid {
  max-width: 1200px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 40px;
}
@media (min-width: 640px) { .ld-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }

.ld-footer-col-title {
  font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase;
  color: var(--gold-3); font-family: var(--font-body); font-weight: 700;
  margin-bottom: 16px;
}
.ld-footer-link {
  display: block; font-size: 12px; color: var(--text-dim);
  text-decoration: none; font-family: var(--font-body);
  margin-bottom: 10px;
  transition: color 0.2s;
}
.ld-footer-link:hover { color: var(--text-primary); }

/* DIVIDER */
.ld-gold-divider {
  height: 0.5px;
  background: linear-gradient(90deg, transparent, var(--gold-3) 20%, var(--gold-1) 50%, var(--gold-3) 80%, transparent);
}

/* ANIMATIONS */
@keyframes ld-grain {
  0%,100% { transform: translate(0,0); }
  10% { transform: translate(-2%,-3%); }
  20% { transform: translate(3%,2%); }
  30% { transform: translate(-1%,4%); }
  40% { transform: translate(4%,-2%); }
  50% { transform: translate(-3%,3%); }
  60% { transform: translate(2%,-4%); }
  70% { transform: translate(-4%,1%); }
  80% { transform: translate(3%,3%); }
  90% { transform: translate(-2%,-1%); }
}

@keyframes shimmer-slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(200%); }
}

@keyframes ld-float {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes ld-pulse-gold {
  0%,100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes ld-spin { to { transform: rotate(360deg); } }

@keyframes ld-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* GLOW */
@keyframes ld-glow-pulse {
  0%,100% { box-shadow: 0 0 24px rgba(191,162,100,0.08); }
  50% { box-shadow: 0 0 48px rgba(191,162,100,0.2), 0 0 80px rgba(191,162,100,0.08); }
}

/* MOBILE TOUCH TARGETS */
@media (max-width: 639px) {
  button, a, [role="button"] { min-height: 44px; -webkit-tap-highlight-color: transparent; }
}

/* SCROLL INDICATOR */
@keyframes ld-bounce {
  0%,100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(8px); }
}

/* BADGE */
.ld-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px;
  background: rgba(191,162,100,0.08);
  border: 0.5px solid rgba(191,162,100,0.2);
  border-radius: 99px;
  font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--gold-2); font-family: var(--font-body); font-weight: 700;
}
`;

// ─── DISCOVERY CARDS ──────────────────────────────────────────────────────────
const DISCOVERY_CARDS = [
  {
    sub: "Set your own competition.",
    color: "#60A5FA",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    image: "/landing/card-compete.png",
  },
  {
    sub: "Learn from  personalized (& verified) courses.",
    color: "#C084FC",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
    image: "/landing/card-learn.png",
  },
  {
    sub: "Curated playlists, just for you.",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
    image: "/landing/card-playlists.png",
  },
  {
    sub: "Apply on the basis of calculated selection %.",
    color: "#F472B6",
    bg: "rgba(244,114,182,0.08)",
    border: "rgba(244,114,182,0.2)",
    image: "/landing/card-selection.png",
  },
  {
    sub: "App/Skill based freelancing opportunities.",
    color: "#4ADE80",
    bg: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.2)",
    image: "/landing/card-freelance.png",
  },
  {
    sub: "Rank on Global Leaderboard.",
    color: "#BFA264",
    bg: "rgba(191,162,100,0.08)",
    border: "rgba(191,162,100,0.22)",
    image: "/landing/card-arena.png",
  },
  {
    sub: "Grow your Network as alliance or target.",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.2)",
    image: "/landing/card-connective.png",
  },
  {
    sub: "Secure your verified vault, connected apps and gain points.",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.2)",
    image: "/landing/card-vault.png",
  },
  {
    sub: "In-built diary and execution agenda.",
    color: "#F43F5E",
    bg: "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.2)",
    image: "/landing/card-agenda.png",
  },
  {
    sub: "Track your consistency and maintain streaks",
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    image: "/landing/card-consistency.png",
  },
];

// ─── REASONS DATA ─────────────────────────────────────────────────────────────
const REASONS = [
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5Z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Discotive Score",
    body: "A quantitatively calculated score based on your execution and achievements. The new standard of qualification.",
    accent: "#BFA264",
    bg: "rgba(191,162,100,0.06)",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    title: "Position Matrix",
    body: "A live leaderboard across the globe. Know where you actually stand among your university, domain, niche, network and targets.",
    accent: "#38BDF8",
    bg: "rgba(56,189,248,0.06)",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m12 16 4-4-4-4" />
        <path d="M8 12h8" />
      </svg>
    ),
    title: "Personalize to YOUR domain",
    body: "Not just for engineers or founders, but for everyone. Whether you are a filmmaker, writer, designer, or belong to any domain.",
    accent: "#C084FC",
    bg: "rgba(168,85,247,0.06)",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
    title: "Ease freelance",
    body: "No need of certificates or experience. You know any skill—welcome to your freelance portfolio.",
    accent: "#4ADE80",
    bg: "rgba(74,222,128,0.06)",
  },
  {
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Credibility at its peak",
    body: "No fake certificates, experience, or skills. Everything is verified and real.",
    accent: "#F43F5E",
    bg: "rgba(244,63,94,0.06)",
  },
];

// ─── FAQ DATA ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is Discotive?",
    a: "Discotive is a career execution engine for the next generation of builders. It converts your professional future into a mathematical, verifiable system — with a Discotive Score, cryptographic asset vault, AI-generated roadmap, and a global leaderboard. It's not a job board. It's the OS you run your career on.",
  },
  {
    q: "Is Discotive free to use?",
    a: "Yes. The Essential plan is free and includes core execution features — roadmap nodes, asset vault, leaderboard access, and your Discotive Score. The Pro plan (₹139/month) unlocks advanced intelligence tools, competitor X-Ray, priority verification, and unlimited execution nodes.",
  },
  {
    q: "How is Discotive different from LinkedIn?",
    a: "LinkedIn is a social network where you broadcast what you claim. Discotive is an execution system where everything is cryptographically verified. Your score is mathematical, your assets are SHA-256 hashed, and your rank is earned — not endorsed.",
  },
  {
    q: "What is the Discotive Score?",
    a: "Your Discotive Score is a live, atomic metric tracking every execution event — task completions, verified assets, login streaks, alliance formations, and more. It powers your leaderboard rank and drives personalized recommendations across the platform.",
  },
  {
    q: "Can I use Discotive if I'm a student?",
    a: "Absolutely. Discotive was built for students, early-career builders, and operators at every stage. The platform's onboarding adapts to your current status — whether you're in school, undergraduate, or just starting your career.",
  },
  {
    q: "How do I cancel or change my plan?",
    a: "You can cancel your Pro subscription at any time from your Settings. There are no lock-ins, no hidden fees, and your Essential plan access continues after cancellation.",
  },
];

// ─── CUSTOM CURSOR ────────────────────────────────────────────────────────────
function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);

  const springConf = { damping: 22, stiffness: 280, mass: 0.5 };
  const ringX = useSpring(mouseX, springConf);
  const ringY = useSpring(mouseY, springConf);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 900) return;

    // Direct DOM manipulation to avoid React reconciliation loop on mouse events
    const onMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + "px";
        dotRef.current.style.top = e.clientY + "px";
      }
    };

    const onOver = (e) => {
      if (
        e.target.closest(
          "a, button, [role='button'], input, .ld-discovery-card, .ld-reason-card, .ld-faq-question",
        )
      ) {
        dotRef.current?.classList.add("hovering");
        ringRef.current?.classList.add("hovering");
      }
    };

    const onOut = (e) => {
      if (
        e.target.closest(
          "a, button, [role='button'], input, .ld-discovery-card, .ld-reason-card, .ld-faq-question",
        )
      ) {
        dotRef.current?.classList.remove("hovering");
        ringRef.current?.classList.remove("hovering");
      }
    };

    const onDown = () => ringRef.current?.classList.add("clicking");
    const onUp = () => ringRef.current?.classList.remove("clicking");

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [mouseX, mouseY]);

  return (
    <>
      <div
        ref={dotRef}
        className="ld-cursor-dot"
        style={{ position: "fixed" }}
      />
      <motion.div
        ref={ringRef}
        className="ld-cursor-ring"
        style={{ left: ringX, top: ringY, position: "fixed" }}
      />
    </>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
function Counter({ end, suffix = "", duration = 1.8 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let cur = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      cur += step;
      if (cur >= end) {
        setVal(end);
        clearInterval(timer);
      } else setVal(Math.floor(cur));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, index, isOpen, onToggle }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className="ld-faq-item"
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.06,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      <button
        className="ld-faq-question"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{q}</span>
        <div className={`ld-faq-icon${isOpen ? " open" : ""}`}>
          <motion.svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke={isOpen ? "var(--gold-2)" : "var(--text-secondary)"}
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </motion.svg>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: "hidden" }}
          >
            <p className="ld-faq-answer">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FAQGroup({ faqs }) {
  const [openIndex, setOpenIndex] = useState(null);
  return (
    <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
      {faqs.map((f, i) => (
        <FAQItem
          key={f.q}
          q={f.q}
          a={f.a}
          index={i}
          isOpen={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  );
}

// ─── EMAIL CTA BLOCK ─────────────────────────────────────────────────────────
function EmailCTA({ navigate, label = "Get Started →", className, style }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (methods && methods.length > 0) {
        navigate("/auth", { state: { email: normalizedEmail, isLogin: true } });
      } else {
        navigate("/auth", {
          state: { email: normalizedEmail, isLogin: false },
        });
      }
    } catch (err) {
      navigate("/auth", { state: { email: normalizedEmail, isLogin: false } });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={className || "ld-email-wrap"}
      style={style}
    >
      <div className="ld-email-glow-wrap">
        <input
          type="email"
          className="ld-email-input"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <button type="submit" className="ld-email-btn" disabled={loading}>
        {loading ? "..." : label}
        {!loading && (
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </button>
    </form>
  );
}

// ─── SECTION REVEAL WRAPPER ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 24 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const discoveryScrollRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.96]);

  // Inject CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "ld-styles";
    el.textContent = LANDING_CSS;
    document.head.appendChild(el);
    // SEO
    document.title = "Discotive | Unified Career Engine — Build Your Monopoly";
    const metaDesc =
      document.querySelector('meta[name="description"]') ||
      document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute(
      "content",
      "Discotive is the execution engine for next-generation builders. Verify your work. Climb the global leaderboard. Own your career trajectory.",
    );
    if (!document.querySelector('meta[name="description"]'))
      document.head.appendChild(metaDesc);
    return () => {
      document.getElementById("ld-styles")?.remove();
    };
  }, []);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => setNavScrolled(v > 40));
    return unsub;
  }, [scrollY]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const NAV_LINKS = [
    {
      label: "About",
      onClick: () => {
        setMobileMenuOpen(false);
        navigate("/about");
      },
    },
    {
      label: "Premium",
      onClick: () => {
        setMobileMenuOpen(false);
        navigate("/premium");
      },
    },
  ];

  return (
    <div className="ld-root">
      {/* SEO structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Discotive",
            url: "https://discotive.in",
            description: "Unified Career Engine for next-generation builders",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://discotive.in/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      <div className="ld-grain" />
      <Cursor />

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <motion.nav
        className={`ld-nav${navScrolled ? " scrolled" : ""}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        {/* Left-aligned logo */}
        <div className="ld-nav-logo">
          <img src="/Logo with Title.png" alt="Discotive" />
        </div>

        {/* Mobile hamburger (Forced to the right) */}
        <button
          className={`ld-hamburger${mobileMenuOpen ? " open" : ""}`}
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>

        {/* Desktop right links */}
        <div className="ld-nav-links">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              className="ld-nav-link"
              onClick={link.onClick}
            >
              {link.label}
            </button>
          ))}
          <div
            style={{
              width: 1,
              height: 16,
              background: "rgba(255,255,255,0.1)",
              margin: "0 4px",
            }}
          />
          <button
            className="ld-nav-signin"
            onClick={() => navigate("/auth", { state: { isLogin: true } })}
          >
            Sign In
          </button>
        </div>
      </motion.nav>

      {/* ── DESKTOP NAV LINKS (rendered server-side safely) ── */}
      <style>{`
        @media (min-width: 900px) {
          .ld-nav-links { display: flex !important; }
          .ld-hamburger { display: none !important; }
          .hero-card-sub { display: block !important; }
        }
      `}</style>

      {/* ── MOBILE MENU ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="ld-mobile-menu"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <img
              src="/Logo with Title.png"
              alt="Discotive"
              style={{ height: 30, marginBottom: 32 }}
            />
            {NAV_LINKS.map((link, i) => (
              <motion.button
                key={link.label}
                className="ld-mobile-menu-link"
                onClick={link.onClick}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.06 }}
              >
                {link.label}
              </motion.button>
            ))}
            <motion.button
              className="ld-mobile-menu-link"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/auth", { state: { isLogin: true } });
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
              style={{ color: "var(--gold-2)" }}
            >
              Sign In
            </motion.button>
            <motion.button
              className="ld-nav-signin"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/auth", { state: { isLogin: false } });
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              style={{ marginTop: 24, padding: "14px 36px", fontSize: 12 }}
            >
              Get Started Free
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <motion.section
        className="ld-hero"
        style={{
          opacity: heroOpacity,
          scale: heroScale,
          justifyContent: "center",
          paddingTop: "var(--nav-h)",
          willChange: "transform, opacity",
        }}
      >
        <div className="ld-hero-mesh">
          <div className="ld-hero-mesh-1" />
          <div className="ld-hero-mesh-2" />
        </div>

        {/* Massive Background Image Logo */}
        <motion.div
          className="ld-hero-bg-logo"
          initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
          animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <img
            src="/Logo with Title.png"
            alt="Discotive Background"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              opacity: 0.08 /* Uniformly faded */,
            }}
          />
        </motion.div>

        {/* Foreground Centered Content */}
        <div
          className="ld-hero-content"
          style={{
            position: "relative",
            zIndex: 10,
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "auto",
            paddingBottom: 0,
            marginTop:
              "16vh" /* Positions core copy immediately over the fade boundary */,
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 7vw, 68px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              textAlign: "center",
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            Unified Career Engine
            <br />
            <span style={{ color: "var(--gold-2)" }}>
              to build your monopoly.
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.35,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{ textAlign: "center", marginTop: 28, marginBottom: 36 }}
          >
            <span
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 8,
              }}
            >
              Start for free
            </span>
            <p
              style={{
                fontSize: "clamp(11px, 3.5vw, 15px)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                maxWidth: 520,
                lineHeight: 1.6,
                fontWeight: 300,
                margin: 0,
              }}
            >
              Ready to unlock your full potential? Enter your email to create or
              <br style={{ display: "block" }} />
              restart your account now.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.5,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{ width: "100%", maxWidth: 520 }}
          >
            <EmailCTA navigate={navigate} label="Get Started" />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            zIndex: 10,
            animation: "ld-bounce 2s ease-in-out infinite",
          }}
        >
          <span
            style={{
              fontSize: 8,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              fontFamily: "var(--font-body)",
            }}
          >
            Scroll
          </span>
          <svg width={16} height={20} viewBox="0 0 16 20" fill="none">
            <rect
              x="1"
              y="1"
              width="14"
              height="18"
              rx="7"
              stroke="rgba(191,162,100,0.3)"
              strokeWidth="1.5"
            />
            <motion.rect
              x="6.5"
              y="5"
              width="3"
              height="5"
              rx="1.5"
              fill="var(--gold-2)"
              animate={{ y: [5, 9, 5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>
        </motion.div>
      </motion.section>

      {/* ── CAREER DISCOVERY ─────────────────────────────────────────────── */}
      <section className="ld-section" id="discover">
        <div className="ld-section-inner">
          <Reveal>
            <div className="ld-section-label">Career Discovery</div>
            <h2 className="ld-section-title" style={{ marginBottom: 8 }}>
              Everything you need,
              <br />
              <span className="ld-gold-text">in one engine.</span>
            </h2>
            <p
              style={{
                fontSize: "clamp(13px, 1.3vw, 15px)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                lineHeight: 1.7,
                maxWidth: 480,
                marginBottom: 36,
                fontWeight: 300,
              }}
            >
              Discotive isn't a tool. It's the complete stack for ambitious
              operators — from learning to landing to launching.
            </p>
          </Reveal>

          <div
            className="ld-discovery-outer"
            style={{ marginTop: 8, position: "relative" }}
          >
            {/* Left Arrow */}
            <button
              className="ld-discovery-arrow ld-discovery-arrow-left"
              aria-label="Scroll left"
              onClick={() => {
                if (discoveryScrollRef.current) {
                  discoveryScrollRef.current.scrollBy({
                    left: -440,
                    behavior: "smooth",
                  });
                }
              }}
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Right Arrow */}
            <button
              className="ld-discovery-arrow ld-discovery-arrow-right"
              aria-label="Scroll right"
              onClick={() => {
                if (discoveryScrollRef.current) {
                  discoveryScrollRef.current.scrollBy({
                    left: 440,
                    behavior: "smooth",
                  });
                }
              }}
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div ref={discoveryScrollRef} className="ld-discovery-scroll">
              {DISCOVERY_CARDS.map((card, i) => (
                <motion.div
                  key={card.title}
                  className="ld-discovery-card"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.05,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  onClick={() => navigate("/auth")}
                  style={{ borderColor: card.border }}
                >
                  {/* Background: image if available, else gradient */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(160deg, ${card.bg} 0%, rgba(8,8,8,0.9) 100%)`,
                      borderRadius: 10,
                    }}
                  />
                  {/* Image (gracefully degrades if missing) */}
                  <img
                    src={card.image}
                    alt={card.title}
                    className="ld-discovery-img"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="ld-discovery-img-overlay" />

                  {/* Card content bottom */}
                  <div className="ld-discovery-card-fallback">
                    <span
                      style={{
                        fontSize: 22,
                        marginBottom: 6,
                        display: "block",
                        position: "relative",
                        zIndex: 4,
                      }}
                    >
                      {card.icon}
                    </span>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(13px, 1.4vw, 15px)",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: "#fff",
                        lineHeight: 1.2,
                        position: "relative",
                        zIndex: 4,
                      }}
                    >
                      {card.title}
                    </div>
                  </div>

                  {/* Netflix-style rank number */}
                  <div
                    className="ld-discovery-rank"
                    style={{ color: "transparent" }}
                  >
                    {i + 1}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MORE REASONS TO JOIN ─────────────────────────────────────────── */}
      <section
        className="ld-section"
        style={{
          background: "rgba(255,255,255,0.006)",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div className="ld-section-inner">
          <Reveal>
            <div className="ld-section-label">More Reasons to Join</div>
            <h2 className="ld-section-title" style={{ marginBottom: 8 }}>
              Built for operators
              <br />
              <span className="ld-gold-text">who execute.</span>
            </h2>
            <p
              style={{
                fontSize: "clamp(13px, 1.3vw, 15px)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                lineHeight: 1.7,
                maxWidth: 440,
                marginBottom: 44,
                fontWeight: 300,
              }}
            >
              Stop consuming. Start building. Discotive turns ambition into a
              verifiable, scoreable, rankable system.
            </p>
          </Reveal>

          <div className="ld-reasons-grid">
            {REASONS.map((r, i) => (
              <motion.div
                key={r.title}
                className="ld-reason-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.75,
                  delay: i * 0.06,
                  ease: [0.23, 1, 0.32, 1],
                }}
                style={{
                  background: `linear-gradient(to right, ${r.bg} 0%, rgba(8,8,8,0) 60%)`,
                }}
              >
                {/* Top accent line */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: `linear-gradient(90deg, ${r.accent}50, transparent 60%)`,
                  }}
                />

                {/* Accent bar */}
                <div
                  className="ld-reason-accent-bar"
                  style={{ background: r.accent }}
                />

                {/* Icon */}
                <div
                  className="ld-reason-icon"
                  style={{
                    background: r.bg,
                    border: `0.5px solid ${r.accent}30`,
                    marginRight: 24,
                    flexShrink: 0,
                    color: r.accent,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {r.icon}
                  </span>
                </div>

                {/* Text */}
                <div className="ld-reason-text">
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "clamp(18px, 2vw, 26px)",
                      letterSpacing: "-0.03em",
                      color: "var(--text-primary)",
                      marginBottom: 8,
                      lineHeight: 1.2,
                    }}
                  >
                    {r.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "clamp(12px, 1.1vw, 14px)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                      lineHeight: 1.75,
                      maxWidth: 440,
                    }}
                  >
                    {r.body}
                  </p>
                </div>

                {/* Large ghost number */}
                <div className="ld-reason-number">{`0${i + 1}`}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="ld-section">
        <div className="ld-section-inner" style={{ maxWidth: 760 }}>
          <Reveal>
            <div className="ld-section-label">Frequently Asked Questions</div>
            <h2 className="ld-section-title" style={{ marginBottom: 40 }}>
              Got questions?
              <br />
              <span className="ld-gold-text">We've got answers.</span>
            </h2>
          </Reveal>

          <FAQGroup faqs={FAQS} />
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
      <section
        className="ld-section"
        style={{
          borderTop: "0.5px solid var(--border)",
          background: "rgba(255,255,255,0.005)",
        }}
      >
        <div className="ld-section-inner">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
            style={{
              textAlign: "center",
              padding: "clamp(48px, 6vw, 80px) clamp(20px, 4vw, 60px)",
              background:
                "linear-gradient(135deg, rgba(139,114,64,0.07) 0%, rgba(191,162,100,0.04) 50%, rgba(139,114,64,0.07) 100%)",
              border: "0.5px solid rgba(191,162,100,0.18)",
              borderRadius: 20,
              position: "relative",
              overflow: "hidden",
              animation: "ld-glow-pulse 4s ease-in-out infinite",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, var(--gold-1), transparent)",
              }}
            />

            <div style={{ marginBottom: 20 }}>
              <span className="ld-badge">
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#4ADE80",
                    boxShadow: "0 0 6px #4ADE80",
                    display: "inline-block",
                  }}
                />
                Ready to execute?
              </span>
            </div>

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 5vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                color: "var(--text-primary)",
                marginBottom: 14,
              }}
            >
              Execute. Verify.
              <br />
              <span className="ld-gold-text">Own your trajectory.</span>
            </h2>

            <p
              style={{
                fontSize: "clamp(13px, 1.4vw, 15px)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                lineHeight: 1.75,
                maxWidth: 420,
                margin: "0 auto 32px",
                fontWeight: 300,
              }}
            >
              Replace your resume with cryptographic proof of work. Your career,
              measured and ranked in real time.
            </p>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <EmailCTA navigate={navigate} label="Create free account →" />
            </div>

            <p
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
                marginTop: 16,
              }}
            >
              Questions? Contact us at{" "}
              <a
                href="mailto:discotive@gmail.com"
                style={{
                  color: "var(--gold-2)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                discotive@gmail.com
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="ld-footer">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="ld-footer-grid" style={{ marginBottom: 48 }}>
            {/* Brand col */}
            <div>
              <img
                src="/Logo with Title.png"
                alt="Discotive"
                style={{ height: 26, marginBottom: 16 }}
              />
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.75,
                  maxWidth: 240,
                  marginBottom: 20,
                }}
              >
                The execution protocol for elite operators. Replace your resume.
                Build your monopoly.
              </p>
              {/* Social icons */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {[
                  {
                    href: "https://instagram.com/discotive",
                    label: "Instagram",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        width={17}
                        height={17}
                        fill="currentColor"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ),
                  },
                  {
                    href: "https://linkedin.com/company/discotive",
                    label: "LinkedIn",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        width={17}
                        height={17}
                        fill="currentColor"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    ),
                  },
                  {
                    href: "https://youtube.com/@discotive",
                    label: "YouTube",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        width={17}
                        height={17}
                        fill="currentColor"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.015 3.015 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    ),
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    style={{
                      color: "var(--text-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      border: "0.5px solid var(--border)",
                      borderRadius: 8,
                      transition:
                        "color 0.2s, border-color 0.2s, transform 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--gold-2)";
                      e.currentTarget.style.borderColor = "var(--gold-border)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-dim)";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Platform col */}
            <div>
              <div className="ld-footer-col-title">Platform</div>
              {[
                { label: "Execution Map", href: "/auth" },
                { label: "Asset Vault", href: "/auth" },
                { label: "Leaderboard", href: "/auth" },
                { label: "Pricing", href: "/premium" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="ld-footer-link">
                  {l.label}
                </a>
              ))}
            </div>

            {/* Company col */}
            <div>
              <div className="ld-footer-col-title">Company</div>
              {[
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "Careers", href: "mailto:hello@discotive.in" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="ld-footer-link">
                  {l.label}
                </a>
              ))}
            </div>

            {/* Legal col */}
            <div>
              <div className="ld-footer-col-title">Legal</div>
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Security", href: "mailto:security@discotive.in" },
                { label: "Terms", href: "/privacy" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="ld-footer-link">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div className="ld-gold-divider" style={{ marginBottom: 24 }} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              © 2026 Discotive. All rights reserved. Built in Jaipur, India.
            </span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--gold-3)",
                fontFamily: "var(--font-body)",
              }}
            >
              Built by operators. For operators.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
