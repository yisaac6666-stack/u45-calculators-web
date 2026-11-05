/* U-45 v1.4 — exact unit factors (SI / NIST SP 811 / BIPM) and the currency rate store.
 * Units: every linear unit is stored as "how many SI base units in one of this unit".
 * Temperature and fuel economy are non-linear and handled by special converters. */
(function (G) {
  'use strict';
  const PI = Math.PI;
  const L = (o) => o; // readability marker
  const UNITS = {
    length: L({ base: 'm', u: { m: 1, km: 1e3, cm: 1e-2, mm: 1e-3, 'µm': 1e-6, nm: 1e-9, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852, mil: 2.54e-5, fathom: 1.8288, chain: 20.1168, furlong: 201.168, hand: 0.1016, au: 149597870700, ly: 9460730472580800, pc: 3.0856775814913673e16 } }),
    mass: L({ base: 'kg', u: { kg: 1, g: 1e-3, mg: 1e-6, 'µg': 1e-9, t: 1e3, lb: 0.45359237, oz: 0.028349523125, st: 6.35029318, 'short ton': 907.18474, 'long ton': 1016.0469088, ct: 2e-4, gr: 6.479891e-5, 'troy oz': 0.0311034768, slug: 14.593902937206364, Da: 1.66053906660e-27 } }),
    temperature: L({ base: 'K', special: 'temp', u: { '°C': 1, '°F': 1, K: 1, '°R': 1, '°Ré': 1 } }),
    area: L({ base: 'm²', u: { 'm²': 1, 'km²': 1e6, 'cm²': 1e-4, 'mm²': 1e-6, ha: 1e4, are: 100, 'in²': 6.4516e-4, 'ft²': 0.09290304, 'yd²': 0.83612736, acre: 4046.8564224, 'mi²': 2589988.110336 } }),
    volume: L({ base: 'm³', u: { 'm³': 1, L: 1e-3, mL: 1e-6, 'cm³': 1e-6, 'km³': 1e9, 'US gal': 3.785411784e-3, 'US qt': 9.46352946e-4, 'US pt': 4.73176473e-4, 'US cup': 2.365882365e-4, 'US fl oz': 2.95735295625e-5, tbsp: 1.478676478125e-5, tsp: 4.92892159375e-6, 'imp gal': 4.54609e-3, 'imp pt': 5.6826125e-4, 'imp fl oz': 2.84130625e-5, 'in³': 1.6387064e-5, 'ft³': 0.028316846592, 'yd³': 0.764554857984, 'bbl (oil)': 0.158987294928 } }),
    speed: L({ base: 'm/s', u: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knot: 1852 / 3600, 'ft/s': 0.3048, 'c (light)': 299792458, 'Mach (ISA SL 340.294 m/s)': 340.294 } }),
    pressure: L({ base: 'Pa', u: { Pa: 1, hPa: 100, kPa: 1e3, MPa: 1e6, bar: 1e5, mbar: 100, atm: 101325, psi: 6894.757293168361, torr: 101325 / 760, mmHg: 133.322387415, inHg: 3386.389, inH2O: 249.08891, 'kgf/cm²': 98066.5 } }),
    energy: L({ base: 'J', u: { J: 1, kJ: 1e3, MJ: 1e6, Wh: 3600, kWh: 3.6e6, cal: 4.184, kcal: 4184, 'BTU (IT)': 1055.05585262, eV: 1.602176634e-19, erg: 1e-7, 'ft·lbf': 1.3558179483314004, therm: 105505585.262, toe: 4.1868e10 } }),
    power: L({ base: 'W', u: { W: 1, mW: 1e-3, kW: 1e3, MW: 1e6, 'hp (mech)': 745.6998715822702, 'PS (metric hp)': 735.49875, 'BTU/h': 0.2930710701722222, 'ft·lbf/s': 1.3558179483314004, 'kcal/h': 4184 / 3600, 'TR (refrigeration)': 3516.8528420667 } }),
    data: L({ base: 'B', u: { bit: 0.125, B: 1, kB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776, kbit: 125, Mbit: 125000, Gbit: 1.25e8 } }),
    time: L({ base: 's', u: { ns: 1e-9, 'µs': 1e-6, ms: 1e-3, s: 1, min: 60, h: 3600, day: 86400, week: 604800, fortnight: 1209600, 'month (avg)': 2629746, 'year (365.2425 d)': 31556952, 'Julian year': 31557600, decade: 315569520, century: 3155695200 } }),
    angle: L({ base: 'rad', u: { rad: 1, '°': PI / 180, grad: PI / 200, "arcmin (′)": PI / 10800, 'arcsec (″)': PI / 648000, turn: 2 * PI, 'mil (NATO)': 2 * PI / 6400 } }),
    fuel: L({ base: 'km/L', special: 'fuel', u: { 'km/L': 1, 'L/100 km': 1, 'mpg (US)': 1, 'mpg (UK)': 1, 'mi/L': 1 } }),
    force: L({ base: 'N', u: { N: 1, kN: 1e3, dyn: 1e-5, kgf: 9.80665, lbf: 4.4482216152605, pdl: 0.138254954376 } }),
    torque: L({ base: 'N·m', u: { 'N·m': 1, 'kN·m': 1e3, 'lbf·ft': 1.3558179483314004, 'lbf·in': 0.1129848290276167, 'kgf·m': 9.80665, 'ozf·in': 0.00706155181 } }),
    density: L({ base: 'kg/m³', u: { 'kg/m³': 1, 'g/cm³': 1e3, 'g/L': 1, 'kg/L': 1e3, 'lb/ft³': 16.018463373960138, 'lb/in³': 27679.904710203125, 'lb/US gal': 119.82642731689663 } }),
    flow: L({ base: 'm³/s', u: { 'm³/s': 1, 'L/s': 1e-3, 'L/min': 1 / 60000, 'm³/h': 1 / 3600, 'US gpm': 6.30901964e-5, 'imp gpm': 7.57681666667e-5, cfm: 4.719474432e-4 } }),
    frequency: L({ base: 'Hz', u: { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9, rpm: 1 / 60, 'rad/s': 1 / (2 * PI) } }),
    acceleration: L({ base: 'm/s²', u: { 'm/s²': 1, 'g₀ (standard gravity)': 9.80665, 'ft/s²': 0.3048, Gal: 0.01 } }),
    illuminance: L({ base: 'lx', u: { lx: 1, 'foot-candle': 10.763910416709722, phot: 1e4 } }),
    charge: L({ base: 'C', u: { C: 1, mAh: 3.6, Ah: 3600, 'e (elementary)': 1.602176634e-19 } }),
    current: L({ base: 'A', u: { A: 1, mA: 1e-3, 'µA': 1e-6, kA: 1e3 } }),
    voltage: L({ base: 'V', u: { V: 1, mV: 1e-3, 'µV': 1e-6, kV: 1e3, MV: 1e6 } }),
    resistance: L({ base: 'Ω', u: { 'Ω': 1, 'mΩ': 1e-3, 'kΩ': 1e3, 'MΩ': 1e6 } }),
    capacitance: L({ base: 'F', u: { F: 1, mF: 1e-3, 'µF': 1e-6, nF: 1e-9, pF: 1e-12 } }),
    inductance: L({ base: 'H', u: { H: 1, mH: 1e-3, 'µH': 1e-6, nH: 1e-9 } }),
    'magnetic flux density': L({ base: 'T', u: { T: 1, mT: 1e-3, 'µT': 1e-6, G: 1e-4 } }),
    'absorbed dose': L({ base: 'Gy', u: { Gy: 1, mGy: 1e-3, rad: 0.01 } }),
    'equivalent dose': L({ base: 'Sv', u: { Sv: 1, mSv: 1e-3, 'µSv': 1e-6, rem: 0.01 } }),
    radioactivity: L({ base: 'Bq', u: { Bq: 1, kBq: 1e3, MBq: 1e6, GBq: 1e9, Ci: 3.7e10, mCi: 3.7e7, 'µCi': 3.7e4 } }),
    'dynamic viscosity': L({ base: 'Pa·s', u: { 'Pa·s': 1, 'mPa·s (cP)': 1e-3, 'P (poise)': 0.1, 'lb/(ft·s)': 1.4881639435695537 } }),
    'kinematic viscosity': L({ base: 'm²/s', u: { 'm²/s': 1, 'mm²/s (cSt)': 1e-6, 'St (stokes)': 1e-4, 'ft²/s': 0.09290304 } }),
    typography: L({ base: 'in', u: { in: 1, pt: 1 / 72, 'px (CSS)': 1 / 96, pica: 1 / 6, mm: 1 / 25.4, cm: 1 / 2.54 } })
  };
  // temperature → kelvin and back
  const TK = { '°C': (v) => v + 273.15, '°F': (v) => (v + 459.67) * 5 / 9, K: (v) => v, '°R': (v) => v * 5 / 9, '°Ré': (v) => v * 1.25 + 273.15 };
  const FK = { '°C': (k) => k - 273.15, '°F': (k) => k * 9 / 5 - 459.67, K: (k) => k, '°R': (k) => k * 9 / 5, '°Ré': (k) => (k - 273.15) * 0.8 };
  // fuel → km/L and back (1 US gal = 3.785411784 L, 1 mi = 1.609344 km, 1 imp gal = 4.54609 L)
  const TF = { 'km/L': (v) => v, 'L/100 km': (v) => 100 / v, 'mpg (US)': (v) => v * 1.609344 / 3.785411784, 'mpg (UK)': (v) => v * 1.609344 / 4.54609, 'mi/L': (v) => v * 1.609344 };
  const FF = { 'km/L': (k) => k, 'L/100 km': (k) => 100 / k, 'mpg (US)': (k) => k * 3.785411784 / 1.609344, 'mpg (UK)': (k) => k * 4.54609 / 1.609344, 'mi/L': (k) => k / 1.609344 };
  function convert(cat, v, from, to) {
    const C = UNITS[cat]; if (!C) throw new Error('unknown category ' + cat);
    v = Number(v); if (!isFinite(v)) throw new Error('enter a number');
    if (C.special === 'temp') { const k = TK[from](v); if (k < -1e-9) throw new Error('below absolute zero'); return FK[to](k); }
    if (C.special === 'fuel') { if (v <= 0) throw new Error('must be > 0'); return FF[to](TF[from](v)); }
    if (!(from in C.u) || !(to in C.u)) throw new Error('unknown unit');
    return v * C.u[from] / C.u[to];
  }

  // ---------------- currency store ----------------
  const FXKEY = 'u45.fx.cache';
  const SRC = {
    erapi: { name: 'open.er-api.com', url: 'https://open.er-api.com/v6/latest/USD', parse: (j) => j && j.result === 'success' ? { base: 'USD', rates: j.rates, date: new Date(j.time_last_update_unix * 1000).toISOString() } : null },
    frankfurter: { name: 'frankfurter.dev (ECB)', url: 'https://api.frankfurter.dev/v1/latest?base=USD', parse: (j) => j && j.rates ? { base: 'USD', rates: Object.assign({ USD: 1 }, j.rates), date: new Date(j.date + 'T16:00:00Z').toISOString() } : null }
  };
  function bundled() { const b = G.U45_RATES_BUNDLED; return { base: b.base, rates: b.rates, date: b.date, source: b.source, fetched: null, bundled: true }; }
  function cached() { try { const c = JSON.parse(localStorage.getItem(FXKEY) || 'null'); if (c && c.rates && c.rates.USD) return c; } catch (e) { /* ignore */ } return null; }
  function rates() { const c = cached(), b = bundled(); if (!c) return b; if (new Date(c.date) < new Date(b.date)) return b; return Object.assign({}, c, { rates: Object.assign({}, b.rates, c.rates) }); }
  const names = () => (G.U45_RATES_BUNDLED || {}).names || {};
  function fx(amount, from, to, R) { R = R || rates(); const a = R.rates[from], b = R.rates[to]; if (!a || !b) throw new Error('no rate for ' + (!a ? from : to)); return Number(amount) * b / a; }
  let inflight = null;
  async function update(force, srcKey) {
    const st = (G.U45Prefs && G.U45Prefs.settings()) || {};
    if (st.offline) return { ok: false, error: 'Offline mode is on (Settings)' };
    if (!force && st.fxAuto === false) return { ok: false, error: 'auto-update is off' };
    const c = cached(); const maxAge = (st.fxHours || 12) * 3600e3;
    if (!force && c && c.fetched && Date.now() - c.fetched < maxAge) return { ok: true, cached: true, data: c };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, error: 'device is offline — using ' + (c ? 'cached' : 'bundled') + ' rates' };
    if (inflight) return inflight;
    const order = srcKey ? [srcKey] : [st.fxSource || 'erapi', 'erapi', 'frankfurter'].filter((v, i, a) => a.indexOf(v) === i);
    inflight = (async () => {
      let lastErr = '';
      for (const k of order) {
        const s = SRC[k]; if (!s) continue;
        try {
          const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const tm = setTimeout(() => ctl && ctl.abort(), 9000);
          const r = await fetch(s.url, { cache: 'no-store', signal: ctl && ctl.signal }); clearTimeout(tm);
          const d = s.parse(await r.json()); if (!d) throw new Error('bad response');
          const prev = cached(); const merged = Object.assign({}, (prev && prev.rates) || {}, d.rates);
          const out = { base: 'USD', rates: merged, date: d.date, source: s.name, fetched: Date.now() };
          localStorage.setItem(FXKEY, JSON.stringify(out)); return { ok: true, data: out };
        } catch (e) { lastErr = s.name + ': ' + (e && e.message || e); }
      }
      return { ok: false, error: lastErr || 'no source' };
    })();
    try { return await inflight; } finally { inflight = null; }
  }
  function info() { const R = rates(); const age = R.fetched ? Date.now() - R.fetched : Date.now() - new Date(R.date).getTime(); return { source: R.source, date: R.date, fetched: R.fetched, bundled: !!R.bundled, count: Object.keys(R.rates).length, ageHours: age / 3600e3 }; }
  G.U45Units = { UNITS, convert, categories: () => Object.keys(UNITS) };
  G.U45FX = { rates, fx, update, info, names, bundled, cached, SRC, KEY: FXKEY, codes: () => Object.keys(rates().rates).sort() };
})(typeof window !== 'undefined' ? window : globalThis);
