---
name: Tailwind text-white mobile rendering
description: Why text-white Tailwind class fails on some Android browsers and what to use instead
---

# Tailwind `text-white` on Mobile Browsers

## The Rule
Never use Tailwind `text-white` (or `text-white/70`, `text-white/80`) for text on colored/dark backgrounds in ZyNum. Always use inline `style={{ color: '#ffffff' }}` (or `style={{ color: 'rgba(255,255,255,0.8)' }}` for opacity variants).

**Why:** On certain Android mobile browsers (tested on Chrome for Android), Tailwind's `text-white` CSS class does not reliably apply. The text renders in a default dark/black color instead of white, especially on blue (`#1A3FFF`) or dark (`#010101`) backgrounds. This is consistent across headers, buttons, and card text.

**How to apply:** Any time text must appear white on a colored background in this project:
- ✅ `style={{ color: '#ffffff' }}`
- ✅ `style={{ color: 'rgba(255,255,255,0.85)' }}` for slightly transparent white
- ❌ `className="text-white"` — unreliable on mobile
- ❌ `className="text-white/70"` — unreliable on mobile (opacity variant also fails)

This applies to:
- Page header titles (`h1`) inside blue header bars (`bg-[#1A3FFF]`)
- Action buttons (`Payer`, `Suivante`, `Continuer`, `Réessayer`) with blue backgrounds
- Service/country name text inside colored cards
