/* =========================================================
   sales-report.js  —  "Sales Report" tab

   Reads the Premium Retail management-dashboard Google Sheet
   (published CSV) and shows it inside the OMS:
     • KPI cards for any region, month-to-date or year-to-date
     • trend / achievement / brand / region-mix charts
     • auto-generated insights
     • sortable tables + every table of the sheet ("All data")
     • Excel export + print
     • auto-refresh, saved copy when offline, sheet health panel

   The sheet is read by structure, not by cell address or exact
   header (see sales-parser.js), so adding a region, a brand or
   a whole new section to the sheet needs no code change.

   Needs (already in index.html): Chart.js, XLSX (for export).
   Uses OMS helpers when present: can, requirePermission, showToast.
   ========================================================= */
(function () {
    "use strict";

    const P = window.SalesParser;

    if (!P) {
        console.error("sales-report.js needs sales-parser.js to be loaded first");
        window.showSalesTab = () => (typeof showToast === "function" ? showToast("sales-parser.js is missing", "error") : alert("sales-parser.js is missing"));
        window.hideSalesTab = window.initSalesTab = () => { };
        return;
    }

    /* ---------------------------------------------------------
       Settings
       --------------------------------------------------------- */

    const CONFIG = {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vReVRIWr9_L_zYwLLaMilrwBgyMQ4Z6TmiM9iWtuak-ibS_isbRUzrfPehbaFmUQQ/pub?output=csv",
        refreshMs: 5 * 60 * 1000,          // re-read the sheet every 5 minutes while the tab is open
        staleMs: 20 * 60 * 1000,           // "Updated ..." turns amber after this
        timeoutMs: 20 * 1000,
        permission: "viewSales",           // managers (manageUsers) can always open it
        cacheKey: "oms.sales.cache.v1",
        uiKey: "oms.sales.ui.v1"
    };

    const COLORS = {
        cur: "#38bdf8", ly: "#64748b", target: "#f59e0b",
        good: "#22c55e", warn: "#f59e0b", bad: "#ef4444",
        grid: "rgba(148,163,184,.2)", text: "#cbd5e1",
        palette: ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#f472b6"]
    };

    const state = {
        data: null,
        status: "idle",                    // idle | loading | refreshing | live | cached | stale | error
        error: null,
        updatedAt: 0,
        hash: "",
        region: null,
        period: "mtd",
        month: null,                       // null = the sheet's current month, else a trend month index (0-11)
        open: false,
        loading: false
    };

    let charts = {};
    let refreshTimer = null;
    let tickTimer = null;

    /* ---------------------------------------------------------
       Small helpers
       --------------------------------------------------------- */

    const $ = id => document.getElementById(id);

    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));

    const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
    const pretty = s => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1).toLowerCase();
    const shortMonth = s => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1, 3).toLowerCase();
    const isTotalLabel = s => P.TOTAL_RE.test(String(s || ""));

    function toast(message, type) {
        if (typeof showToast === "function") showToast(message, type);
        else console.log("[sales]", message);
    }

    /** can() of the OMS, but never throws (an unknown permission key must not break login). */
    function safeCan(permission) {
        try { return typeof can === "function" && !!can(permission); } catch (e) { return false; }
    }

    // can() already lets managers through; a non-manager needs the explicit "viewSales" permission
    const canView = () => safeCan(CONFIG.permission);

    let currency = "$";

    function money(n, compact = true) {
        if (n === null || n === undefined || Number.isNaN(n)) return "–";
        const a = Math.abs(n);
        const sign = n < 0 ? "-" : "";
        if (compact && a >= 1e6) return `${sign}${currency}${(a / 1e6).toFixed(2)}M`;
        if (compact && a >= 1e4) return `${sign}${currency}${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
        return `${sign}${currency}${Math.round(a).toLocaleString("en-US")}`;
    }

    const toneOf = ach => (ach >= 100 ? "good" : ach >= 80 ? "warn" : "bad");

    function timeText(ts) {
        return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }

    function agoText(ts) {
        const m = Math.round((Date.now() - ts) / 60000);
        if (m < 1) return "just now";
        if (m < 60) return `${m} min ago`;
        return `${Math.round(m / 60)} h ago`;
    }

    function hashText(s) {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        return s.length + ":" + h;
    }

    /* ---------------------------------------------------------
       Saved UI choices + saved copy of the sheet
       --------------------------------------------------------- */

    function restoreUi() {
        try {
            const ui = JSON.parse(localStorage.getItem(CONFIG.uiKey) || "null");
            if (ui) {
                state.region = ui.region || null;
                state.period = ui.period === "ytd" ? "ytd" : "mtd";
            }
        } catch (e) { /* ignore */ }
    }

    function saveUi() {
        try { localStorage.setItem(CONFIG.uiKey, JSON.stringify({ region: state.region, period: state.period })); } catch (e) { /* ignore */ }
    }

    function cacheSave(csv) {
        try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ t: Date.now(), csv })); } catch (e) { /* storage full / blocked */ }
    }

    function cacheLoad() {
        try {
            const c = JSON.parse(localStorage.getItem(CONFIG.cacheKey) || "null");
            return c && c.csv ? c : null;
        } catch (e) { return null; }
    }

    const hasAnySection = d => !!(d && (d.mtd || d.ytd || d.trend || d.brand));

    function hydrateFromCache() {
        if (state.data) return;
        const c = cacheLoad();
        if (!c) return;
        try {
            const data = P.parseSheet(c.csv);
            if (!hasAnySection(data)) return;
            state.data = data;
            state.updatedAt = c.t;
            state.hash = hashText(c.csv);
            state.status = "cached";
        } catch (e) { /* ignore a bad cache */ }
    }

    /* ---------------------------------------------------------
       Loading
       --------------------------------------------------------- */

    async function fetchCsvOnce() {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), CONFIG.timeoutMs);
        try {
            const sep = CONFIG.url.includes("?") ? "&" : "?";
            const res = await fetch(CONFIG.url + sep + "t=" + Date.now(), { cache: "no-store", signal: ctl.signal });
            if (!res.ok) throw new Error(`the sheet answered with HTTP ${res.status}`);
            const text = await res.text();
            if (/<html|<!doctype/i.test(text.slice(0, 400))) {
                throw new Error("the sheet is not published as CSV (Google returned a web page)");
            }
            return text;
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchCsv() {
        try {
            return await fetchCsvOnce();
        } catch (first) {
            await new Promise(r => setTimeout(r, 1200));
            try { return await fetchCsvOnce(); } catch (second) { throw second; }
        }
    }

    async function load({ silent = false } = {}) {
        if (state.loading) return;
        state.loading = true;

        const wasLive = state.status === "live" && !state.error;

        if (!silent) {
            state.status = state.data ? "refreshing" : "loading";
            if (!state.data) render(); else refreshStatusChip();
        }

        try {
            const csv = await fetchCsv();
            const data = P.parseSheet(csv);
            if (!hasAnySection(data)) {
                throw new Error("none of the expected sections were found in the sheet");
            }

            const hash = hashText(csv);
            const changed = hash !== state.hash || !state.data;

            state.data = data;
            state.hash = hash;
            state.updatedAt = Date.now();
            state.error = null;
            state.status = "live";
            cacheSave(csv);

            if (changed || !wasLive) render(); else refreshStatusChip();
        } catch (err) {
            state.error = err && err.name === "AbortError" ? "request timed out" : (err && err.message) || String(err);
            state.status = state.data ? "stale" : "error";
            render();
        } finally {
            state.loading = false;
        }
    }

    /* ---------------------------------------------------------
       Selection (region / period)
       --------------------------------------------------------- */

    function ensureSelection() {
        const d = state.data;
        if (state.period === "ytd" && !d.ytd) state.period = "mtd";
        if (state.period === "mtd" && !d.mtd && d.ytd) state.period = "ytd";

        const labels = regionLabels();
        if (!labels.includes(state.region)) state.region = labels[0] || null;

        const sample = d.mtd && d.mtd.rows[0] && d.mtd.rows[0].by.sales;
        const m = sample && sample.text.match(/[$€£]/);
        currency = m ? m[0] : "$";
    }

    /** Total first, then regions in sheet order. */
    function regionLabels() {
        const t = state.data.mtd || state.data.ytd;
        if (!t) return [];
        const total = t.rows.filter(r => r.isTotal).map(r => r.label);
        const rest = t.rows.filter(r => !r.isTotal).map(r => r.label);
        return [...total, ...rest];
    }

    const periodTable = () => (state.period === "ytd" ? state.data.ytd : state.data.mtd);

    function selectedRow() {
        const t = periodTable();
        if (!t) return null;
        return t.rows.find(r => r.label === state.region) || t.rows.find(r => r.isTotal) || t.rows[0];
    }

    function periodTitle() {
        return state.period === "ytd" ? "Year to date" : `Month to date${state.data.month ? " · " + pretty(state.data.month) : ""}`;
    }

    /** Trend months that have data for the selected region (these are the months the user can browse). */
    function monthChoices() {
        const d = state.data;
        return d && d.trend ? monthsForChart(d, trendKey()) : [];
    }

    /** The past month being viewed, or null when the sheet's current month (full MTD table) is shown. */
    function activeMonth() {
        const d = state.data;
        if (!d || state.month === null || state.period !== "mtd") return null;
        if (state.month === d.monthIndex) return null;
        return monthChoices().find(m => m.index === state.month) || null;
    }

    function trendKey() {
        const t = state.data.trend;
        if (!t) return null;
        const norm = s => String(s).trim().toLowerCase();
        return t.regions.find(r => norm(r) === norm(state.region)) || t.regions.find(isTotalLabel) || t.regions[0];
    }

    function groupKey() {
        const t = state.data.trend;
        return t ? (t.regions.find(isTotalLabel) || t.regions[0]) : null;
    }

    /* ---------------------------------------------------------
       Small HTML pieces
       --------------------------------------------------------- */

    function delta(cell) {
        if (!cell || cell.kind === "empty") return `<span class="s-pill flat">–</span>`;
        if (cell.num === null) return `<span class="s-pill flat">${esc(cell.text)}</span>`;
        const cls = cell.num > 0 ? "up" : cell.num < 0 ? "down" : "flat";
        const arrow = cell.num > 0 ? "▲" : cell.num < 0 ? "▼" : "•";
        return `<span class="s-pill ${cls}">${arrow} ${esc(cell.text)}</span>`;
    }

    function achBar(cell, wide) {
        if (!cell || cell.num === null) return `<span class="s-muted">${esc(cell ? cell.text || "–" : "–")}</span>`;
        const tone = toneOf(cell.num);
        return `<div class="s-cellbar${wide ? " wide" : ""}">
            <div class="s-bar"><i class="${tone}" style="width:${clamp(cell.num, 0, 100)}%"></i></div>
            <span class="s-t-${tone}">${esc(cell.text)}</span>
        </div>`;
    }

    function cellHtml(cell, role) {
        if (!cell || cell.kind === "empty") return `<td class="num s-muted" data-v="">–</td>`;
        const v = cell.num === null ? "" : cell.num;
        if (role === "evo" || role === "lflEvo") return `<td class="num" data-v="${v}">${delta(cell)}</td>`;
        if (role === "ach") return `<td class="num" data-v="${v}">${achBar(cell)}</td>`;
        return `<td class="num" data-v="${v}">${esc(cell.text)}</td>`;
    }

    function statusInfo() {
        const t = state.updatedAt ? timeText(state.updatedAt) : "";
        switch (state.status) {
            case "loading":
            case "refreshing": return { cls: "info", html: `<i class="s-spin"></i> Updating…` };
            case "error": return { cls: "bad", html: `● Offline` };
            case "stale": return { cls: "bad", html: `● Offline · data from ${t}` };
            case "cached": return { cls: "warn", html: `● Saved copy · ${t}` };
            case "live":
                if (Date.now() - state.updatedAt > CONFIG.staleMs) return { cls: "warn", html: `● Updated ${agoText(state.updatedAt)}` };
                return { cls: "good", html: `● Live · ${t}` };
            default: return { cls: "info", html: "…" };
        }
    }

    function refreshStatusChip() {
        const el = $("salesStatus");
        if (!el) return;
        const s = statusInfo();
        el.className = "s-chip " + s.cls;
        el.innerHTML = s.html;
    }

    function banner(kind, icon, html, action) {
        return `<div class="s-banner ${kind}"><i class="fa-solid ${icon}"></i><div>${html}</div>${action || ""}</div>`;
    }

    /* ---------------------------------------------------------
       Page sections
       --------------------------------------------------------- */

    function headHtml() {
        const d = state.data;
        const e = d && d.elapsed;
        const s = statusInfo();

        const month = d && d.month ? `
            <div class="s-month">
                <span class="s-badge">${esc(d.month)}</span>
                ${e && e.percent !== null ? `
                <div class="s-elapsed" title="${esc(e.text)}">
                    <div class="s-bar"><i class="info" style="width:${clamp(e.percent, 0, 100)}%"></i></div>
                    <small>${esc(e.text || e.percent + "% of the month")}</small>
                </div>` : ""}
            </div>` : "";

        return `
        <div class="s-head">
            <div>
                <div class="s-eyebrow"><i class="fa-solid fa-sack-dollar"></i> Premium Retail</div>
                <h2>Sales Report</h2>
                <div class="s-sub">${esc((d && d.title) || "Management dashboard")}</div>
            </div>
            <div class="s-head-right">
                ${month}
                <span id="salesStatus" class="s-chip ${s.cls}" title="Google refreshes published sheets every few minutes. This page re-checks every ${Math.round(CONFIG.refreshMs / 60000)} minutes.">${s.html}</span>
                <div class="s-actions s-noprint">
                    <button class="s-btn" data-act="refresh" title="Reload the sheet now"><i class="fa-solid fa-rotate"></i> Refresh</button>
                    <button class="s-btn" data-act="export" title="Download every table as Excel"><i class="fa-solid fa-file-excel"></i> Excel</button>
                    <button class="s-btn" data-act="print" title="Print / save as PDF"><i class="fa-solid fa-print"></i> Print</button>
                </div>
            </div>
        </div>`;
    }

    function bannersHtml() {
        const d = state.data;
        const out = [];

        if (state.error && d) {
            out.push(banner("bad", "fa-triangle-exclamation",
                `Couldn't refresh the sheet (${esc(state.error)}). Showing the last data from <b>${timeText(state.updatedAt)}</b>.`,
                `<button class="s-btn s-noprint" data-act="retry">Retry</button>`));
        } else if (state.status === "cached") {
            out.push(banner("info", "fa-clock-rotate-left",
                `Showing the saved copy from <b>${timeText(state.updatedAt)}</b> while the sheet is loading…`));
        }

        // the month comes from the sheet, not from this device's clock
        const nowIdx = new Date().getMonth();
        if (d.monthIndex >= 0 && d.monthIndex !== nowIdx) {
            const nowName = new Date().toLocaleString("en-US", { month: "long" });
            out.push(banner("warn", "fa-calendar-xmark",
                `The sheet is still set to <b>${esc(pretty(d.month))}</b>, but today is in <b>${esc(nowName)}</b>. ` +
                `The numbers below are the sheet's, so update its month row and the Month to date / Year to date tables, then press Refresh. ` +
                `(Google may take a few minutes to republish.)`));
        }

        if (d.warnings.length) {
            out.push(banner("warn", "fa-circle-info",
                `<b>Sheet notes:</b> ${d.warnings.map(esc).join(" · ")}`));
        }
        return out.length ? `<div class="s-banners">${out.join("")}</div>` : "";
    }

    function controlsHtml() {
        const d = state.data;
        const labels = regionLabels();

        const pills = labels.map(l =>
            `<button class="s-seg${l === state.region ? " active" : ""}" data-region="${esc(l)}">${esc(pretty(l))}</button>`).join("");

        const periods = [["mtd", "Month to date", d.mtd], ["ytd", "Year to date", d.ytd]]
            .filter(p => p[2])
            .map(p => `<button class="s-seg${state.period === p[0] ? " active" : ""}" data-period="${p[0]}">${p[1]}</button>`).join("");

        const choices = state.period === "mtd" ? monthChoices() : [];
        let nav = "";
        if (choices.length) {
            const cur = state.month === null ? d.monthIndex : state.month;
            const pos = choices.findIndex(m => m.index === cur);
            nav = `
            <div class="s-monthnav" role="group" aria-label="Month">
                <button class="s-btn" data-month-step="-1" title="Previous month" ${pos <= 0 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i></button>
                <select class="s-filter" data-month-select aria-label="Select month">
                    ${choices.map(m => `<option value="${m.index}"${m.index === cur ? " selected" : ""}>${esc(pretty(m.label))}${m.index === d.monthIndex ? " (sheet month)" : ""}${m.partial ? " *" : ""}</option>`).join("")}
                </select>
                <button class="s-btn" data-month-step="1" title="Next month" ${pos < 0 || pos >= choices.length - 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-right"></i></button>
            </div>`;
        }

        return `
        <div class="s-controls s-noprint">
            <div class="s-segs" role="group" aria-label="Region">${pills}</div>
            <div class="s-controls-right">
                ${nav}
                <div class="s-segs" role="group" aria-label="Period">${periods}</div>
            </div>
        </div>`;
    }

    /** KPIs of a past month, taken from the monthly-trend table (it only holds sales, last year, target, % target and evolution). */
    function monthKpiHtml(m) {
        const b = m.by[trendKey()] || {};
        const label = pretty(m.label);
        const cards = [];

        if (b.sales) {
            cards.push(`
            <div class="s-kpi s-kpi-hero">
                <div class="s-kpi-label"><i class="fa-solid fa-dollar-sign"></i> Net sales <span class="s-tag">${esc(pretty(state.region))} · ${esc(label)}</span>${m.partial ? ` <span class="s-tag warn">in progress</span>` : ""}</div>
                <div class="s-kpi-value xl">${esc(b.sales.text)}</div>
                <div class="s-kpi-foot">${b.evo ? delta(b.evo) : ""} <span class="s-muted">vs last year ${esc(b.salesLy ? b.salesLy.text : "–")}</span></div>
            </div>`);
        }
        if (b.ach) {
            cards.push(`
            <div class="s-kpi s-kpi-ach">
                <div class="s-kpi-label"><i class="fa-solid fa-bullseye"></i> Target achievement</div>
                <div class="s-kpi-value t-${b.ach.num !== null ? toneOf(b.ach.num) : "flat"}">${esc(b.ach.text)}</div>
                ${b.ach.num !== null ? `<div class="s-bar big"><i class="${toneOf(b.ach.num)}" style="width:${clamp(b.ach.num, 0, 100)}%"></i></div>` : ""}
                <div class="s-kpi-foot s-muted">Target ${esc(b.target ? b.target.text : "–")}</div>
            </div>`);
        }
        if (!cards.length) {
            return `<div class="s-card s-empty">No data for ${esc(label)} in the monthly trend table.</div>`;
        }
        return `
        ${banner("info", "fa-circle-info", `Showing <b>${esc(label)}</b> from the monthly trend table. Transactions, visitors, UPT and the other detailed KPIs exist only for the sheet's current month.`)}
        <div class="s-kpis">${cards.join("")}</div>`;
    }

    function kpiHtml() {
        const am = activeMonth();
        if (am) return monthKpiHtml(am);
        const row = selectedRow();
        if (!row) {
            return `<div class="s-card s-empty">No month-to-date / year-to-date table was found in the sheet.</div>`;
        }
        const b = row.by;
        const cards = [];

        const small = (label, cell, icon, hint) => cell && cell.kind !== "empty" ? `
            <div class="s-kpi">
                <div class="s-kpi-label"><i class="fa-solid ${icon}"></i> ${label}</div>
                <div class="s-kpi-value">${esc(cell.text)}</div>
                ${hint ? `<div class="s-kpi-foot s-muted">${hint}</div>` : ""}
            </div>` : "";

        if (b.sales) {
            cards.push(`
            <div class="s-kpi s-kpi-hero">
                <div class="s-kpi-label"><i class="fa-solid fa-dollar-sign"></i> Net sales <span class="s-tag">${esc(pretty(row.label))} · ${esc(periodTitle())}</span></div>
                <div class="s-kpi-value xl">${esc(b.sales.text)}</div>
                <div class="s-kpi-foot">${delta(b.evo)} <span class="s-muted">vs last year ${esc(b.salesLy ? b.salesLy.text : "–")}</span></div>
            </div>`);
        }

        if (b.ach) {
            cards.push(`
            <div class="s-kpi s-kpi-ach">
                <div class="s-kpi-label"><i class="fa-solid fa-bullseye"></i> Target achievement</div>
                <div class="s-kpi-value t-${b.ach.num !== null ? toneOf(b.ach.num) : "flat"}">${esc(b.ach.text)}</div>
                ${b.ach.num !== null ? `<div class="s-bar big"><i class="${toneOf(b.ach.num)}" style="width:${clamp(b.ach.num, 0, 100)}%"></i></div>` : ""}
                <div class="s-kpi-foot s-muted">Target ${esc(b.target ? b.target.text : "–")}</div>
            </div>`);
        }

        if (b.lflEvo) {
            cards.push(`
            <div class="s-kpi">
                <div class="s-kpi-label"><i class="fa-solid fa-scale-balanced"></i> Like-for-like</div>
                <div class="s-kpi-value">${delta(b.lflEvo)}</div>
                <div class="s-kpi-foot s-muted">${esc(b.lfl ? b.lfl.text : "–")} vs ${esc(b.lflLy ? b.lflLy.text : "–")}</div>
            </div>`);
        }

        cards.push(small("Transactions", b.txn, "fa-receipt"));
        cards.push(small("Units sold", b.units, "fa-boxes-stacked"));
        cards.push(small("Visitors", b.visitors, "fa-person-walking"));
        cards.push(small("UPT", b.upt, "fa-layer-group", "Units per transaction"));
        cards.push(small("ADPT", b.adpt, "fa-cart-shopping", "Average dollars per transaction"));
        cards.push(small("Conversion", b.cr, "fa-filter", "Transactions ÷ visitors"));

        return `<div class="s-kpis">${cards.join("")}</div>`;
    }

    function chartsHtml() {
        const d = state.data;
        if (typeof Chart === "undefined") {
            return banner("warn", "fa-chart-simple", "Charts could not load (Chart.js is not available). Tables and numbers below still work.");
        }
        const parts = [];
        const partial = d.trend && d.trend.months.some(m => m.partial);

        if (d.trend) {
            parts.push(`
            <div class="s-card s-span2">
                <div class="s-card-title">Monthly sales — ${esc(pretty(trendKey()))}
                    <span class="s-muted">${d.trend.years.length > 1 ? d.trend.years[d.trend.years.length - 1] + " vs " + d.trend.years[0] + " vs target" : "vs target"}</span></div>
                <div class="s-chart"><canvas id="salesTrendChart"></canvas></div>
                ${partial ? `<div class="s-foot s-muted">Faded bar: latest month, still in progress.</div>` : ""}
            </div>`);
        }

        const t = periodTable();
        if (t && t.rows.filter(r => !r.isTotal && r.by.sales && r.by.sales.num > 0).length >= 2) {
            parts.push(`
            <div class="s-card">
                <div class="s-card-title">Sales by region <span class="s-muted">${esc(periodTitle())}</span></div>
                <div class="s-chart"><canvas id="salesMixChart"></canvas></div>
            </div>`);
        }

        if (d.trend) {
            parts.push(`
            <div class="s-card s-span2">
                <div class="s-card-title">Achievement vs target by month — ${esc(pretty(trendKey()))}
                    <span class="s-muted">green ≥ 100% · amber ≥ 80% · red &lt; 80%</span></div>
                <div class="s-chart"><canvas id="salesAchChart"></canvas></div>
            </div>`);
        }

        if (d.brand && d.brand.brands.length) {
            const h = Math.max(300, d.brand.brands.length * 54);
            parts.push(`
            <div class="s-card">
                <div class="s-card-title">Brands <span class="s-muted">${esc(d.brand.title || "")}</span></div>
                <div class="s-chart" style="height:${h}px"><canvas id="salesBrandChart"></canvas></div>
            </div>`);
        }

        return `<div class="s-grid">${parts.join("")}</div>`;
    }

    /* ---------------------------------------------------------
       Insights (computed from the sheet's own numbers)
       --------------------------------------------------------- */

    function buildInsights() {
        const d = state.data;
        const out = [];
        const add = (tone, icon, html) => out.push({ tone, icon, html });
        const totalRow = t => (t ? t.rows.find(r => r.isTotal) : null);
        const gm = totalRow(d.mtd);
        const gy = totalRow(d.ytd);

        if (gm && gm.by.sales) {
            const a = gm.by.ach;
            add(a && a.num !== null ? toneOf(a.num) : "info", "fa-bullseye",
                `<b>${esc(pretty(d.month) || "Selected month")}</b>: group net sales <b>${esc(gm.by.sales.text)}</b>` +
                (a ? `, <b>${esc(a.text)}</b> of target` : "") +
                (gm.by.evo ? `, ${esc(gm.by.evo.text)} vs last year` : "") + ".");
        }

        if (gy && gy.by.sales && gy.by.target && gy.by.sales.num !== null && gy.by.target.num) {
            const gap = gy.by.target.num - gy.by.sales.num;
            const achText = gy.by.ach ? ` (${esc(gy.by.ach.text)} achieved)` : "";
            add(gap > 0 ? toneOf(gy.by.ach && gy.by.ach.num !== null ? gy.by.ach.num : 0) : "good", "fa-flag-checkered",
                gap > 0
                    ? `Year to date is <b>${money(gap)}</b> short of target${achText}.`
                    : `Year to date is <b>${money(-gap)}</b> ahead of target${achText}.`);
        }

        if (gm && gm.by.evo && gm.by.lflEvo && gm.by.evo.num !== null && gm.by.lflEvo.num !== null) {
            if (gm.by.evo.num - gm.by.lflEvo.num >= 5) {
                add("warn", "fa-scale-balanced",
                    `Headline growth is <b>${esc(gm.by.evo.text)}</b> but like-for-like is <b>${esc(gm.by.lflEvo.text)}</b> — the difference comes from sales outside the like-for-like base.`);
            } else {
                add(gm.by.lflEvo.num >= 0 ? "good" : "warn", "fa-scale-balanced",
                    `Like-for-like growth is <b>${esc(gm.by.lflEvo.text)}</b> for the month.`);
            }
        }

        const growthTable = d.ytd || d.mtd;
        const regs = growthTable ? growthTable.rows.filter(r => !r.isTotal && r.by.evo && r.by.evo.num !== null) : [];
        if (regs.length >= 2) {
            const sorted = [...regs].sort((a, b) => b.by.evo.num - a.by.evo.num);
            const lead = sorted[0];
            const lag = sorted[sorted.length - 1];
            add("info", "fa-earth-asia",
                `<b>${esc(pretty(lead.label))}</b> leads ${d.ytd ? "year-to-date" : "monthly"} growth at <b>${esc(lead.by.evo.text)}</b>; <b>${esc(pretty(lag.label))}</b> is at <b>${esc(lag.by.evo.text)}</b>.`);
        }

        const key = groupKey();
        if (d.trend && key) {
            const rows = d.trend.months
                .map(m => ({ m, x: m.by[key] || {} }))
                .filter(r => !r.m.partial && r.x.sales && r.x.sales.num > 0 && r.x.target && r.x.target.num > 0 && r.x.ach && r.x.ach.num !== null);

            if (rows.length >= 2) {
                const best = rows.reduce((a, b) => (b.x.ach.num > a.x.ach.num ? b : a));
                const worst = rows.reduce((a, b) => (b.x.ach.num < a.x.ach.num ? b : a));
                const hit = rows.filter(r => r.x.ach.num >= 100).length;
                add("info", "fa-chart-column",
                    `Best month vs target: <b>${esc(shortMonth(best.m.label))}</b> (${esc(best.x.ach.text)}). Weakest: <b>${esc(shortMonth(worst.m.label))}</b> (${esc(worst.x.ach.text)}). Target reached in <b>${hit}</b> of ${rows.length} complete months.`);
            }

            const p = d.trend.months.find(m => m.partial);
            if (p && p.by[key] && p.by[key].sales) {
                const x = p.by[key];
                add("info", "fa-hourglass-half",
                    `<b>${esc(pretty(p.label))}</b> is still in progress: <b>${esc(x.sales.text)}</b> so far` +
                    (x.target ? ` against a full-month target of ${esc(x.target.text)}` : "") + ".");
            }
        }

        if (d.brand) {
            const withAch = d.brand.brands.filter(b => b.by.ach && b.by.ach.num !== null);
            if (withAch.length >= 2) {
                const top = withAch.reduce((a, b) => (b.by.ach.num > a.by.ach.num ? b : a));
                const low = withAch.reduce((a, b) => (b.by.ach.num < a.by.ach.num ? b : a));
                const hit = withAch.filter(b => b.by.ach.num >= 100).length;
                add("info", "fa-tags",
                    `<b>${hit}</b> of ${withAch.length} brands are at or above target. Strongest: <b>${esc(pretty(top.label))}</b> (${esc(top.by.ach.text)}). Weakest: <b>${esc(pretty(low.label))}</b> (${esc(low.by.ach.text)}).`);
            }
        }

        return out;
    }

    function insightsHtml() {
        const list = buildInsights();
        if (!list.length) return "";
        return `
        <div class="s-card">
            <div class="s-card-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Insights <span class="s-muted">calculated from the sheet's numbers</span></div>
            <div class="s-insights">
                ${list.map(i => `<div class="s-insight ${i.tone}"><i class="fa-solid ${i.icon}"></i><div>${i.html}</div></div>`).join("")}
            </div>
        </div>`;
    }

    /* ---------------------------------------------------------
       Tables
       --------------------------------------------------------- */

    function sortTh(label, idx, extra = "") {
        return `<th data-sort="${idx}" class="${extra}" title="Click to sort">${esc(label)} <i class="fa-solid fa-sort"></i></th>`;
    }

    function regionTableHtml() {
        const t = periodTable();
        if (!t) return "";
        const cols = t.columns;

        const head = `<tr>${sortTh(t.labelHeader || "Region", 0, "left")}${cols.map((c, i) => sortTh(c.label, i + 1)).join("")}</tr>`;
        const rowHtml = r => `
            <tr data-region="${esc(r.label)}" class="${r.isTotal ? "is-total" : ""}${r.label === state.region ? " is-selected" : ""}">
                <td class="left" data-v="${esc(r.label.toLowerCase())}"><b>${esc(pretty(r.label))}</b></td>
                ${cols.map(c => cellHtml(r.cells[c.index], c.role)).join("")}
            </tr>`;

        return `
        <div class="s-card">
            <div class="s-card-title">Regions <span class="s-muted">${esc(periodTitle())} · click a row to focus that region</span></div>
            <div class="s-table-wrap">
                <table class="s-table sortable">
                    <thead>${head}</thead>
                    <tbody>${t.rows.filter(r => !r.isTotal).map(rowHtml).join("")}</tbody>
                    <tbody class="pinned">${t.rows.filter(r => r.isTotal).map(rowHtml).join("")}</tbody>
                </table>
            </div>
        </div>`;
    }

    function trendTableHtml() {
        const d = state.data;
        const t = d.trend;
        if (!t) return "";
        const key = trendKey();
        const yc = t.years[t.years.length - 1];
        const yl = t.years.length > 1 ? t.years[0] : null;

        let n = 0;
        const head = `<tr>
            ${sortTh(t.labelHeader || "Month", n++, "left")}
            ${sortTh(`Net sales ${yc || ""}`.trim(), n++)}
            ${yl ? sortTh(`Net sales ${yl}`, n++) : ""}
            ${sortTh("Target", n++)}
            ${sortTh("Evolution vs LY", n++)}
            ${sortTh("% vs Target", n++)}
        </tr>`;

        const row = (m, pinned) => {
            const x = m.by[key] || {};
            const empty = ["sales", "salesLy", "target"].every(k => !x[k] || !x[k].num);
            return `
            <tr class="${pinned ? "is-total" : ""}${empty ? " s-row-empty" : ""}">
                <td class="left" data-v="${pinned ? 99 : m.index}"><b>${esc(pretty(m.label))}</b>${m.partial ? ` <span class="s-tag warn" title="Latest month with data — may still be in progress">in progress</span>` : ""}</td>
                ${cellHtml(x.sales, "sales")}
                ${yl ? cellHtml(x.salesLy, "salesLy") : ""}
                ${cellHtml(x.target, "target")}
                ${cellHtml(x.evo, "evo")}
                ${cellHtml(x.ach, "ach")}
            </tr>`;
        };

        return `
        <div class="s-card">
            <div class="s-card-title">Monthly trend — ${esc(pretty(key))}</div>
            <div class="s-table-wrap">
                <table class="s-table sortable">
                    <thead>${head}</thead>
                    <tbody>${t.months.map(m => row(m, false)).join("")}</tbody>
                    <tbody class="pinned">${t.total ? row(t.total, true) : ""}</tbody>
                </table>
            </div>
        </div>`;
    }

    function brandTableHtml() {
        const b = state.data.brand;
        if (!b) return "";

        const sum = b.brands.reduce((a, r) => a + (r.by.sales && r.by.sales.num ? r.by.sales.num : 0), 0);
        const cols = b.columns;

        const head = `<tr>
            ${sortTh(b.labelHeader || "Brand", 0, "left")}
            ${cols.map((c, i) => sortTh(c.label, i + 1)).join("")}
            ${sum > 0 ? sortTh("Share", cols.length + 1) : ""}
        </tr>`;

        const share = r => {
            if (!(sum > 0)) return "";
            const v = r.by.sales && r.by.sales.num ? (r.by.sales.num / sum) * 100 : 0;
            return `<td class="num" data-v="${v}"><div class="s-cellbar"><div class="s-bar"><i class="info" style="width:${clamp(v, 0, 100)}%"></i></div><span>${v.toFixed(1)}%</span></div></td>`;
        };

        const rowHtml = (r, total) => `
            <tr class="${total ? "is-total" : ""}" data-name="${esc(r.label.toLowerCase())}">
                <td class="left" data-v="${esc(r.label.toLowerCase())}"><b>${esc(r.label)}</b></td>
                ${cols.map(c => cellHtml(r.cells[c.index], c.role)).join("")}
                ${total ? (sum > 0 ? "<td></td>" : "") : share(r)}
            </tr>`;

        return `
        <div class="s-card">
            <div class="s-card-title">Brand performance <span class="s-muted">${esc(b.title || "")}</span>
                <input class="s-filter s-noprint" data-filter="brand" placeholder="Filter brands…" aria-label="Filter brands"></div>
            <div class="s-table-wrap">
                <table class="s-table sortable" id="salesBrandTable">
                    <thead>${head}</thead>
                    <tbody>${b.brands.map(r => rowHtml(r, false)).join("")}</tbody>
                    <tbody class="pinned">${b.summaries.map(r => rowHtml(r, true)).join("")}</tbody>
                </table>
            </div>
        </div>`;
    }

    function tablesHtml() {
        return `<div class="s-stack">${regionTableHtml()}${trendTableHtml()}${brandTableHtml()}</div>`;
    }

    /** Every table found in the sheet, known or not — new sections show up here automatically. */
    function dataHtml() {
        const d = state.data;
        const kindName = { mtd: "Month to date", ytd: "Year to date", trend: "Monthly trend", brand: "Brand performance", other: "Other table" };

        const sections = d.sections.map(sec => `
            <div class="s-raw">
                <div class="s-raw-title">${esc(sec.title)} <span class="s-tag">${kindName[sec.kind] || sec.kind}${sec.kind !== "other" && !sec.primary ? " · duplicate" : ""}</span></div>
                <div class="s-table-wrap">
                    <table class="s-table sortable">
                        <thead><tr>${sec.header.map((h, i) => sortTh(h || "·", i, i === 0 ? "left" : "")).join("")}</tr></thead>
                        <tbody>${sec.rows.map(r => `
                            <tr class="${isTotalLabel(r.label) ? "is-total" : ""}">
                                ${r.cells.map((c, i) => i === 0
                                    ? `<td class="left" data-v="${esc(r.label.toLowerCase())}"><b>${esc(r.label)}</b></td>`
                                    : `<td class="num${c.num !== null && c.num < 0 && c.kind === "percent" ? " s-t-bad" : ""}" data-v="${c.num === null ? "" : c.num}">${c.kind === "empty" ? "" : esc(c.text)}</td>`).join("")}
                            </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`).join("");

        const health = `
            <div class="s-health">
                <div><b>${d.rowCount}</b> rows read · <b>${d.sections.length}</b> tables found</div>
                ${d.sections.map(s => `<div>${s.primary ? "✅" : s.kind === "other" ? "➕" : "⚠️"} <b>${esc(s.title)}</b> → ${esc(({ mtd: "month to date", ytd: "year to date", trend: "monthly trend", brand: "brand performance", other: "extra table (shown below)" })[s.kind])} · ${s.rows.length} rows × ${s.header.length} columns</div>`).join("")}
                ${d.warnings.length ? d.warnings.map(w => `<div>⚠️ ${esc(w)}</div>`).join("") : `<div>✅ Nothing missing</div>`}
            </div>`;

        return `
        <details class="s-card s-details s-noprint">
            <summary>All sheet data <span class="s-muted">(${d.sections.length} tables, exactly as read)</span></summary>
            <div class="s-stack">${sections}</div>
        </details>
        <details class="s-card s-details s-noprint">
            <summary>Sheet health <span class="s-muted">what the page understood from the sheet</span></summary>
            ${health}
        </details>`;
    }

    function skeletonHtml() {
        return `
        <div class="sales-page">
            ${headHtml()}
            <div class="s-kpis">${'<div class="s-skel"></div>'.repeat(6)}</div>
            <div class="s-grid"><div class="s-skel tall s-span2"></div><div class="s-skel tall"></div></div>
        </div>`;
    }

    function errorHtml() {
        return `
        <div class="sales-page">
            ${headHtml()}
            <div class="s-card s-empty">
                <i class="fa-solid fa-cloud-arrow-down s-empty-icon"></i>
                <h3>The sales sheet could not be loaded</h3>
                <p class="s-muted">${esc(state.error || "unknown error")}</p>
                <p class="s-muted">Check that the Google Sheet is still <b>Published to the web</b> (File → Share → Publish to web → CSV) and that this device is online.</p>
                <button class="s-btn primary" data-act="retry"><i class="fa-solid fa-rotate"></i> Try again</button>
            </div>
        </div>`;
    }

    /* ---------------------------------------------------------
       Charts
       --------------------------------------------------------- */

    function destroyCharts() {
        Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) { /* already gone */ } });
        charts = {};
    }

    /** Value axis (money) is x for horizontal bars and y otherwise; the category axis is the other one. */
    function axisOptions(horizontal) {
        const value = { beginAtZero: true, ticks: { color: COLORS.text, callback: v => money(v) }, grid: { color: COLORS.grid } };
        const category = { ticks: { color: COLORS.text }, grid: { display: false } };
        return horizontal ? { x: value, y: category } : { x: category, y: value };
    }

    const legend = { labels: { color: COLORS.text, usePointStyle: true, boxWidth: 8, padding: 14 } };

    const tooltipBase = {
        backgroundColor: "#020617", borderColor: "#1e293b", borderWidth: 1,
        titleColor: "#f8fafc", bodyColor: "#cbd5e1", padding: 10
    };

    /** Render canvases at >= 2x so text and bars stay crisp on normal-DPI screens and when the browser is zoomed out. */
    function sharpenCharts() {
        Chart.defaults.devicePixelRatio = clamp(window.devicePixelRatio || 1, 2, 3);
        Chart.defaults.color = COLORS.text;
        Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
        Chart.defaults.font.size = 12;
    }

    function drawCharts() {
        if (typeof Chart === "undefined") return;
        const d = state.data;
        sharpenCharts();

        try {
            drawTrend(d);
            drawMix();
            drawAchievement(d);
            drawBrands(d);
        } catch (err) {
            console.error("Sales charts failed:", err);
        }
    }

    function monthsForChart(d, key) {
        return d.trend.months.filter(m => {
            const x = m.by[key] || {};
            return ["sales", "salesLy", "target"].some(k => x[k] && x[k].num);
        });
    }

    function drawTrend(d) {
        const el = $("salesTrendChart");
        if (!el || !d.trend) return;

        const key = trendKey();
        const months = monthsForChart(d, key);
        const years = d.trend.years;
        const num = (m, k) => (m.by[key] && m.by[key][k] && m.by[key][k].num !== null ? m.by[key][k].num : null);
        const fade = (m, solid, faded) => (m.partial ? faded : solid);

        const datasets = [
            {
                label: String(years[years.length - 1] || "This year"),
                data: months.map(m => num(m, "sales")),
                backgroundColor: months.map(m => fade(m, COLORS.cur, "rgba(56,189,248,.35)")),
                borderRadius: 6, order: 2
            }
        ];
        if (years.length > 1) {
            datasets.push({
                label: String(years[0]),
                data: months.map(m => num(m, "salesLy")),
                backgroundColor: months.map(m => fade(m, COLORS.ly, "rgba(100,116,139,.35)")),
                borderRadius: 6, order: 2
            });
        }
        datasets.push({
            type: "line", label: "Target",
            data: months.map(m => num(m, "target")),
            borderColor: COLORS.target, backgroundColor: COLORS.target,
            borderWidth: 2, tension: .3, pointRadius: 3, order: 1
        });

        charts.trend = new Chart(el, {
            type: "bar",
            data: { labels: months.map(m => shortMonth(m.label) + (m.partial ? "*" : "")), datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                scales: axisOptions(false),
                plugins: {
                    legend,
                    tooltip: {
                        ...tooltipBase,
                        callbacks: {
                            label: c => `${c.dataset.label}: ${money(c.parsed.y, false)}`,
                            afterBody: items => {
                                const m = months[items[0].dataIndex];
                                const x = (m && m.by[key]) || {};
                                const lines = [];
                                if (x.evo && x.evo.text) lines.push(`vs last year: ${x.evo.text}`);
                                if (x.ach && x.ach.text) lines.push(`% vs target: ${x.ach.text}`);
                                if (m && m.partial) lines.push("Month still in progress");
                                return lines;
                            }
                        }
                    }
                }
            }
        });
    }

    function drawMix() {
        const el = $("salesMixChart");
        const t = periodTable();
        if (!el || !t) return;

        const rows = t.rows.filter(r => !r.isTotal && r.by.sales && r.by.sales.num > 0);
        const total = rows.reduce((a, r) => a + r.by.sales.num, 0);

        charts.mix = new Chart(el, {
            type: "doughnut",
            data: {
                labels: rows.map(r => pretty(r.label)),
                datasets: [{
                    data: rows.map(r => r.by.sales.num),
                    backgroundColor: rows.map((r, i) => COLORS.palette[i % COLORS.palette.length]),
                    borderColor: "#0b1220", borderWidth: 3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: "64%",
                plugins: {
                    legend: { ...legend, position: "bottom" },
                    tooltip: {
                        ...tooltipBase,
                        callbacks: { label: c => `${c.label}: ${money(c.parsed, false)} (${((c.parsed / total) * 100).toFixed(1)}%)` }
                    }
                }
            }
        });
    }

    function drawAchievement(d) {
        const el = $("salesAchChart");
        if (!el || !d.trend) return;

        const key = trendKey();
        const months = d.trend.months.filter(m => {
            const x = m.by[key] || {};
            return x.ach && x.ach.num !== null && x.target && x.target.num > 0 && x.sales && x.sales.num > 0;
        });
        const val = m => m.by[key].ach.num;

        charts.ach = new Chart(el, {
            type: "bar",
            data: {
                labels: months.map(m => shortMonth(m.label) + (m.partial ? "*" : "")),
                datasets: [
                    {
                        label: "% vs target",
                        data: months.map(val),
                        backgroundColor: months.map(m => {
                            const c = COLORS[toneOf(val(m))];
                            return m.partial ? c + "66" : c;
                        }),
                        borderRadius: 6, order: 2
                    },
                    {
                        type: "line", label: "Target (100%)",
                        data: months.map(() => 100),
                        borderColor: "#e2e8f0", borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, order: 1
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                scales: {
                    x: { ticks: { color: COLORS.text }, grid: { display: false } },
                    y: { beginAtZero: true, suggestedMax: 120, ticks: { color: COLORS.text, callback: v => v + "%" }, grid: { color: COLORS.grid } }
                },
                plugins: {
                    legend,
                    tooltip: {
                        ...tooltipBase,
                        callbacks: {
                            label: c => c.datasetIndex === 0 ? `% vs target: ${months[c.dataIndex].by[key].ach.text}` : "Target: 100%",
                            afterBody: items => months[items[0].dataIndex].partial ? ["Month still in progress"] : []
                        }
                    }
                }
            }
        });
    }

    function drawBrands(d) {
        const el = $("salesBrandChart");
        if (!el || !d.brand) return;

        const brands = d.brand.brands
            .filter(b => b.by.sales && b.by.sales.num !== null)
            .sort((a, b) => b.by.sales.num - a.by.sales.num);
        const years = d.brand.years;
        const short = s => (s.length > 24 ? s.slice(0, 22) + "…" : s);

        const datasets = [{
            label: String(years[years.length - 1] || "This year"),
            data: brands.map(b => b.by.sales.num),
            backgroundColor: COLORS.cur, borderRadius: 5
        }];
        if (years.length > 1) {
            datasets.push({
                label: String(years[0]),
                data: brands.map(b => (b.by.salesLy ? b.by.salesLy.num : null)),
                backgroundColor: COLORS.ly, borderRadius: 5
            });
        }

        charts.brand = new Chart(el, {
            type: "bar",
            data: { labels: brands.map(b => short(pretty(b.label))), datasets },
            options: {
                indexAxis: "y",
                responsive: true, maintainAspectRatio: false,
                scales: axisOptions(true),
                plugins: {
                    legend,
                    tooltip: {
                        ...tooltipBase,
                        callbacks: {
                            title: items => pretty(brands[items[0].dataIndex].label),
                            label: c => `${c.dataset.label}: ${money(c.parsed.x, false)}`,
                            afterBody: items => {
                                const b = brands[items[0].dataIndex];
                                const lines = [];
                                if (b.by.evo) lines.push(`vs last year: ${b.by.evo.text}`);
                                if (b.by.ach) lines.push(`% vs target: ${b.by.ach.text}`);
                                return lines;
                            }
                        }
                    }
                }
            }
        });
    }

    /* ---------------------------------------------------------
       Render
       --------------------------------------------------------- */

    function render() {
        const host = $("salesTab");
        if (!host || !state.open) return;

        destroyCharts();

        if (!state.data) {
            host.innerHTML = state.status === "error" ? errorHtml() : skeletonHtml();
            return;
        }

        ensureSelection();

        host.innerHTML = `
        <div class="sales-page">
            ${headHtml()}
            ${bannersHtml()}
            ${controlsHtml()}
            ${kpiHtml()}
            ${chartsHtml()}
            ${insightsHtml()}
            ${tablesHtml()}
            ${dataHtml()}
        </div>`;

        drawCharts();
    }

    /* ---------------------------------------------------------
       Interaction
       --------------------------------------------------------- */

    function setRegion(label) {
        state.region = label;
        saveUi();
        render();
    }

    function setMonth(idx) {
        const d = state.data;
        state.month = Number.isFinite(idx) && d && idx !== d.monthIndex ? idx : null;
        render();
    }

    function stepMonth(step) {
        const choices = monthChoices();
        const cur = state.month === null ? state.data.monthIndex : state.month;
        const pos = choices.findIndex(m => m.index === cur);
        const next = choices[pos + step];
        if (next) setMonth(next.index);
    }

    function setPeriod(p) {
        state.period = p === "ytd" ? "ytd" : "mtd";
        saveUi();
        render();
    }

    function sortBy(th) {
        const table = th.closest("table");
        const body = table && table.tBodies[0];
        if (!body) return;

        const idx = Number(th.dataset.sort);
        const dir = th.dataset.dir === "asc" ? "desc" : "asc";
        table.querySelectorAll("th[data-sort]").forEach(h => { delete h.dataset.dir; h.classList.remove("sorted"); });
        th.dataset.dir = dir;
        th.classList.add("sorted");

        // number | string | null (empty cells always sort last)
        const key = tr => {
            const cell = tr.children[idx];
            if (!cell) return null;
            const v = cell.dataset.v;
            if (v === undefined) return (cell.textContent || "").trim().toLowerCase() || null;
            if (v === "") return null;
            return /^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(v) ? parseFloat(v) : v.toLowerCase();
        };

        const rows = [...body.rows];
        rows.sort((a, b) => {
            const x = key(a);
            const y = key(b);
            if (x === null && y === null) return 0;
            if (x === null) return 1;
            if (y === null) return -1;
            const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
            return dir === "asc" ? r : -r;
        });
        rows.forEach(r => body.appendChild(r));
    }

    function filterRows(input) {
        const q = input.value.trim().toLowerCase();
        document.querySelectorAll("#salesBrandTable tbody:not(.pinned) tr").forEach(tr => {
            tr.style.display = !q || (tr.dataset.name || "").includes(q) ? "" : "none";
        });
    }

    function bind() {
        const host = $("salesTab");
        if (!host || host.__salesBound) return;
        host.__salesBound = true;

        host.addEventListener("click", e => {
            const el = e.target.closest("[data-act],[data-region],[data-period],[data-month-step],th[data-sort]");
            if (!el || !host.contains(el)) return;

            if (el.matches("th[data-sort]")) return sortBy(el);
            if (el.dataset.region !== undefined) return setRegion(el.dataset.region);
            if (el.dataset.period) return setPeriod(el.dataset.period);
            if (el.dataset.monthStep) return stepMonth(Number(el.dataset.monthStep));

            if (el.dataset.act === "refresh" || el.dataset.act === "retry") load();
            else if (el.dataset.act === "export") exportExcel();
            else if (el.dataset.act === "print") printReport();
        });

        host.addEventListener("change", e => {
            if (e.target.matches("[data-month-select]")) setMonth(Number(e.target.value));
        });

        host.addEventListener("input", e => {
            if (e.target.matches("[data-filter='brand']")) filterRows(e.target);
        });
    }

    /* ---------------------------------------------------------
       Export (Excel) + print
       --------------------------------------------------------- */

    function sheetName(raw, used) {
        let name = String(raw || "Sheet").replace(/[\[\]:*?\/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 28) || "Sheet";
        let n = name;
        let i = 2;
        while (used.has(n.toLowerCase())) n = `${name.slice(0, 25)} ${i++}`;
        used.add(n.toLowerCase());
        return n;
    }

    function exportExcel() {
        if (typeof requirePermission === "function" && !requirePermission("exportData")) return;
        const d = state.data;
        if (!d) return;
        if (typeof XLSX === "undefined") { toast("The Excel library did not load — reload the page", "error"); return; }

        const wb = XLSX.utils.book_new();
        const used = new Set();
        const names = { mtd: "Month to date", ytd: "Year to date", trend: "Monthly trend", brand: "Brand performance" };

        d.sections.forEach((sec, i) => {
            const aoa = [sec.header];
            const fmt = [[]];

            sec.rows.forEach(r => {
                const line = [];
                const f = [];
                r.cells.forEach((c, ci) => {
                    if (ci === 0) { line.push(r.label); f.push(null); }
                    else if (c.kind === "percent") { line.push(c.num / 100); f.push("0.0%"); }
                    else if (c.kind === "money") { line.push(c.num); f.push(`"${currency}"#,##0`); }
                    else if (c.kind === "number") { line.push(c.num); f.push(Number.isInteger(c.num) ? "#,##0" : "0.00"); }
                    else if (c.kind === "empty") { line.push(null); f.push(null); }
                    else { line.push(c.text); f.push(null); }
                });
                aoa.push(line);
                fmt.push(f);
            });

            const ws = XLSX.utils.aoa_to_sheet(aoa);
            fmt.forEach((f, r) => f.forEach((z, c) => {
                const cell = ws[XLSX.utils.encode_cell({ r, c })];
                if (cell && z) cell.z = z;
            }));
            ws["!cols"] = sec.header.map((h, c) => ({
                wch: Math.min(40, Math.max(11, String(h).length + 2, ...sec.rows.map(r => String((r.cells[c] || {}).text || r.label || "").length + 2)))
            }));

            const base = sec.primary && names[sec.kind] ? names[sec.kind] : (sec.title || `Table ${i + 1}`);
            XLSX.utils.book_append_sheet(wb, ws, sheetName(base, used));
        });

        const day = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `sales-report_${(d.month || "sheet").toLowerCase()}_${day}.xlsx`);
        toast("Sales report exported", "success");
    }

    function printReport() {
        document.body.classList.add("sales-printing");
        const done = () => {
            document.body.classList.remove("sales-printing");
            window.removeEventListener("afterprint", done);
        };
        window.addEventListener("afterprint", done);
        setTimeout(() => window.print(), 150);       // let the charts resize to the page first
    }

    /* ---------------------------------------------------------
       Timers
       --------------------------------------------------------- */

    function stopTimers() {
        clearInterval(refreshTimer);
        clearInterval(tickTimer);
        refreshTimer = tickTimer = null;
    }

    function startTimers() {
        stopTimers();
        refreshTimer = setInterval(() => { if (!document.hidden) load({ silent: true }); }, CONFIG.refreshMs);
        tickTimer = setInterval(refreshStatusChip, 30 * 1000);
    }

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && state.open && Date.now() - state.updatedAt > CONFIG.refreshMs) load({ silent: true });
    });

    /* ---------------------------------------------------------
       Public API (called from index.html / app-init.js)
       --------------------------------------------------------- */

    window.showSalesTab = function () {
        if (!canView()) {
            toast("You do not have access to this page", "error");
            return;
        }

        document.querySelectorAll(".main > div").forEach(div => div.classList.add("hidden"));
        document.querySelector(".no-access")?.remove();

        const header = $("dashboardHeader");
        if (header && !state.open) {
            header.dataset.salesPrev = header.style.display || "";
            header.style.display = "none";
        }

        const host = $("salesTab");
        if (!host) return;
        host.classList.remove("hidden");

        state.open = true;
        bind();
        hydrateFromCache();
        render();
        load();
        startTimers();
    };

    /** Called by the other pages' show*() functions before they open. */
    window.hideSalesTab = function () {
        if (!state.open) return;
        state.open = false;
        stopTimers();
        destroyCharts();
        $("salesTab")?.classList.add("hidden");

        const header = $("dashboardHeader");
        if (header && header.dataset.salesPrev !== undefined) {
            header.style.display = header.dataset.salesPrev;
            delete header.dataset.salesPrev;
        }
    };

    /** Called once after login: shows the sidebar link only to people who may open it. */
    window.initSalesTab = function () {
        restoreUi();
        $("salesNavLink")?.classList.toggle("perm-hidden", !canView());
    };

    window.canViewSales = canView;

    window.SalesReport = {
        refresh: () => load(),
        get data() { return state.data; },
        config: CONFIG
    };

})();