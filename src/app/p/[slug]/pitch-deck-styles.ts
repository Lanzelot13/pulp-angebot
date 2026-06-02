// =========================================================
// Pulpmedia Pitch · Cinema Noir · v7 Stylesheet
// =========================================================
// Komplettes CSS aus dem Clickdummy-v7. Wird in PitchPage.tsx
// per <style dangerouslySetInnerHTML={__html: PITCH_DECK_CSS}>
// injiziert. Asset-Pfade zeigen auf /pitch/* (siehe public/pitch/).

export const PITCH_DECK_CSS = `/* =====================================================================
   PULPMEDIA · PITCH DECK · CINEMA NOIR
   Style sheet for the full slide system.
   ===================================================================== */

:root {
  --red: #FF1900;
  --red-soft: #ff3a23;
  --black: #000000;
  --bg: #0a0a0a;
  --card: #0e0e0e;
  --card-2: #141414;
  --ink: #f4f4f4;
  --soft: rgba(255,255,255,0.72);
  --softer: rgba(255,255,255,0.45);
  --softest: rgba(255,255,255,0.22);
  --hair: rgba(255,255,255,0.10);
  --hair-2: rgba(255,255,255,0.18);
  /* Safe-Zone-Höhen für Header und Footer – wird in Padding und Höhen verrechnet */
  --header-h: 64px;
  --footer-h: 44px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--bg); }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: "Roboto", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-weight: 400;
  line-height: 1.5;
  overflow-x: hidden;
  cursor: none;
  -webkit-font-smoothing: antialiased;
}
@media (hover: none) {
  body { cursor: auto; }
  #cursor { display: none !important; }
}
img, svg { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: transparent; border: 0; }

.anton, h1, h2, h3, h4 {
  font-family: "Anton", "Helvetica Neue", Impact, sans-serif;
  font-weight: 400; letter-spacing: 0.005em;
  text-transform: uppercase;
}

/* =====================================================================
   OVERLAYS · grain only (vignette entfernt — CI-konform)
   ===================================================================== */
.grain {
  position: fixed; inset: -10%; pointer-events: none; z-index: 8999;
  opacity: 0.12;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-size: 240px 240px;
  animation: grainShift 1.2s steps(4) infinite;
}
@keyframes grainShift {
  0%   { transform: translate(0,0); }
  25%  { transform: translate(-8px, 4px); }
  50%  { transform: translate(6px, -6px); }
  75%  { transform: translate(-4px, -8px); }
  100% { transform: translate(0,0); }
}

/* =====================================================================
   CURSOR · Pulp pixel arrow (single element, kein Trail-Ring)
   ===================================================================== */
#cursor {
  position: fixed; top: 0; left: 0; pointer-events: none;
  z-index: 10001;
  width: 26px; height: 26px;
  /* hotspot at tip of arrow (~5,0 in 50px viewBox → ~2.6,0 in 26px) */
  margin: 0 0 0 -2px;
  will-change: transform;
  transition: width 0.18s ease, height 0.18s ease, margin 0.18s ease;
}
#cursor img { width: 100%; height: 100%; display: block; }
#cursor.hover { width: 36px; height: 36px; margin: 0 0 0 -3px; }
#cursor.click { width: 22px; height: 22px; margin: 0 0 0 -2px; }
/* Auf Flip-Cards: Custom-Cursor weg, nativen Pointer zeigen (sonst doppelte Hand-Hand-Anzeige) */
body:has(.flip-card:hover) #cursor { display: none; }
.flip-card, .flip-card * { cursor: pointer !important; }

/* =====================================================================
   HEADER · sticky, mix-blend-mode difference so it adapts to any bg
   ===================================================================== */
header.bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  padding: 18px 32px;
  display: grid; grid-template-columns: 1fr auto 1fr;
  gap: 24px; align-items: center;
  background: #000;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
header.bar .logo { display: flex; align-items: center; gap: 12px; }
header.bar .logo svg { height: 22px; width: auto; color: #fff; }
header.bar .logo svg path, header.bar .logo svg g path { fill: currentColor; }
header.bar .center {
  font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase;
  color: #fff; font-weight: 500;
  display: flex; gap: 14px; align-items: center; justify-content: center;
}
header.bar .center .dot { width: 4px; height: 4px; background: var(--red); border-radius: 50%; }
header.bar .right {
  justify-self: end;
  display: flex; gap: 10px; align-items: center;
}
header.bar .mode-toggle {
  display: inline-flex; align-items: center;
  border: 1px solid rgba(255,255,255,0.4); border-radius: 999px;
  overflow: hidden; cursor: none;
}
header.bar .mode-toggle button {
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  font-weight: 600;
  color: #fff;
  padding: 7px 14px;
  cursor: none;
  transition: background 0.18s, color 0.18s;
}
header.bar .mode-toggle button.on {
  background: var(--red); color: #fff;
}
header.bar .right { gap: 10px; }
header.bar .fs-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 6px;
  background: transparent;
  color: #fff;
  cursor: none;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}
header.bar .fs-btn:hover { background: var(--red); border-color: var(--red); }
header.bar .fs-btn svg { display: block; }

/* progress bar */
.progress {
  position: fixed; left: 0; top: 0; height: 2px; width: 0%;
  background: var(--red);
  z-index: 1001;
  transition: width 0.05s linear;
}

/* slide counter — opaque footer bar als Safe-Zone */
.pager {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 999;
  padding: 14px 32px;
  font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--softer); font-weight: 500;
  background: #000;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}
.pager .cur { color: #fff; }
.pager .label { color: var(--red); }

/* =====================================================================
   SLIDE BASE
   ===================================================================== */
section.slide {
  position: relative;
  min-height: 100vh; min-height: 100svh;
  /* Padding hält Header- und Footer-Safe-Zone frei. Wer auf 100% Höhe will, rechnet
     mit calc(100vh - var(--header-h) - var(--footer-h)). */
  padding: calc(var(--header-h) + 24px) 6vw calc(var(--footer-h) + 24px);
  display: flex; flex-direction: column;
  overflow: hidden;
}
/* Im Slides-Mode ist die nutzbare Höhe exakt zwischen Header und Footer.
   Damit ragt nichts mehr hinter die Safe-Zones. */
body.mode-slides section.slide {
  height: 100vh; height: 100svh;
  min-height: 0; max-height: 100vh; max-height: 100svh;
}

/* slides mode: each slide one viewport, snap-scroll
   NOTE: snap-type must live on the actual scroll container (html / body),
   not on <main> — otherwise it never engages. */
html:has(body.mode-slides),
body.mode-slides {
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
}
body.mode-slides section.slide {
  height: 100vh; height: 100svh;
  min-height: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

/* eyebrow */
.eyebrow {
  font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--red); font-weight: 600;
  display: flex; align-items: center; gap: 14px;
}
.eyebrow .bar { display: none; }

/* slide title (h2) */
.slide-title {
  font-size: clamp(56px, 7.5vw, 132px); line-height: 0.92;
  color: #fff;
}
.slide-title .red { color: var(--red); }

/* universal title end-icon (replaces trailing period) */
.slide-title .title-ico {
  display: inline-block;
  width: 0.82em; height: 0.82em;
  background: var(--red);
  -webkit-mask-position: center; mask-position: center;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-size: contain; mask-size: contain;
  margin-left: 0.06em;
  vertical-align: -0.04em;
}
.slide.team .intro-team .slide-title .title-ico { -webkit-mask-image: url("/pitch/26724611-a3c8-4fc1-9d45-522ea2e61c56.svg"); mask-image: url("/pitch/26724611-a3c8-4fc1-9d45-522ea2e61c56.svg"); }
.slide.leistungen .slide-title .title-ico { -webkit-mask-image: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg"); mask-image: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg"); }
.slide.monitor .slide-title .title-ico { -webkit-mask-image: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg"); mask-image: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg"); }
.slide.process .slide-title .title-ico { -webkit-mask-image: url("/pitch/33371e7b-b495-4d4a-9bcc-bfa6895fa683.svg"); mask-image: url("/pitch/33371e7b-b495-4d4a-9bcc-bfa6895fa683.svg"); }
.slide.fragen .slide-title .title-ico { -webkit-mask-image: url("/pitch/26724611-a3c8-4fc1-9d45-522ea2e61c56.svg"); mask-image: url("/pitch/26724611-a3c8-4fc1-9d45-522ea2e61c56.svg"); }
.slide.tipps:not(.fragen) .slide-title .title-ico { -webkit-mask-image: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg"); mask-image: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg"); }

/* slide intro layout (eyebrow + title + sub) */
.intro { max-width: 1400px; margin: 0 0 64px; }
.intro .eyebrow { margin-bottom: 22px; }
.intro .sub { margin-top: 18px; max-width: 760px; color: var(--soft); font-size: 17px; line-height: 1.5; }

/* reveal primitives */
.reveal-mask { display: inline-block; overflow: hidden; vertical-align: bottom; line-height: 0.95; }
.reveal-char {
  display: inline-block;
  transform: translateY(105%);
  transition: transform 1.05s cubic-bezier(0.2, 0.85, 0.2, 1);
}
.revealed .reveal-char { transform: translateY(0); }
.reveal-fade {
  opacity: 0; transform: translateY(28px);
  transition: opacity 1s cubic-bezier(0.2,0.8,0.2,1), transform 1s cubic-bezier(0.2,0.8,0.2,1);
}
.revealed .reveal-fade { opacity: 1; transform: translateY(0); }
.delay-1 { transition-delay: 0.10s; }
.delay-2 { transition-delay: 0.20s; }
.delay-3 { transition-delay: 0.34s; }
.delay-4 { transition-delay: 0.48s; }
.delay-5 { transition-delay: 0.62s; }
.delay-6 { transition-delay: 0.76s; }
.delay-7 { transition-delay: 0.90s; }

/* small icon helper */
.ico { display: inline-block; width: 1em; height: 1em; vertical-align: -0.12em; }
.ico img { width: 100%; height: 100%; display: block; }

/* =====================================================================
   01 HERO
   ===================================================================== */
.slide.hero { justify-content: center; align-items: center; text-align: center; }
.slide.hero .meta-top {
  font-size: 11px; letter-spacing: 0.4em; color: var(--soft); margin-bottom: 56px;
  text-transform: uppercase; font-weight: 500;
  display: flex; gap: 26px; align-items: center; justify-content: center;
}
.slide.hero .meta-top .dot { width: 4px; height: 4px; background: var(--red); border-radius: 50%; }
.slide.hero h1 {
  font-size: clamp(120px, 22vw, 380px); line-height: 0.82; color: #fff;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.slide.hero h1 .red { color: var(--red); }
/* Hero · two horn-hands flanking HALLO, gentle bounce */
.slide.hero h1 .hand {
  display: inline-block;
  width: 0.72em; height: 0.92em;
  background: var(--red);
  -webkit-mask: url("/pitch/52151548-7289-483a-9c12-0984d74c6257.svg") center/contain no-repeat;
  mask: url("/pitch/52151548-7289-483a-9c12-0984d74c6257.svg") center/contain no-repeat;
  vertical-align: middle;
  margin: 0 0.10em;
}
.slide.hero h1 .hand-l {
  transform-origin: 50% 80%;
  animation: heroCheerL 2.6s ease-in-out infinite;
}
.slide.hero h1 .hand-r {
  transform-origin: 50% 80%;
  animation: heroCheerR 2.6s ease-in-out infinite;
  animation-delay: 0.18s;
}
@keyframes heroCheerL {
  0%, 100% { transform: rotate(-14deg) translateY(0); }
  50%      { transform: rotate(-14deg) translateY(-12px); }
}
@keyframes heroCheerR {
  0%, 100% { transform: scaleX(-1) rotate(-14deg) translateY(0); }
  50%      { transform: scaleX(-1) rotate(-14deg) translateY(-12px); }
}
.slide.hero h1 .ico-burst {
  display: inline-block; width: 0.52em; height: 0.52em;
  vertical-align: 0.05em; margin-left: 0.05em;
  animation: spinSlow 18s linear infinite;
}
@keyframes spinSlow { to { transform: rotate(360deg); } }
.slide.hero .meta-bottom {
  margin-top: 64px;
  display: flex; gap: 56px; flex-wrap: wrap; justify-content: center;
}
.slide.hero .meta-bottom .it { text-align: center; }
.slide.hero .meta-bottom .k {
  font-size: 10px; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--red); font-weight: 600; display: block; margin-bottom: 6px;
}
.slide.hero .meta-bottom .v {
  font-family: "Roboto", sans-serif; font-weight: 500;
  font-size: 13px; letter-spacing: 0.06em; color: var(--ink);
}
.slide.hero .scroll-hint {
  position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%);
  font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase; color: var(--softer);
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}
.slide.hero .scroll-hint .line {
  width: 1px; height: 36px; background: var(--red);
  animation: scrollPulse 2.2s ease-in-out infinite;
  transform-origin: top;
}
@keyframes scrollPulse {
  0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
  50%      { transform: scaleY(1); opacity: 1; }
}
body.mode-slides .slide.hero .scroll-hint { display: none; }

/* =====================================================================
   02 WER IST DA · All-Pulpies grid (attendees in color, rest grayed)
   ===================================================================== */
.slide.team { justify-content: flex-start; padding-top: 80px; }
.slide.team .intro-team { margin: 0 auto 22px; max-width: 1700px; width: 100%; }
.slide.team .intro-team .slide-title {
  font-size: clamp(40px, 4.2vw, 64px); line-height: 0.95;
}
.slide.team .intro-team .sub { margin-top: 10px; font-size: 14px; }
.slide.team .all-pulpies {
  display: grid;
  grid-template-columns: repeat(7, 185px);
  gap: 0;
  justify-content: center;
  width: 100%;
}
.slide.team .pulpie {
  position: relative;
  opacity: 0.32;
  transition: opacity .35s ease;
}
.slide.team .pulpie .photo {
  aspect-ratio: 1 / 1;
  background: var(--card-2);
  overflow: hidden;
  position: relative;
}
.slide.team .pulpie .photo::before {
  /* readability gradient for the name overlay */
  content: ""; position: absolute; inset: auto 0 0 0; height: 55%;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.78));
  pointer-events: none; z-index: 1;
}
.slide.team .pulpie .photo img {
  width: 100%; height: 100%; object-fit: cover;
  filter: grayscale(1) contrast(0.9) brightness(0.7);
  transition: filter .4s ease;
}
.slide.team .pulpie .nm {
  position: absolute;
  left: 10px; right: 10px; bottom: 10px;
  font-family: "Anton", Impact, sans-serif;
  font-size: 14px; line-height: 1; letter-spacing: 0.04em;
  color: #fff;
  text-transform: uppercase;
  z-index: 2;
}
/* Attending state */
.slide.team .pulpie[data-attending="1"] { opacity: 1; }
.slide.team .pulpie[data-attending="1"] .photo img { filter: none; }
.slide.team .pulpie[data-attending="1"] .nm { color: var(--red); }
/* Subtle red dot for attendees */
.slide.team .pulpie[data-attending="1"] .photo::after {
  content: ""; position: absolute; top: 10px; left: 10px;
  width: 6px; height: 6px; background: var(--red); border-radius: 50%;
  z-index: 2;
}

/* =====================================================================
   03 IN DREI ZAHLEN
   ===================================================================== */
.slide.numbers { justify-content: center; }
.slide.numbers .grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  max-width: 1500px;
}
.slide.numbers .num-item {
  padding: 40px 28px; text-align: center;
  border-left: 1px solid var(--hair); position: relative;
}
.slide.numbers .num-item:first-child { border-left: 0; }
.slide.numbers .num-item .icon {
  width: 42px; height: 42px; margin: 0 auto 18px;
  opacity: 0.85;
}
.slide.numbers .num-item .num {
  font-family: Anton; font-size: clamp(110px, 16vw, 240px); line-height: 0.92;
  color: #fff; display: flex; justify-content: center; align-items: baseline;
}
.slide.numbers .num-item .num .suffix { color: var(--red); font-size: 0.55em; line-height: 1; margin-left: 4px; }
.slide.numbers .num-item .num [data-counter] { display: inline-block; min-width: 1.4em; text-align: center; }
.slide.numbers .num-item .lbl {
  font-size: 12px; letter-spacing: 0.22em; color: var(--softer);
  margin-top: 18px; text-transform: uppercase; font-weight: 500;
}
.slide.numbers .num-item .desc {
  font-size: 14px; color: var(--soft); margin-top: 14px; max-width: 300px;
  margin-left: auto; margin-right: auto;
}

/* =====================================================================
   04 MANIFEST
   ===================================================================== */
.slide.manifest { justify-content: center; padding: 110px 5vw; }
.slide.manifest .wrap { max-width: 1500px; margin: 0 auto; position: relative; width: 100%; }
.slide.manifest h2 {
  font-size: clamp(64px, 11vw, 200px); line-height: 0.92; color: #fff;
}
.slide.manifest h2 .red { color: var(--red); }
.slide.manifest h2 .punch {
  display: inline-flex; align-items: center; gap: 0;
}
.slide.manifest h2 .punch .ic {
  width: clamp(60px, 9vw, 160px);
  height: clamp(60px, 9vw, 160px);
  margin-left: 18px;
  animation: heartBeat 1.6s ease-in-out infinite;
}
@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  10%      { transform: scale(1.12); }
  20%      { transform: scale(0.96); }
  30%      { transform: scale(1.08); }
  40%      { transform: scale(1); }
}
.slide.manifest .body {
  margin-top: 48px; max-width: 760px; font-size: 19px; line-height: 1.5; color: var(--soft);
}
.slide.manifest .icon-wm {
  position: absolute; right: -120px; bottom: -180px;
  width: 600px; opacity: 0.04;
  transform: rotate(-12deg);
  pointer-events: none;
}

/* =====================================================================
   05 ORIGIN STORY · 3 acts
   ===================================================================== */
.slide.origin { justify-content: center; }
.slide.origin .acts {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 28px; max-width: 1500px;
}
.slide.origin .act {
  display: flex; flex-direction: column; gap: 22px;
}
.slide.origin .act .image-slot {
  aspect-ratio: 4/3;
  background: var(--card-2);
  border: 1px solid var(--hair);
  position: relative; overflow: hidden;
}
.slide.origin .act .image-slot img { width: 100%; height: 100%; object-fit: cover; }
.slide.origin .act .image-slot .slot-lbl {
  position: absolute; top: 14px; left: 14px;
  font-size: 9px; letter-spacing: 0.22em; color: var(--softer);
  border: 1px solid var(--hair-2); padding: 4px 8px;
  text-transform: uppercase; font-weight: 600;
}
.slide.origin .act .year {
  font-family: Anton; font-size: 42px; color: var(--red); line-height: 1;
}
.slide.origin .act h3 {
  font-size: 30px; color: #fff; line-height: 1.05;
}
.slide.origin .act h3 .red { color: var(--red); }
.slide.origin .act p {
  font-size: 15px; color: var(--soft); line-height: 1.5;
}

/* =====================================================================
   06 HEUTE · Phone-Frame with TikTok / Instagram embed
   ===================================================================== */
.slide.heute { justify-content: center; }
.slide.heute .layout {
  display: grid; grid-template-columns: 1fr auto; gap: 80px; align-items: center;
  max-width: 1500px;
}
.slide.heute .copy { }
.slide.heute .copy .eyebrow { margin-bottom: 22px; }
.slide.heute .copy h2 {
  font-size: clamp(40px, 4.6vw, 76px); line-height: 0.95; margin-bottom: 32px;
  display: inline-flex; align-items: center; gap: 0.06em;
  white-space: nowrap;
}
.slide.heute .copy h2 .red { color: var(--red); }
.slide.heute .copy h2 .title-ico {
  display: inline-block;
  width: 0.82em; height: 0.82em;
  background: var(--red);
  -webkit-mask: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg") center/contain no-repeat;
  mask: url("/pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg") center/contain no-repeat;
  transform: translateY(-0.02em);
}
.slide.heute .copy .stats { display: flex; gap: 36px; margin-top: 0; flex-wrap: wrap; }
.slide.heute .copy .stats .m { display: flex; flex-direction: column; gap: 8px; }
.slide.heute .copy .stats .m .v {
  font-family: "Anton", Impact, sans-serif;
  font-size: clamp(52px, 5.4vw, 84px); line-height: 1; color: #fff;
  display: flex; align-items: baseline; gap: 6px;
}
.slide.heute .copy .stats .m .v .u {
  color: var(--red); font-size: 0.42em; letter-spacing: 0.04em;
  font-weight: 700; text-transform: uppercase;
}
.slide.heute .copy .stats .m .l {
  font-size: 11px; letter-spacing: 0.22em; color: var(--softer);
  text-transform: uppercase; font-weight: 600;
}
.phone-frame {
  width: 340px; aspect-ratio: 9/19.5;
  background: var(--black);
  border-radius: 44px;
  padding: 14px;
  box-shadow:
    0 0 0 2px var(--card-2),
    0 0 0 3px var(--hair),
    0 20px 60px -10px rgba(0,0,0,0.6);
  position: relative;
}
.phone-frame::before {
  content: ""; position: absolute; top: 22px; left: 50%; transform: translateX(-50%);
  width: 100px; height: 24px; background: #000;
  border-radius: 999px; z-index: 2;
}
.phone-frame .screen {
  width: 100%; height: 100%;
  border-radius: 32px;
  background: var(--card-2);
  overflow: hidden; position: relative;
}
.phone-frame .screen .slot-lbl {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px;
  color: var(--softer);
  font-family: Anton; font-size: 12px; letter-spacing: 0.24em;
  text-align: center; padding: 24px;
}
.phone-frame .screen .slot-lbl .ic { width: 40px; height: 40px; opacity: 0.6; }
.phone-frame .screen .slot-lbl .ic img { width: 100%; height: 100%; }
.phone-frame .screen > img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.phone-frame .screen iframe,
.phone-frame .screen blockquote,
.phone-frame .screen video,
.phone-frame .screen .embed { width: 100% !important; height: 100% !important; border: 0 !important; max-width: none !important; min-width: 0 !important; object-fit: cover; }

/* =====================================================================
   07 LOVE BRANDS · Logo grid
   ===================================================================== */
.slide.love-brands { justify-content: center; }
.slide.love-brands .slide-title .title-ico {
  display: inline-block;
  width: 0.82em; height: 0.82em;
  background: var(--red);
  -webkit-mask: url("/pitch/e356859b-c7c0-4aa1-8604-215c16858fba.svg") center/contain no-repeat;
  mask: url("/pitch/e356859b-c7c0-4aa1-8604-215c16858fba.svg") center/contain no-repeat;
  margin-left: 0.06em;
  vertical-align: -0.04em;
}
.slide.love-brands .grid {
  display: grid; grid-template-columns: repeat(6, 1fr);
  background: var(--hair);
  gap: 1px;
  max-width: 1280px;
  margin-left: auto; margin-right: auto;
  border: 1px solid var(--hair);
}
.slide.love-brands .brand {
  aspect-ratio: 16/11;
  background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  padding: 20px 24px;
  position: relative;
  transition: background 0.3s ease;
}
.slide.love-brands .brand:hover { background: #141414; }
.slide.love-brands .brand .logo-slot {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
/* Equalize visual weight: wordmarks default, badges bigger, tall pills medium */
.slide.love-brands .brand .logo-slot img {
  max-height: 62%; max-width: 80%;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.92;
  transition: opacity 0.25s ease;
}
.slide.love-brands .brand[data-shape="badge"] .logo-slot img { max-height: 86%; max-width: 80%; }
.slide.love-brands .brand[data-shape="tall"]  .logo-slot img { max-height: 76%; max-width: 78%; }
.slide.love-brands .brand:hover .logo-slot img { opacity: 1; }

/* =====================================================================
   08 SÄULEN · interactive horizontal panels (hover-expand)
   ===================================================================== */
/* Säulen-Slide ist inhaltsreich. flex-start hält Eyebrow + Headline oben sicher
   in der Safe-Zone, die Pillars wachsen nach unten gegen den Footer. */
.slide.saeulen { justify-content: flex-start; gap: 36px; }
.slide.saeulen .pillars { flex: 1; min-height: 0; }
.slide.saeulen .slide-title .title-ico {
  display: inline-block;
  width: 0.82em; height: 0.82em;
  background: var(--red);
  -webkit-mask: url("/pitch/e356859b-c7c0-4aa1-8604-215c16858fba.svg") center/contain no-repeat;
  mask: url("/pitch/e356859b-c7c0-4aa1-8604-215c16858fba.svg") center/contain no-repeat;
  margin-left: 0.06em;
  vertical-align: -0.04em;
}
.slide.saeulen .pillar h3 .t {
  display: block;
  font-family: "Anton", Impact, sans-serif;
  font-size: clamp(22px, 2vw, 32px); line-height: 1; color: #fff;
  letter-spacing: 0.01em;
}
.slide.saeulen .pillar h3 .s {
  display: block; margin-top: 8px;
  font-family: "Roboto", sans-serif; font-weight: 600;
  font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--softer);
}
.slide.saeulen .pillar h3 .s .red { color: var(--red); }
.slide.saeulen .pillars {
  display: flex; gap: 1px;
  max-width: 1500px;
  background: var(--hair);
  border-top: 1px solid var(--hair);
  border-bottom: 1px solid var(--hair);
  /* container height fits content of biggest pillar */
  min-height: 480px;
}
.slide.saeulen .pillar {
  flex: 1 1 0;
  background: var(--bg);
  padding: 36px 24px;
  position: relative;
  cursor: none;
  display: flex; flex-direction: column; gap: 18px;
  overflow: hidden;
  transition: flex 0.55s cubic-bezier(0.22, 0.85, 0.22, 1), background 0.4s ease;
  min-width: 0;
}
.slide.saeulen .pillar:hover { background: rgba(255,25,0,0.05); }
.slide.saeulen .pillar .num {
  font-family: Anton; font-size: 14px; letter-spacing: 0.2em; color: var(--red);
  font-weight: 600;
}
.slide.saeulen .pillar .icon { width: 56px; height: 56px; transition: transform 0.4s ease; }
.slide.saeulen .pillar:hover .icon { transform: scale(1.1) rotate(-4deg); }
.slide.saeulen .pillar h3 {
  font-size: clamp(22px, 2vw, 32px); line-height: 1; color: #fff;
}
.slide.saeulen .pillar h3 .red { color: var(--red); }
.slide.saeulen .pillar p {
  font-size: 14.5px; color: var(--soft); line-height: 1.55;
  max-height: 0; opacity: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.22, 0.85, 0.22, 1), opacity 0.35s ease 0.1s;
}
/* hover-state: expand */
.slide.saeulen .pillars:hover .pillar { flex: 0.7 1 0; }
.slide.saeulen .pillars:hover .pillar:hover { flex: 3.4 1 0; }
.slide.saeulen .pillar:hover p { max-height: 220px; opacity: 1; }
.slide.saeulen .indicator {
  margin-top: 28px; max-width: 1500px;
  font-size: 10px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--softer);
  display: flex; align-items: center; gap: 12px; font-weight: 600;
}
.slide.saeulen .indicator .pulse {
  width: 8px; height: 8px; background: var(--red); border-radius: 50%;
  animation: pulsePoint 1.4s ease-in-out infinite;
}
@keyframes pulsePoint {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.5); opacity: 0.5; }
}

/* =====================================================================
   09 LEISTUNGEN · 3x3 grid with hover-reveal
   ===================================================================== */
.slide.leistungen { justify-content: center; }
.slide.leistungen .grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  max-width: 1500px;
  border-top: 1px solid var(--hair);
  border-left: 1px solid var(--hair);
}
.slide.leistungen .it {
  padding: 28px 28px 28px;
  border-right: 1px solid var(--hair);
  border-bottom: 1px solid var(--hair);
  display: flex; flex-direction: column; gap: 14px;
  position: relative;
  cursor: none;
  transition: background 0.3s ease;
  overflow: hidden;
  min-height: 200px;
}
.slide.leistungen .it:hover { background: rgba(255,25,0,0.05); }
.slide.leistungen .it .row { display: flex; align-items: center; gap: 14px; }
.slide.leistungen .it .icon { width: 36px; height: 36px; flex: 0 0 auto; transition: transform 0.35s ease; }
.slide.leistungen .it:hover .icon { transform: rotate(-8deg) scale(1.1); }
.slide.leistungen .it .num {
  font-family: Anton; font-size: 14px; letter-spacing: 0.2em; color: var(--red);
}
.slide.leistungen .it h3 {
  font-size: 22px; color: #fff; line-height: 1.1;
}
.slide.leistungen .it p {
  font-size: 13.5px; color: var(--soft); line-height: 1.5;
  max-height: 0; opacity: 0;
  overflow: hidden;
  transition: max-height 0.45s cubic-bezier(0.22,0.85,0.22,1), opacity 0.3s ease 0.08s;
}
.slide.leistungen .it:hover p { max-height: 200px; opacity: 1; }

/* =====================================================================
   10 CASE · Full-bleed video (YouTube) with overlay
   ===================================================================== */
.slide.case { padding: 0; justify-content: center; align-items: center; background: #000; }
/* Case-Video bleibt innerhalb der Safe-Zone (Header oben, Footer unten),
   damit die YouTube-Bedienelemente nicht hinter dem Footer verschwinden. */
.slide.case .media {
  position: absolute;
  top: var(--header-h);
  right: 0;
  bottom: var(--footer-h);
  left: 0;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.slide.case .media iframe,
.slide.case .media video,
.slide.case .media .embed {
  width: 100%; height: 100%; border: 0; object-fit: contain;
}
.slide.case .media .placeholder {
  width: 100%; height: 100%;
  background: var(--black);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--softer); position: relative;
}
.slide.case .media .placeholder::before {
  content: ""; position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 4px);
  pointer-events: none;
}
.slide.case .media .placeholder .play {
  width: 88px; height: 88px; border: 2px solid var(--red); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.slide.case .media .placeholder .play::after {
  content: ""; width: 0; height: 0;
  border-left: 20px solid var(--red);
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
  margin-left: 5px;
}
.slide.case .media .placeholder .slot-lbl {
  font-family: Anton; font-size: 14px; letter-spacing: 0.3em; color: var(--softer);
  margin-top: 18px; text-transform: uppercase;
}
.slide.case .case-overlay {
  position: relative; z-index: 2;
  min-height: 100vh; min-height: 100svh;
  padding: calc(var(--header-h) + 24px) 6vw calc(var(--footer-h) + 24px);
  display: grid; grid-template-rows: 1fr 1fr; gap: 24px;
  /* dezenter solid-tint statt Verlauf */
  background: rgba(0,0,0,0.35);
}
body.mode-slides .slide.case .case-overlay { min-height: 0; height: 100vh; height: 100svh; }
.slide.case .case-overlay .top { display: flex; justify-content: flex-end; align-items: flex-start; }
.slide.case .case-overlay .top .quote-box { max-width: 520px; padding: 12px 0; }
.slide.case .case-overlay .top .quote-box .ic {
  width: 42px; height: 42px; margin-bottom: 14px; opacity: 0.9;
}
.slide.case .case-overlay .top .quote-box .q {
  font-family: Anton; font-size: clamp(20px, 2vw, 30px); line-height: 1.2; color: #fff;
  text-transform: uppercase;
}
.slide.case .case-overlay .top .quote-box .by {
  margin-top: 12px; font-size: 10px; letter-spacing: 0.28em; color: var(--softer);
  text-transform: uppercase; font-weight: 500;
}
.slide.case .case-overlay .bottom { display: flex; flex-direction: column; justify-content: flex-end; }
.slide.case .case-overlay .bottom .client {
  font-size: 10px; letter-spacing: 0.34em; color: var(--red); margin-bottom: 18px; font-weight: 600;
}
.slide.case .case-overlay .bottom h3 {
  font-size: clamp(56px, 9vw, 160px); line-height: 0.9; color: #fff; max-width: 1100px;
}
.slide.case .case-overlay .bottom h3 .red { color: var(--red); }
.slide.case .case-overlay .bottom .metrics {
  margin-top: 36px; display: flex; gap: 48px; flex-wrap: wrap;
}
.slide.case .case-overlay .bottom .metrics .m { display: flex; flex-direction: column; gap: 4px; }
.slide.case .case-overlay .bottom .metrics .m .v { font-family: Anton; font-size: 38px; line-height: 1; color: #fff; }
.slide.case .case-overlay .bottom .metrics .m .l { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--softer); font-weight: 500; }

/* =====================================================================
   11 SOCIAL CASE · Phone frame with TikTok / Instagram embed
   ===================================================================== */
.slide.social-case { justify-content: center; }
.slide.social-case .layout {
  display: grid; grid-template-columns: 1fr auto; gap: 80px; align-items: center;
  max-width: 1500px;
}
.slide.social-case .copy h3 {
  font-size: clamp(48px, 6.5vw, 100px); line-height: 0.92; color: #fff; margin-bottom: 22px;
}
.slide.social-case .copy h3 .red { color: var(--red); }
.slide.social-case .copy h3 .title-ico {
  display: inline-block;
  width: 0.72em; height: 0.72em;
  background: var(--red);
  -webkit-mask: url("/pitch/26724611-a3c8-4fc1-9d45-522ea2e61c56.svg") center/contain no-repeat;
  mask: url("/pitch/26724611-a3c8-4fc1-9d45-522ea2e61c56.svg") center/contain no-repeat;
  margin-left: 0.06em;
  vertical-align: -0.02em;
}
.slide.social-case .copy .client {
  font-size: 10px; letter-spacing: 0.32em; color: var(--red); margin-bottom: 14px; font-weight: 600;
}
.slide.social-case .copy .lead { font-size: 17px; color: var(--soft); line-height: 1.55; max-width: 540px; }
.slide.social-case .copy .metrics { display: flex; gap: 32px; margin-top: 36px; flex-wrap: wrap; }
.slide.social-case .copy .metrics .m .v { font-family: Anton; font-size: 38px; color: #fff; line-height: 1; }
.slide.social-case .copy .metrics .m .v .red { color: var(--red); }
.slide.social-case .copy .metrics .m .l { font-size: 10px; letter-spacing: 0.24em; color: var(--softer); text-transform: uppercase; font-weight: 500; margin-top: 6px; }
.slide.social-case .copy .platform-tag {
  display: inline-flex; align-items: center; gap: 10px;
  border: 1px solid var(--hair-2);
  padding: 6px 12px;
  font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--soft);
  margin-top: 28px; font-weight: 600;
}
.slide.social-case .copy .platform-tag .ic { width: 12px; height: 12px; background: var(--red); border-radius: 50%; }

/* =====================================================================
   12 BRAND MONITOR · Data slide
   ===================================================================== */
.slide.monitor { justify-content: center; padding-top: 90px; }
.slide.monitor .intro { margin-bottom: 36px; }

.slide.monitor .bm-card {
  width: 100%; max-width: 1180px;
  margin-left: auto; margin-right: auto;
  border: 1px solid var(--hair);
  background: #0d0d0d;
}
/* Head: handle + rank badge */
.slide.monitor .bm-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28px 36px;
  border-bottom: 1px solid var(--hair);
}
.slide.monitor .bm-head .acct {
  font-family: "Anton", Impact, sans-serif;
  font-size: clamp(28px, 3vw, 46px); color: #fff; letter-spacing: 0.01em;
}
.slide.monitor .bm-head .acct .at { color: var(--red); }
.slide.monitor .rank-badge {
  display: flex; align-items: center; gap: 14px;
}
.slide.monitor .rank-badge .rk {
  font-family: "Anton", Impact, sans-serif;
  width: 56px; height: 56px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 30px; color: #08110a;
}
.slide.monitor .rank-badge .rl {
  font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--softer); font-weight: 600; max-width: 130px; line-height: 1.3;
}
.slide.monitor .rank-badge.r-a .rk { background: #22c55e; }
.slide.monitor .rank-badge.r-b .rk { background: #3b82f6; color: #fff; }
.slide.monitor .rank-badge.r-c .rk { background: #eab308; }
.slide.monitor .rank-badge.r-d .rk { background: var(--red); color: #fff; }

/* Big stats row */
.slide.monitor .bm-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--hair);
}
.slide.monitor .bm-stats .st {
  padding: 28px 36px;
  border-right: 1px solid var(--hair);
  display: flex; flex-direction: column; gap: 8px;
}
.slide.monitor .bm-stats .st:last-child { border-right: 0; }
.slide.monitor .bm-stats .st .v {
  font-family: "Anton", Impact, sans-serif;
  font-size: clamp(40px, 4.2vw, 60px); line-height: 0.95; color: #fff;
}
.slide.monitor .bm-stats .st.accent .v { color: var(--red); }
.slide.monitor .bm-stats .st .l {
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--softer); font-weight: 600;
}

/* Comparison bars */
.slide.monitor .bm-compare { padding: 28px 36px; border-bottom: 1px solid var(--hair); }
.slide.monitor .bm-compare .cmp-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
}
.slide.monitor .bm-compare .cmp-head .lbl {
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--soft); font-weight: 600;
}
.slide.monitor .bm-compare .zones { display: flex; gap: 6px; }
.slide.monitor .bm-compare .zones .z {
  width: 22px; height: 22px; border-radius: 5px;
  display: flex; align-items: center; justify-content: center;
  font-family: "Anton", Impact, sans-serif; font-size: 12px; color: #08110a;
}
.slide.monitor .bm-compare .zones .z.a { background: #22c55e; }
.slide.monitor .bm-compare .zones .z.b { background: #3b82f6; color: #fff; }
.slide.monitor .bm-compare .zones .z.c { background: #eab308; }
.slide.monitor .bm-compare .zones .z.d { background: var(--red); color: #fff; }
.slide.monitor .bm-compare .cmp-rows { display: flex; flex-direction: column; gap: 14px; }
.slide.monitor .bm-compare .row {
  display: grid; grid-template-columns: 220px 1fr 70px; align-items: center; gap: 18px;
}
.slide.monitor .bm-compare .row .nm {
  font-size: 14px; color: var(--soft); letter-spacing: 0.02em;
}
.slide.monitor .bm-compare .row .nm em { color: var(--softer); font-style: normal; }
.slide.monitor .bm-compare .row.focus .nm { color: #fff; font-weight: 600; }
.slide.monitor .bm-compare .row .track {
  height: 10px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;
}
.slide.monitor .bm-compare .row .track .fill {
  display: block; height: 100%; background: var(--red); border-radius: 999px;
}
.slide.monitor .bm-compare .row .track .fill.ghost { background: rgba(255,255,255,0.28); }
.slide.monitor .bm-compare .row .pct {
  font-family: "Anton", Impact, sans-serif; font-size: 18px; color: #fff; text-align: right;
}
.slide.monitor .bm-compare .row.focus .pct { color: var(--red); }

/* Footer: breakdown + link */
.slide.monitor .bm-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 36px;
}
.slide.monitor .bm-foot .breakdown {
  display: flex; gap: 30px; flex-wrap: wrap;
  font-size: 13px; color: var(--softer); letter-spacing: 0.02em;
}
.slide.monitor .bm-foot .breakdown b { color: #fff; font-weight: 700; }
.slide.monitor .bm-foot .bm-link {
  font-size: 12px; letter-spacing: 0.12em; color: var(--red); text-decoration: none;
  font-weight: 600; text-transform: lowercase; white-space: nowrap;
}
.slide.monitor .bm-foot .bm-link .arr { font-weight: 400; }
.slide.monitor .bm-foot .bm-link:hover { text-decoration: underline; }

/* =====================================================================
   13 QUOTE / Testimonial
   ===================================================================== */
.slide.quote { justify-content: center; padding: 110px 8vw; }
.slide.quote .wrap { max-width: 1300px; margin: 0 auto; position: relative; }
.slide.quote .ic {
  width: 96px; height: 96px; margin-bottom: 32px;
}
.slide.quote .q {
  font-family: Anton; font-size: clamp(40px, 5vw, 84px); line-height: 1.05;
  color: #fff; text-transform: none;
  letter-spacing: 0.005em;
}
.slide.quote .q .red { color: var(--red); }
.slide.quote .by {
  margin-top: 44px;
  display: flex; align-items: center; gap: 18px;
}
.slide.quote .by .avatar {
  display: none;
  width: 60px; height: 60px; border-radius: 50%;
  background: var(--card-2); border: 1px solid var(--hair);
  overflow: hidden; flex: 0 0 auto;
}
.slide.quote .by .avatar img { width: 100%; height: 100%; object-fit: cover; }
.slide.quote .by .info .n { font-family: Anton; font-size: 20px; color: #fff; }
.slide.quote .by .info .r { font-size: 12px; letter-spacing: 0.18em; color: var(--softer); text-transform: uppercase; font-weight: 600; margin-top: 4px; }

/* =====================================================================
   14 SPLITSCREEN VORHER/NACHHER
   ===================================================================== */
.slide.split { padding: 0; }
.slide.split .split-layout {
  display: grid; grid-template-columns: 1fr 1fr;
  min-height: 100vh; min-height: 100svh;
}
body.mode-slides .slide.split .split-layout { min-height: 0; height: 100vh; height: 100svh; }
.slide.split .pane {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  padding: 40px;
}
.slide.split .pane.before { background: var(--card-2); }
.slide.split .pane.after { background: var(--bg); border-left: 1px solid var(--hair); }
.slide.split .pane .label {
  position: absolute; top: 110px; left: 36px;
  font-family: Anton; font-size: 56px;
  color: var(--softer); letter-spacing: 0.08em;
}
.slide.split .pane.after .label { color: var(--red); }
.slide.split .pane .body { position: absolute; bottom: 36px; left: 36px; right: 36px; max-width: 560px; }
.slide.split .pane .body h3 { font-size: 30px; color: #fff; line-height: 1.05; }
.slide.split .pane .body h3 .red { color: var(--red); }
.slide.split .pane .body p { color: var(--soft); font-size: 14px; line-height: 1.5; margin-top: 10px; }
.slide.split .pane .image-slot {
  width: 100%; max-width: 580px; aspect-ratio: 4/3;
  background: var(--bg);
  border: 1px solid var(--hair);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.slide.split .pane .image-slot img { width: 100%; height: 100%; object-fit: cover; }
.slide.split .pane .image-slot .slot-lbl {
  font-family: Anton; font-size: 14px; letter-spacing: 0.3em; color: var(--softer); text-transform: uppercase;
}
.slide.split .divider {
  position: absolute; top: 0; bottom: 0; left: 50%; width: 2px;
  background: var(--red);
  transform: translateX(-50%);
  z-index: 2;
}
.slide.split .divider::before, .slide.split .divider::after {
  content: ""; position: absolute; left: 50%; width: 12px; height: 12px; background: var(--red);
  transform: translateX(-50%);
}
.slide.split .divider::before { top: 0; }
.slide.split .divider::after { bottom: 0; }

/* =====================================================================
   15 PROCESS TIMELINE
   ===================================================================== */
.slide.process { justify-content: center; }
.slide.process .timeline {
  position: relative;
  display: grid; grid-template-columns: repeat(5, 1fr);
  gap: 24px;
  max-width: 1500px;
  padding-top: 80px;
}
.slide.process .timeline.cols-7 {
  grid-template-columns: repeat(7, 1fr);
  gap: 16px;
  max-width: 1600px;
}
.slide.process .timeline::before {
  content: ""; position: absolute; top: 32px; left: 6%; right: 6%;
  height: 2px; background: linear-gradient(90deg, var(--red), var(--red) 85%, var(--hair));
}
.slide.process .step { position: relative; }
.slide.process .step .dot {
  width: 18px; height: 18px; background: var(--red); border-radius: 50%;
  position: absolute; top: -57px; left: 50%; transform: translateX(-50%);
  box-shadow: 0 0 0 6px var(--bg);
}
.slide.process .step .dot::after {
  content: ""; position: absolute; inset: 4px;
  border: 2px solid var(--bg); border-radius: 50%;
}
.slide.process .step .num {
  font-family: Anton; font-size: 26px; color: var(--red); letter-spacing: 0.08em;
  text-align: center; margin-bottom: 12px;
}
.slide.process .step .when {
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--softer);
  font-weight: 600; text-align: center; margin-bottom: 12px;
  min-height: 26px;
  display: flex; align-items: center; justify-content: center;
}
.slide.process .step h3 {
  font-family: "Anton", Impact, sans-serif;
  font-size: 19px; line-height: 1.12; color: #fff;
  text-align: center; letter-spacing: 0.01em;
  text-wrap: balance;
}
.slide.process .step h3 .red { color: var(--red); }

/* =====================================================================
   16 TIPPS · 3-column
   ===================================================================== */
.slide.tipps { justify-content: center; }
.slide.tipps .grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;
  max-width: 1500px;
}
.slide.tipps .tip {
  display: flex; flex-direction: column; gap: 18px;
  padding: 32px 24px;
  background: var(--card);
  border: 1px solid var(--hair);
  transition: border-color 0.3s, transform 0.3s;
}
.slide.tipps .tip:hover { border-color: var(--red); transform: translateY(-4px); }
.slide.tipps .tip .num {
  font-family: Anton; font-size: 14px; letter-spacing: 0.22em; color: var(--red);
}
.slide.tipps .tip .icon { width: 56px; height: 56px; }
/* Fragen variant — big red question mark instead of icon */
.slide.fragen .tip .qmark {
  font-family: "Anton", Impact, sans-serif;
  font-size: 64px; line-height: 0.8; color: var(--red);
  height: 56px; display: flex; align-items: center;
}
.slide.tipps .tip h3 {
  font-size: 26px; line-height: 1.05; color: #fff;
}
.slide.tipps .tip h3 .red { color: var(--red); }
.slide.tipps .tip p {
  font-size: 14px; color: var(--soft); line-height: 1.5;
}

/* ---- Flip cards (Fragen + Tipps) ---- */
.slide.tipps .flip-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;
  max-width: 1500px;
}
.slide.tipps .flip-card {
  position: relative;
  height: 360px;
  padding: 0; margin: 0; border: 0; background: transparent;
  font: inherit; text-align: left; cursor: pointer;
  perspective: 1400px;
  -webkit-tap-highlight-color: transparent;
}
.slide.tipps .flip-inner {
  position: relative; width: 100%; height: 100%;
  transition: transform 0.65s cubic-bezier(0.4, 0.1, 0.2, 1);
  transform-style: preserve-3d;
}
.slide.tipps .flip-card.flipped .flip-inner { transform: rotateY(180deg); }
.slide.tipps .flip-face {
  position: absolute; inset: 0;
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
  display: flex; flex-direction: column;
  padding: 36px 28px;
  background: var(--card);
  border: 1px solid var(--hair);
  transition: border-color 0.3s;
}
.slide.tipps .flip-card:hover .flip-face { border-color: var(--red); }
.slide.tipps .flip-front {
  align-items: center; justify-content: center; gap: 22px; text-align: center;
}
.slide.tipps .flip-front .num {
  position: absolute; top: 28px; left: 28px;
  font-family: Anton; font-size: 14px; letter-spacing: 0.22em; color: var(--red);
}
.slide.tipps .flip-front .icon { width: 72px; height: 72px; }
.slide.tipps .flip-front .qmark {
  font-family: "Anton", Impact, sans-serif;
  font-size: 110px; line-height: 0.8; color: var(--red);
}
.slide.tipps .flip-front .flip-hint {
  position: absolute; bottom: 28px; left: 0; right: 0;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--softer); font-weight: 600;
}
.slide.tipps .flip-front .flip-hint .ar {
  font-size: 15px; color: var(--red);
}
.slide.tipps .flip-card:hover .flip-hint { color: var(--soft); }
.slide.tipps .flip-back {
  transform: rotateY(180deg);
  justify-content: center; gap: 16px;
}
.slide.tipps .flip-back .num {
  font-family: Anton; font-size: 14px; letter-spacing: 0.22em; color: var(--red);
  margin-bottom: 4px;
}
.slide.tipps .flip-back h3 {
  font-size: 28px; line-height: 1.05; color: #fff;
}
.slide.tipps .flip-back h3 .red { color: var(--red); }
.slide.tipps .flip-back p {
  font-size: 14.5px; color: var(--soft); line-height: 1.55;
}

/* =====================================================================
   17 OPTIONEN / PAKETE
   ===================================================================== */
.slide.optionen { justify-content: center; }
.slide.optionen .slide-title .title-ico {
  display: inline-block;
  width: 0.82em; height: 0.82em;
  background: var(--red);
  -webkit-mask: url("/pitch/33371e7b-b495-4d4a-9bcc-bfa6895fa683.svg") center/contain no-repeat;
  mask: url("/pitch/33371e7b-b495-4d4a-9bcc-bfa6895fa683.svg") center/contain no-repeat;
  margin-left: 0.06em;
  vertical-align: -0.02em;
}
.slide.optionen .grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
  max-width: 1500px;
}
.slide.optionen .opt {
  display: flex; flex-direction: column; gap: 20px;
  padding: 48px 36px;
  background: var(--card);
  border: 1px solid var(--hair);
  position: relative;
  transition: border-color 0.3s ease, background 0.3s ease, transform 0.3s ease;
}
.slide.optionen .opt:hover {
  border-color: var(--red);
  background: rgba(255,25,0,0.05);
  transform: translateY(-6px);
}
/* dim siblings when one is hovered, to spotlight the active package */
.slide.optionen .grid:hover .opt { opacity: 0.45; transition: opacity 0.3s ease; }
.slide.optionen .grid:hover .opt:hover { opacity: 1; }
.slide.optionen .opt .pkg-name {
  font-family: Anton; font-size: 14px; letter-spacing: 0.22em; color: var(--red);
}
.slide.optionen .opt h3 { font-size: 40px; line-height: 1.02; color: #fff; }
.slide.optionen .opt .icon-large {
  width: 64px; height: 64px; margin-bottom: 4px;
  transition: transform 0.3s ease;
}
.slide.optionen .opt:hover .icon-large { transform: scale(1.08) rotate(-4deg); }
.slide.optionen .opt .desc { font-size: 15px; color: var(--soft); line-height: 1.6; }


/* =====================================================================
   18 FULL-BLEED VIDEO STATEMENT
   ===================================================================== */
.slide.fullbleed { padding: 0; }
.slide.fullbleed .bg-media { position: absolute; inset: 0; overflow: hidden; }
.slide.fullbleed .bg-media iframe,
.slide.fullbleed .bg-media video {
  width: 100%; height: 100%; border: 0; object-fit: cover;
}
.slide.fullbleed .bg-media .placeholder {
  width: 100%; height: 100%;
  background: var(--black);
}
.slide.fullbleed .fb-overlay {
  position: relative; z-index: 2;
  min-height: 100vh; min-height: 100svh;
  display: flex; align-items: center; justify-content: center;
  padding: 110px 8vw;
  text-align: center;
}
body.mode-slides .slide.fullbleed .fb-overlay { min-height: 0; height: 100vh; height: 100svh; }
.slide.fullbleed h2 {
  font-size: clamp(80px, 12vw, 240px); line-height: 0.88; color: #fff; max-width: 1500px;
}
.slide.fullbleed h2 .red { color: var(--red); }
.slide.fullbleed .signature {
  position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
  font-size: 10px; letter-spacing: 0.34em; text-transform: uppercase; color: var(--softer); font-weight: 600;
}
.slide.fullbleed .signature .red { color: var(--red); }

/* =====================================================================
   19 OUTRO
   ===================================================================== */
.slide.outro { justify-content: center; align-items: center; text-align: center; }
.slide.outro .icon { width: 100px; height: 100px; margin-bottom: 36px; }
.slide.outro h2 { font-size: clamp(120px, 20vw, 340px); line-height: 0.85; color: #fff; }
.slide.outro h2 .red { color: var(--red); }
.slide.outro .contact {
  margin-top: 56px; display: flex; gap: 40px; flex-wrap: wrap; justify-content: center;
}
.slide.outro .contact a {
  color: #fff; font-size: 14px; letter-spacing: 0.08em;
  border-bottom: 1px solid var(--red); padding-bottom: 6px;
  transition: color 0.2s, border-color 0.2s;
}
.slide.outro .contact a:hover { color: var(--red); }
.slide.outro .sig {
  position: absolute;
  bottom: calc(var(--footer-h) + 24px);
  left: 50%; transform: translateX(-50%);
  font-family: Anton; font-size: 14px; letter-spacing: 0.24em; color: var(--softer);
  white-space: nowrap;
}
.slide.outro .sig .red { color: var(--red); }

/* =====================================================================
   05 UNNÜTZES WISSEN · Origin Story · 3 columns
   ===================================================================== */
.slide.uw { padding: 110px 6vw 90px; justify-content: flex-start; }
.slide.uw .uw-head { max-width: 1500px; margin: 0 0 56px; }
.slide.uw .uw-head .eyebrow { margin-bottom: 22px; }
.slide.uw .slide-title { line-height: 0.92; display: inline-flex; align-items: center; gap: 0.06em; }
.slide.uw .slide-title .title-ico {
  display: inline-block;
  width: 0.82em; height: 0.82em;
  background: var(--red);
  -webkit-mask: url("/pitch/ae3c7022-b02c-40e9-88d4-87cdce74158b.svg") center/contain no-repeat;
  mask: url("/pitch/ae3c7022-b02c-40e9-88d4-87cdce74158b.svg") center/contain no-repeat;
  transform: translateY(-0.04em);
}

/* Books tile — three covers fanned out, vertically centered */
.slide.uw .uw-img-books { padding: 28px; }
.slide.uw .uw-img-books .book {
  position: absolute;
  width: 36%; height: auto;
  top: 50%; left: 50%;
  box-shadow: 0 22px 50px -16px rgba(0,0,0,0.7), 0 4px 12px -3px rgba(0,0,0,0.5);
  transition: transform .35s cubic-bezier(.22,.85,.22,1);
}
.slide.uw .uw-img-books .b1 { transform: translate(-110%, -50%) rotate(-7deg); }
.slide.uw .uw-img-books .b2 { transform: translate(-50%, -50%)  rotate(2deg);   z-index: 2; }
.slide.uw .uw-img-books .b3 { transform: translate(10%, -50%)   rotate(6deg); }
.slide.uw .uw-img-books:hover .b1 { transform: translate(-115%, -54%) rotate(-10deg); }
.slide.uw .uw-img-books:hover .b2 { transform: translate(-50%, -55%)  rotate(2deg); }
.slide.uw .uw-img-books:hover .b3 { transform: translate(15%, -54%)   rotate(10deg); }
/* Photo tile — full image, no crop (object-fit: contain) */
.slide.uw .uw-img-photo { background: #000; }
.slide.uw .uw-img-photo img {
  width: 100%; height: 100%; object-fit: contain; display: block;
}

.slide.uw .uw-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 56px 48px;
  max-width: 1500px;
  width: 100%;
  margin: 0 auto;
}
.slide.uw .uw-col {
  display: flex; flex-direction: column; gap: 24px;
  margin: 0; min-width: 0;
}
.slide.uw .uw-img {
  aspect-ratio: 1 / 1;
  background: var(--card-2);
  border: 1px solid var(--hair);
  overflow: hidden;
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
/* Logo tile — contain with padding */
.slide.uw .uw-img-logo { padding: 36px; background: #fff; }
.slide.uw .uw-img-logo img {
  max-width: 100%; max-height: 100%; object-fit: contain; display: block;
}
/* Photo tile — full bleed */

.slide.uw figcaption { display: flex; flex-direction: column; gap: 6px; }
.slide.uw .uw-h {
  font-family: "Anton", Impact, sans-serif;
  font-weight: 400;
  font-size: clamp(28px, 2.6vw, 40px);
  line-height: 1; letter-spacing: 0.01em;
  color: #fff;
  text-transform: uppercase;
}
.slide.uw .uw-p {
  font-size: 14px; line-height: 1.45; color: var(--soft);
  letter-spacing: 0.01em;
}

@media (max-width: 1100px) {
  .slide.uw .uw-cols { grid-template-columns: 1fr; gap: 40px; }
}

.slide.pulppattern {
  padding: 0;
  background: var(--black);
  align-items: stretch;
  justify-content: center;
}
.slide.pulppattern .pulp-grid {
  position: absolute; inset: -8% -4%;
  display: grid;
  grid-template-columns: repeat(var(--cols, 5), 1fr);
  gap: 4% 5%;
  align-content: start;
  pointer-events: none;
  animation: pulpDrift 36s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes pulpDrift {
  0%   { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(-3%, -2%) rotate(0.6deg); }
}
.slide.pulppattern .pulp-tile {
  position: relative;
  aspect-ratio: 430 / 100;
  width: 100%;
  transform: rotate(var(--r, 0deg));
  transition: transform 0.6s ease;
}
.slide.pulppattern .pulp-tile svg {
  width: 100%; height: 100%; display: block;
}
.slide.pulppattern .pulp-tile svg path { fill: #ffffff; transition: fill 0.7s ease; }
.slide.pulppattern .pulp-tile.red svg path { fill: var(--red); }
.slide.pulppattern .pulp-tile .ac {
  position: absolute;
  width: 7%;
  aspect-ratio: 1;
  background-color: var(--black);
  -webkit-mask-image: var(--ico);
  mask-image: var(--ico);
  -webkit-mask-size: contain; mask-size: contain;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center; mask-position: center;
}
.slide.pulppattern .pp-overlay {
  position: relative; z-index: 3;
  display: flex; align-items: center; justify-content: center;
  width: 100%;
  min-height: 100vh; min-height: 100svh;
  padding: 110px 8vw;
}
body.mode-slides .slide.pulppattern .pp-overlay { min-height: 0; height: 100vh; height: 100svh; }
.slide.pulppattern h2 {
  font-family: "Anton", Impact, sans-serif;
  font-weight: 400; text-transform: uppercase;
  font-size: clamp(56px, 8vw, 144px); line-height: 0.9;
  color: #fff;
  background: var(--black);
  padding: 22px 38px 18px;
  display: inline-block;
  box-shadow: 0 0 0 6px var(--black);
  text-align: center;
}
.slide.pulppattern h2 .red { color: var(--red); }
.slide.pulppattern .pp-signature {
  position: absolute; bottom: 40px; left: 0; right: 0; z-index: 4;
  text-align: center;
  font-size: 10px; letter-spacing: 0.34em; text-transform: uppercase; color: #fff; font-weight: 600;
  mix-blend-mode: difference;
}
.slide.pulppattern .pp-signature .red { color: var(--red); }

@media (max-width: 1100px) {
  .slide.numbers .grid { grid-template-columns: 1fr; }
  .slide.numbers .num-item { border-left: 0; border-top: 1px solid var(--hair); padding: 32px 0; }
  .slide.numbers .num-item:first-child { border-top: 0; }
  .slide.love-brands .grid { grid-template-columns: repeat(3, 1fr); }
  .slide.saeulen .pillars { flex-direction: column; min-height: 0; }
  .slide.saeulen .pillar { border-left: 0; border-top: 1px solid var(--hair); min-height: auto; padding: 28px 24px; }
  .slide.saeulen .pillar p { max-height: 200px; opacity: 1; }
  .slide.saeulen .pillars:hover .pillar { flex: 1; }
  .slide.saeulen .pillars:hover .pillar:hover { flex: 1; }
  .slide.leistungen .it p { max-height: 200px; opacity: 1; }
  .slide.leistungen .grid { grid-template-columns: 1fr 1fr; }
  .slide.origin .acts { grid-template-columns: 1fr; }
  .slide.process .timeline { grid-template-columns: 1fr; gap: 32px; padding-top: 0; }
  .slide.process .timeline::before { display: none; }
  .slide.process .step .dot { display: none; }
  .slide.tipps .grid { grid-template-columns: 1fr; }
  .slide.optionen .grid { grid-template-columns: 1fr; }
  .slide.heute .layout { grid-template-columns: 1fr; gap: 40px; }
  .slide.social-case .layout { grid-template-columns: 1fr; gap: 40px; }
  .slide.split .split-layout { grid-template-columns: 1fr; }
  .slide.split .pane.after { border-left: 0; border-top: 1px solid var(--hair); }
  .slide.split .divider { display: none; }
  .slide.monitor .bm-stats { grid-template-columns: repeat(2, 1fr); }
  .slide.monitor .bm-stats .st:nth-child(2) { border-right: 0; }
  .slide.monitor .bm-compare .row { grid-template-columns: 140px 1fr 56px; gap: 12px; }
  .slide.monitor .bm-foot { flex-direction: column; gap: 16px; align-items: flex-start; }
}
@media (max-width: 640px) {
  section.slide { padding: 100px 22px 70px; }
  header.bar { padding: 14px 18px; grid-template-columns: auto 1fr auto; }
  header.bar .center { display: none; }
  .pager { padding: 12px 18px; }
  .slide.team .all-pulpies { grid-template-columns: 1fr 1fr; }
  .slide.leistungen .grid { grid-template-columns: 1fr; }
  .slide.love-brands .grid { grid-template-columns: 1fr; }
  .slide.monitor .board { grid-template-columns: 1fr; }
  .slide.monitor .cell.span-3, .slide.monitor .cell.span-4, .slide.monitor .cell.span-6 { grid-column: span 1; }
  .slide.monitor .bm-stats { grid-template-columns: 1fr 1fr; }
}
`
