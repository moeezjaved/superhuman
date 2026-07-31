'use client';

import { useState } from 'react';

export default function Landing() {
  const [approved, setApproved] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  function toggleTheme() {
    const el = document.documentElement;
    const cur = el.getAttribute('data-theme');
    const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
    el.setAttribute('data-theme', dark ? 'light' : 'dark');
  }

  return (
    <div className="lp">
      <style>{CSS}</style>

      <nav className="lp-nav">
        <div className="lp-in">
          <div className="lp-brand"><span className="lp-glyph" /><b>HiUnicorn</b></div>
          <div className="lp-links">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="/login">Sign in</a>
            <button className="lp-toggle" onClick={toggleTheme} aria-label="Toggle theme">◐</button>
            <a href="/login" className="lp-btn ink sm">Start free</a>
          </div>
        </div>
      </nav>

      <header className="lp-wrap">
        <div className="lp-hero">
          <div>
            <div className="lp-eyebrow">Your AI team, for small business</div>
            <h1 className="lp-h1">Your business,<br /><em>running.</em></h1>
            <p className="lp-sub">HiUnicorn learns how your business works, then quietly does the busywork for you — and always asks before anything that matters.</p>
            <div className="lp-cta">
              <a href="/login" className="lp-btn ink lg">Start free</a>
              <a href="#how" className="lp-btn ghost lg">See how it works</a>
            </div>
            <p className="lp-note">No card needed · connect one app · see your first week of work in 3 minutes</p>
          </div>

          <div className="lp-demo" aria-label="A morning update you can try">
            <div className="lp-demobar"><span className="lp-glyph sm" /><span className="lp-dt">This morning, while you were away</span></div>
            <div className="lp-demobody">
              <div className={`lp-lbl ${approved || dismissed ? 'calm' : ''}`}><span>Needs you</span>{!(approved || dismissed) && <span className="lp-n">1</span>}<span className="lp-g" /></div>
              {!(approved || dismissed) ? (
                <div className="lp-appr">
                  <div className="h">Send a $214.00 refund to Jordan Chen?</div>
                  <div className="m">order #2287 · bought 41 days ago · “arrived damaged”</div>
                  <div className="f">This is past your 30-day rule, so I stopped to ask.</div>
                  <div className="act">
                    <button className="lp-mini ink" onClick={() => setApproved(true)}>Yes, refund</button>
                    <button className="lp-mini ghost" onClick={() => setDismissed(true)}>Not now</button>
                  </div>
                </div>
              ) : (
                <p className="lp-cleared"><span>✓</span> {approved ? 'Done. I sent the refund and replied to Jordan.' : 'Okay — I’ll leave it for you.'}</p>
              )}

              <div className="lp-lbl calm" style={{ marginTop: 16 }}><span>Already done today</span><span className="lp-g" /></div>
              <div className="lp-led">
                {approved && <div className="lp-r"><span className="t">10:42</span><span className="k">✓</span><span className="b">Refunded <span className="num">$214.00</span> — J. Chen <span className="dim">(you approved)</span></span></div>}
                <div className="lp-r"><span className="t">09:02</span><span className="k">✓</span><span className="b">Refunded <span className="num">$42.10</span> — J. Meyer <span className="dim">(within your rules)</span></span></div>
                <div className="lp-r"><span className="t">09:15</span><span className="k">✓</span><span className="b">Answered <span className="num">6</span> “where’s my order?” notes</span></div>
                <div className="lp-r"><span className="t">09:48</span><span className="k">✓</span><span className="b">Chased <span className="num">2</span> unpaid invoices <span className="dim">— $1,340</span></span></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="how" className="lp-sec"><div className="lp-col">
        <h2 className="lp-kick">Connect one app. It takes it from there.</h2>
        <p className="lp-lead">You don’t set anything up or learn any tools. HiUnicorn reads how your business already runs, finds the work that repeats, and starts handling it — checking with you before anything it can’t take back.</p>
      </div>
      <div className="lp-col lp-loop">
        <div className="lp-step"><span className="no">1</span><h3>It learns</h3><p>Reads your website, inbox and tools to understand how you work.</p></div>
        <div className="lp-step"><span className="no">2</span><h3>It spots</h3><p>Finds the repeat work eating your week — and shows you the time it costs.</p></div>
        <div className="lp-step"><span className="no">3</span><h3>It handles</h3><p>Does the safe parts itself. Pauses for your yes on anything that matters.</p></div>
        <div className="lp-step"><span className="no">4</span><h3>It reports</h3><p>One calm update a day. Every line comes with proof of what it did.</p></div>
      </div></section>

      <section className="lp-sec"><div className="lp-col">
        <h2 className="lp-kick">It works with the tools you already use.</h2>
        <p className="lp-lead">Always inside limits you set — it never sends or spends without asking first.</p>
        <div className="lp-chips">
          {['Gmail', 'Slack', 'Shopify', 'Stripe', 'WhatsApp', 'HubSpot', 'Google Calendar', 'Notion', 'Dropbox'].map((c) => <span className="lp-chip" key={c}>{c}</span>)}
          <span className="lp-chip more">+ hundreds more</span>
        </div>
      </div></section>

      <section id="pricing" className="lp-sec"><div className="lp-col">
        <h2 className="lp-kick">One price. A whole team.</h2>
        <p className="lp-lead">Every plan gives you a specialist for each part of your business — not one tool, a whole staff. Try any plan free for 14 days.</p>
      </div>
      <div className="lp-col lp-tiers">
        <div className="lp-tier">
          <div className="nm">Starter</div><div className="pr">$999 <span>/ mo</span></div>
          <p className="prn">Everything a small team needs to feel the difference right away.</p>
          <ul><li>5 people on your team</li><li>A specialist for every part of your business</li><li>Everyday usage included</li><li>Connect any app</li><li>24/7 help</li></ul>
          <a href="/login" className="lp-btn ghost">Start free trial</a>
        </div>
        <div className="lp-tier mark">
          <div className="nm">Team</div><div className="pr">$2,499 <span>/ mo</span></div>
          <p className="prn">For growing teams who want even more from their AI.</p>
          <ul><li>10 people on your team</li><li>5× the usage</li><li>Share teammates across your company</li><li>Connect any app</li><li>Private 24/7 support</li></ul>
          <a href="/login" className="lp-btn ink">Start free trial</a>
        </div>
        <div className="lp-tier">
          <div className="nm">Enterprise</div><div className="pr">Contact sales</div>
          <p className="prn">Built around your size, your data, and your security.</p>
          <ul><li>Unlimited people</li><li>Custom-built specialists</li><li>Company sign-in (SSO)</li><li>Security reviews (SOC 2, HIPAA, PCI)</li><li>Choose where your data lives</li></ul>
          <a href="/login" className="lp-btn ghost">Contact sales</a>
        </div>
      </div>
      <p className="lp-col" style={{ marginTop: 18, fontSize: 13, color: 'var(--faint)', textAlign: 'center' }}>Switch to annual billing and save 17%.</p></section>

      <div className="lp-wrap lp-final"><div className="lp-col">
        <h2 className="lp-fh">Give yourself your evenings back.</h2>
        <p className="lp-sub center">Connect one app and see your first week of work — found, costed, and ready to hand off — in three minutes.</p>
        <div className="lp-cta center"><a href="/login" className="lp-btn ink lg">Start free</a></div>
      </div></div>

      <footer className="lp-foot">
        <div className="lp-in">
          <span>HiUnicorn — your business, running.</span>
          <span style={{ display: 'flex', gap: 18 }}><a href="#">Security</a><a href="#">Privacy</a><a href="#">Contact</a></span>
        </div>
      </footer>
    </div>
  );
}

const CSS = `
.lp{--m:720px;--w:1080px}
.lp a{color:var(--ink)}
.lp-nav{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--paper) 84%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--hairline)}
.lp-in{max-width:var(--w);margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between}
.lp-brand{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:14px;font-weight:600}
.lp-glyph{width:18px;height:18px;border-radius:6px;position:relative;background:conic-gradient(from 200deg,var(--iris-a),var(--iris-b) 40%,var(--iris-c) 72%,var(--iris-a));box-shadow:inset 0 0 0 1px var(--hairline-strong)}
.lp-glyph.sm{width:11px;height:11px;border-radius:4px}
.lp-glyph::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 32% 26%,#fff9 0 22%,transparent 40%)}
.lp-links{display:flex;align-items:center;gap:22px}
.lp-links a{color:var(--graphite);font-size:14px}.lp-links a:hover{color:var(--ink)}
.lp-toggle{border:1px solid var(--hairline-strong);background:transparent;color:var(--graphite);width:32px;height:32px;border-radius:8px;cursor:pointer}
.lp-btn{font-family:var(--ui);font-weight:500;font-size:14px;height:38px;padding:0 18px;border-radius:8px;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:8px;transition:transform .12s var(--ease),background .12s var(--ease),border-color .12s var(--ease)}
.lp-btn:active{transform:scale(.98)}
.lp-btn.ink{background:var(--ink);color:var(--paper)}.lp-btn.ink:hover{background:color-mix(in srgb,var(--ink) 84%,var(--graphite))}
.lp-btn.ghost{border-color:var(--hairline-strong);color:var(--ink)}.lp-btn.ghost:hover{border-color:var(--graphite)}
.lp-btn.lg{height:46px;padding:0 24px;font-size:15px}.lp-btn.sm{height:34px}
.lp-wrap{max-width:var(--w);margin:0 auto;padding:0 24px}
.lp-col{max-width:var(--m);margin:0 auto}
.lp-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;padding:64px 0 52px}
.lp-eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:20px}
.lp-h1{font-family:var(--voice);font-weight:400;letter-spacing:-.015em;font-size:clamp(40px,7vw,66px);line-height:1.03;text-wrap:balance}
.lp-h1 em{font-style:italic;color:var(--ember)}
.lp-sub{font-family:var(--voice);font-size:clamp(18px,2.3vw,22px);color:var(--graphite);max-width:32ch;margin:20px 0 28px;line-height:1.45}
.lp-sub.center{margin-left:auto;margin-right:auto;text-align:center}
.lp-cta{display:flex;gap:12px;flex-wrap:wrap}.lp-cta.center{justify-content:center}
.lp-note{font-size:13px;color:var(--faint);margin-top:14px}
.lp-demo{border:1px solid var(--hairline-strong);border-radius:14px;background:var(--raise);box-shadow:0 1px 0 var(--hairline),0 24px 60px -40px color-mix(in srgb,#000 60%,transparent);overflow:hidden}
.lp-demobar{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--hairline)}
.lp-dt{font-family:var(--voice);font-style:italic;font-size:13px;color:var(--faint)}
.lp-demobody{padding:16px 18px 18px}
.lp-lbl{display:flex;align-items:center;gap:8px;font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin:2px 0 10px}
.lp-n{font-family:var(--mono);font-weight:500;letter-spacing:0;color:var(--paper);background:var(--ember);border-radius:20px;padding:0 6px;font-size:9.5px}
.lp-g{flex:1;height:1px;background:var(--hairline)}
.lp-appr{border:1px solid var(--ember-line);background:var(--ember-wash);border-radius:10px;padding:14px;position:relative;overflow:hidden}
.lp-appr::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--ember)}
.lp-appr .h{font-family:var(--voice);font-size:16px;padding-left:6px}
.lp-appr .m{font-family:var(--mono);font-size:11.5px;color:var(--graphite);margin-top:5px;padding-left:6px}
.lp-appr .f{font-size:11px;color:var(--ember);margin-top:3px;padding-left:6px}
.lp-appr .act{display:flex;gap:7px;margin-top:12px;padding-left:6px}
.lp-mini{font-size:12px;font-weight:500;height:31px;padding:0 12px;border-radius:6px;cursor:pointer;border:1px solid transparent}
.lp-mini.ink{background:var(--ink);color:var(--paper)}.lp-mini.ghost{border-color:var(--hairline-strong);color:var(--graphite);background:transparent}
.lp-cleared{font-family:var(--voice);font-style:italic;font-size:14px;color:var(--sage);display:flex;align-items:center;gap:8px;animation:fade .3s var(--ease)}
.lp-cleared span{font-family:var(--mono)}
.lp-led{display:flex;flex-direction:column;margin-top:14px}
.lp-r{display:grid;grid-template-columns:44px 12px 1fr;gap:9px;align-items:baseline;font-family:var(--mono);font-size:12px;line-height:1.6;padding:5px 0;border-bottom:1px solid var(--hairline);animation:print .2s var(--ease) both}
.lp-r .t{color:var(--faint);font-variant-numeric:tabular-nums}.lp-r .k{color:var(--sage)}.lp-r .b{color:var(--ink)}
.lp-r .b .num{font-variant-numeric:tabular-nums}.lp-r .b .dim{color:var(--graphite)}
.lp-sec{padding:60px 0;border-top:1px solid var(--hairline)}
.lp-kick{font-family:var(--voice);font-weight:400;font-size:clamp(27px,4vw,36px);letter-spacing:-.01em;line-height:1.14;text-wrap:balance}
.lp-lead{font-size:16px;color:var(--graphite);max-width:56ch;margin-top:14px;line-height:1.6}
.lp-loop{display:grid;grid-template-columns:repeat(4,1fr);gap:26px;margin-top:38px}
.lp-step .no{font-family:var(--mono);font-size:12px;color:var(--ember);border-bottom:1px solid var(--ember-line);padding-bottom:8px;margin-bottom:12px;display:inline-block}
.lp-step h3{font-family:var(--voice);font-weight:400;font-size:20px;margin-bottom:6px}
.lp-step p{font-size:13.5px;color:var(--graphite);line-height:1.55}
.lp-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.lp-chip{font-family:var(--mono);font-size:12.5px;color:var(--graphite);border:1px solid var(--hairline-strong);border-radius:7px;padding:6px 12px;background:var(--raise)}
.lp-chip.more{color:var(--faint);border-style:dashed}
.lp-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:36px}
.lp-tier{border:1px solid var(--hairline-strong);border-radius:14px;padding:24px;background:var(--raise);display:flex;flex-direction:column;gap:14px}
.lp-tier.mark{border-color:var(--ember-line);box-shadow:0 0 0 1px var(--ember-line)}
.lp-tier .nm{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--graphite)}
.lp-tier .pr{font-family:var(--voice);font-size:34px;line-height:1;font-variant-numeric:tabular-nums}
.lp-tier .pr span{font-size:15px;color:var(--faint);font-style:italic}
.lp-tier .prn{font-size:13px;color:var(--graphite);line-height:1.5;margin:-4px 0 2px}
.lp-tier ul{list-style:none;display:flex;flex-direction:column;gap:9px;font-size:13.5px;color:var(--graphite);padding:0;margin:0}
.lp-tier li{display:flex;gap:9px}.lp-tier li::before{content:"✓";color:var(--sage);font-family:var(--mono);font-size:12px}
.lp-tier .lp-btn{justify-content:center;margin-top:auto}
.lp-final{text-align:center;padding:80px 24px}
.lp-fh{font-family:var(--voice);font-weight:400;font-size:clamp(30px,5vw,46px);letter-spacing:-.01em;text-wrap:balance}
.lp-foot{border-top:1px solid var(--hairline);padding:32px 0}
.lp-foot .lp-in{font-family:var(--mono);font-size:11.5px;color:var(--faint);height:auto}
.lp-foot a{color:var(--graphite)}.lp-foot a:hover{color:var(--ink)}
@media (max-width:860px){.lp-hero{grid-template-columns:1fr;gap:40px}}
@media (max-width:720px){.lp-loop,.lp-tiers{grid-template-columns:1fr}}
`;
