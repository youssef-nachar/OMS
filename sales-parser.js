/* =========================================================
   sales-parser.js  —  pure parser for the "Premium Retail –
   Management Dashboard" Google Sheet (published as CSV).

   No DOM, no Firebase, no globals except window.SalesParser.

   It never reads fixed cell addresses. The sheet is understood
   by STRUCTURE:
     • blank rows split the sheet into blocks
     • a block that starts with a one-cell row has a TITLE
     • the first row with text-only cells is the HEADER
     • every following row is DATA (value types are detected
       from the content: $ / % / numbers / text)
   Columns are mapped to meaning (sales, target, LFL ...) from
   their header text, with a positional fallback when headers
   are renamed. New regions, brands or extra sections appear
   automatically.
   ========================================================= */
(function (root) {
    "use strict";

    /* ---------------------------------------------------------
       Months
       --------------------------------------------------------- */

    const MONTH_RE = /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)$/i;
    const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    /** 0-11, or -1 when the text is not a month name. */
    function monthIndex(text) {
        const t = String(text ?? "").trim();
        if (!MONTH_RE.test(t)) return -1;
        return MONTH_KEYS.indexOf(t.slice(0, 3).toLowerCase());
    }

    /* ---------------------------------------------------------
       CSV (RFC 4180: quotes, escaped quotes, CRLF, BOM)
       --------------------------------------------------------- */

    function parseCsv(text) {
        const s = String(text ?? "").replace(/^\uFEFF/, "");
        const rows = [];
        let row = [];
        let cell = "";
        let quoted = false;

        for (let i = 0; i < s.length; i++) {
            const ch = s[i];

            if (quoted) {
                if (ch === '"') {
                    if (s[i + 1] === '"') { cell += '"'; i++; }
                    else quoted = false;
                } else cell += ch;
            }
            else if (ch === '"' && cell === "") quoted = true;
            else if (ch === ",") { row.push(cell); cell = ""; }
            else if (ch === "\n" || ch === "\r") {
                if (ch === "\r" && s[i + 1] === "\n") i++;
                row.push(cell); cell = "";
                rows.push(row); row = [];
            }
            else cell += ch;
        }

        if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
        return rows;
    }

    /* ---------------------------------------------------------
       Cell values: "$485,522" -> money, "-1.4%" -> percent ...
       `text` is always the sheet's own text (shown as-is).
       --------------------------------------------------------- */

    function parseCell(raw) {
        const text = String(raw ?? "").trim();
        if (!text) return { text: "", num: null, kind: "empty" };

        let t = text.replace(/[\s\u00A0]/g, "").replace(/[\u2212\u2013]/g, "-");
        let negative = false;
        if (/^\(.*\)$/.test(t)) { negative = true; t = t.slice(1, -1); }

        let kind = "number";
        if (t.endsWith("%")) { kind = "percent"; t = t.slice(0, -1); }

        const hasCurrency = /[$€£]/.test(t);
        t = t.replace(/[$€£]/g, "").replace(/,/g, "");

        if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return { text, num: null, kind: "text" };

        let num = parseFloat(t);
        if (negative) num = -num;
        if (hasCurrency && kind !== "percent") kind = "money";

        return { text, num, kind };
    }

    const EMPTY_CELL = Object.freeze({ text: "", num: null, kind: "empty" });

    /* ---------------------------------------------------------
       Blocks / titles / headers
       --------------------------------------------------------- */

    const isBlank = r => r.every(c => c === "");
    const filled = r => r.filter(c => c !== "");

    function splitBlocks(rows) {
        const blocks = [];
        let cur = [];
        rows.forEach(r => {
            if (isBlank(r)) {
                if (cur.length) blocks.push(cur);
                cur = [];
            } else cur.push(r);
        });
        if (cur.length) blocks.push(cur);
        return blocks;
    }

    function isTitleRow(r) {
        const f = filled(r);
        return f.length === 1 && parseCell(f[0]).kind === "text";
    }

    function splitTitle(block) {
        if (isTitleRow(block[0])) {
            return { title: filled(block[0])[0].replace(/\s+/g, " "), body: block.slice(1) };
        }
        return { title: "", body: block };
    }

    /** Header = first row with 2+ cells and no money/percent values in it. */
    function findHeaderIndex(body) {
        return body.findIndex(r => {
            const f = filled(r);
            if (f.length < 2) return false;
            return !f.some(c => {
                const k = parseCell(c).kind;
                return k === "money" || k === "percent";
            });
        });
    }

    function buildGeneric(title, body) {
        const hi = findHeaderIndex(body);
        if (hi === -1) return null;

        const header = body[hi];
        const data = body.slice(hi + 1).filter(r => filled(r).length > 0);

        let width = header.length;
        data.forEach(r => { width = Math.max(width, r.length); });
        // trim trailing empty columns
        while (width > 1 && header[width - 1] === "" && data.every(r => (r[width - 1] ?? "") === "")) width--;

        const cleanHeader = [];
        for (let c = 0; c < width; c++) cleanHeader.push(String(header[c] ?? "").replace(/\s+/g, " ").trim());

        const rows = data
            .map(r => {
                const cells = [];
                for (let c = 0; c < width; c++) cells.push(parseCell(r[c]));
                return { label: String(r[0] ?? "").replace(/\s+/g, " ").trim(), cells };
            })
            // a row that has a label but no values is a sub-heading, not data
            .filter(r => r.cells.slice(1).some(c => c.kind !== "empty"));

        return { title, header: cleanHeader, rows };
    }

    /* ---------------------------------------------------------
       Column meaning (from header text)
       --------------------------------------------------------- */

    function yearsIn(texts) {
        const set = new Set();
        texts.forEach(t => (String(t).match(/\b(?:19|20)\d{2}\b/g) || []).forEach(y => set.add(Number(y))));
        return [...set].sort((a, b) => a - b);
    }

    /**
     * sales | salesLy | evo | target | ach | units | txn | visitors | upt | adpt | cr
     * | lfl | lflLy | lflEvo   (or null when the header is not recognised)
     */
    function columnRole(label, years) {
        const t = String(label || "").toLowerCase().replace(/\s+/g, " ").trim();
        if (!t) return null;

        const year = Number((t.match(/\b(?:19|20)\d{2}\b/) || [])[0]) || null;
        const isCur = year && year === years[years.length - 1];
        const isLy = year && years.length > 1 && year === years[0];

        if (/lfl|like[- ]?for[- ]?like/.test(t)) {
            if (/evo|growth|%/.test(t)) return "lflEvo";
            if (isLy) return "lflLy";
            if (isCur || year) return "lfl";
            return null;
        }
        if (/%\s*(vs\.?\s*)?(target|tgt)|achiev|\bach\b/.test(t)) return "ach";
        if (/^evo|evolution|growth|vs\.?\s*ly/.test(t)) return "evo";
        if (/\btarget\b|\btgt\b|\bbudget\b/.test(t)) return "target";
        if (/units|qty|quantity|pieces/.test(t)) return "units";
        if (/transaction|receipt|ticket/.test(t)) return "txn";
        if (/visitor|traffic|footfall/.test(t)) return "visitors";
        if (/^upt\b|units per/.test(t)) return "upt";
        if (/^adpt\b|avg.*transaction|average.*transaction|basket/.test(t)) return "adpt";
        if (/^cr\b|conversion/.test(t)) return "cr";
        if (/net\s*sales|^sales|revenue|turnover/.test(t) || /^\d{4}$/.test(t)) {
            if (isLy) return "salesLy";
            if (isCur || !year) return "sales";
            return "salesLy";
        }
        return null;
    }

    /** Used when a sheet's headers were renamed beyond recognition. */
    const POSITIONAL_ROLES = ["sales", "salesLy", "evo", "target", "ach", "units", "txn", "visitors", "upt", "adpt", "cr"];

    const TOTAL_RE = /\b(total|group|overall|consolidated)\b/i;

    /* ---------------------------------------------------------
       Section models
       --------------------------------------------------------- */

    function buildColumns(generic, warnings, name) {
        const years = yearsIn(generic.header);
        const columns = [];
        for (let c = 1; c < generic.header.length; c++) {
            const label = generic.header[c];
            if (!label) continue;
            columns.push({ index: c, label, role: columnRole(label, years) });
        }

        if (!columns.some(c => c.role === "sales")) {
            warnings.push(`${name}: column names were not recognised, reading columns by position`);
            columns.forEach((col, i) => { col.role = POSITIONAL_ROLES[i] || null; });
        }
        return { columns, years };
    }

    function rowBy(row, columns) {
        const by = {};
        columns.forEach(col => {
            if (col.role && !(col.role in by)) by[col.role] = row.cells[col.index] || EMPTY_CELL;
        });
        return by;
    }

    function buildKpi(generic, warnings, name) {
        const { columns, years } = buildColumns(generic, warnings, name);
        const rows = generic.rows.map(r => ({
            label: r.label,
            isTotal: TOTAL_RE.test(r.label),
            cells: r.cells,
            by: rowBy(r, columns)
        }));
        return {
            title: generic.title,
            labelHeader: generic.header[0] || "",
            years,
            columns,
            rows,
            regions: rows.filter(r => !r.isTotal).map(r => r.label),
            totalLabel: (rows.find(r => r.isTotal) || {}).label || null
        };
    }

    const TREND_COL_RE = /^(?:(.*?)\s+)?(\d{4}|target|tgt|evo(?:lution)?|%\s*(?:vs\.?\s*)?(?:tgt|target)|ach(?:ievement)?)$/i;

    function trendMetric(token, years, year) {
        const t = token.toLowerCase();
        if (/^\d{4}$/.test(t)) return year === years[years.length - 1] ? "sales" : "salesLy";
        if (/^(target|tgt)$/.test(t)) return "target";
        if (/^evo/.test(t)) return "evo";
        return "ach";                                   // "% Tgt", "% vs Target", "Ach"
    }

    function buildTrend(generic, warnings) {
        const years = yearsIn(generic.header);
        const regions = [];
        const columns = [];                              // { index, region, metric }

        for (let c = 1; c < generic.header.length; c++) {
            const m = generic.header[c].match(TREND_COL_RE);
            if (!m) continue;
            const region = (m[1] || "Total").trim();
            const metric = trendMetric(m[2], years, Number(m[2]));
            if (!regions.includes(region)) regions.push(region);
            columns.push({ index: c, region, metric });
        }

        if (!columns.length) {
            warnings.push("Monthly trend: no '<Region> <Year|Target|Evo|% Tgt>' columns found");
            return null;
        }

        const months = [];
        let total = null;

        generic.rows.forEach(r => {
            const by = {};
            regions.forEach(region => { by[region] = {}; });
            columns.forEach(col => {
                if (!(col.metric in by[col.region])) by[col.region][col.metric] = r.cells[col.index] || EMPTY_CELL;
            });

            const mi = monthIndex(r.label);
            if (mi >= 0) months.push({ label: r.label, index: mi, by, partial: false });
            else if (/^(total|year|ytd|full year)/i.test(r.label)) total = { label: r.label, by };
        });

        if (!months.length) {
            warnings.push("Monthly trend: no month rows found");
            return null;
        }

        return { title: generic.title, labelHeader: generic.header[0] || "", years, regions, months, total };
    }

    function buildBrand(generic, warnings) {
        const { columns, years } = buildColumns(generic, warnings, "Brand performance");

        const all = generic.rows.map(r => ({
            label: r.label,
            cells: r.cells,
            by: rowBy(r, columns)
        }));

        // brands = rows before the first "... TOTAL ..." row; the rest are summary lines
        let cut = all.findIndex(r => TOTAL_RE.test(r.label));
        if (cut === -1) cut = all.length;

        return {
            title: generic.title,
            labelHeader: generic.header[0] || "",
            years,
            columns,
            brands: all.slice(0, cut),
            summaries: all.slice(cut)
        };
    }

    /* ---------------------------------------------------------
       Month meta row: "Month | OCTOBER | | Month elapsed: 100% (31 of 31 days)"
       --------------------------------------------------------- */

    function readMeta(row, result) {
        const cells = filled(row);
        const m = cells.find(c => monthIndex(c) >= 0);
        if (m) {
            result.month = m.toUpperCase();
            result.monthIndex = monthIndex(m);
        }

        const joined = cells.join(" ");
        const pct = joined.match(/(\d+(?:\.\d+)?)\s*%/);
        const days = joined.match(/(\d+)\s*(?:of|\/)\s*(\d+)\s*days?/i);
        if (pct || days) {
            result.elapsed = {
                percent: pct ? Number(pct[1]) : (days ? Math.round((Number(days[1]) / Number(days[2])) * 100) : null),
                day: days ? Number(days[1]) : null,
                days: days ? Number(days[2]) : null,
                text: cells.filter(c => /elapsed|\d+\s*%|days?/i.test(c)).join(" ").replace(/\s+/g, " ")
            };
        }
    }

    /* ---------------------------------------------------------
       Which section is which (title first, structure as fallback)
       --------------------------------------------------------- */

    function classify(generic, result) {
        const t = (generic.title || "").toLowerCase();

        if (/year\s*to\s*date|\bytd\b/.test(t)) return "ytd";
        if (/brand|categor|collection|product/.test(t)) return "brand";
        if (/trend|monthly|by\s*month|month\s*by\s*month/.test(t)) return "trend";
        if (/month\s*to\s*date|selected\s*month|\bmtd\b/.test(t)) return "mtd";

        if (generic.rows.filter(r => monthIndex(r.label) >= 0).length >= 6) return "trend";

        const first = (generic.header[0] || "").toLowerCase();
        if (/brand|categor/.test(first)) return "brand";
        if (/region|market|country/.test(first)) {
            if (!result.mtd) return "mtd";
            if (!result.ytd) return "ytd";
        }
        return "other";
    }

    /** The newest month that has sales may still be running: flag it. */
    function flagPartialMonth(result) {
        const trend = result.trend;
        if (!trend) return;

        const key = trend.regions.find(r => TOTAL_RE.test(r)) || trend.regions[0];
        let last = -1;
        trend.months.forEach((m, i) => {
            const v = m.by[key] && m.by[key].sales ? m.by[key].sales.num : null;
            if (v !== null && v > 0) last = i;
        });
        if (last < 0) return;

        const lastIdx = trend.months[last].index;
        const sel = result.monthIndex;

        if (sel >= 0 && lastIdx > sel) trend.months[last].partial = true;
        else if (sel >= 0 && lastIdx === sel && result.elapsed && result.elapsed.percent < 100) trend.months[last].partial = true;
    }

    /* ---------------------------------------------------------
       Public: parseSheet(csvText)
       --------------------------------------------------------- */

    function parseSheet(csvText) {
        const rows = parseCsv(csvText).map(r => r.map(c => String(c ?? "").trim()));

        const result = {
            title: "",
            month: "",
            monthIndex: -1,
            elapsed: null,
            mtd: null, ytd: null, trend: null, brand: null,
            sections: [],                                 // every table found (known or not)
            warnings: [],
            rowCount: rows.length
        };

        splitBlocks(rows).forEach(block => {
            const { title, body } = splitTitle(block);

            if (title && !body.length) {                  // lone title row = document title
                if (!result.title) result.title = title;
                return;
            }
            if (!title && /^month$/i.test(body[0][0] || "") && body[0].some(c => monthIndex(c) >= 0)) {   // month / elapsed row
                readMeta(body[0], result);
                body.shift();
                if (!body.length) return;
            }

            const generic = buildGeneric(title, body);
            if (!generic || !generic.rows.length) return;

            const kind = classify(generic, result);
            const primary = kind !== "other" && !result[kind];

            let model = null;
            if (primary) {
                if (kind === "mtd") model = buildKpi(generic, result.warnings, "Month to date");
                else if (kind === "ytd") model = buildKpi(generic, result.warnings, "Year to date");
                else if (kind === "trend") model = buildTrend(generic, result.warnings);
                else if (kind === "brand") model = buildBrand(generic, result.warnings);
                if (model) result[kind] = model;
            }

            result.sections.push({
                kind,
                primary: !!model,
                title: generic.title || "(untitled table)",
                header: generic.header,
                rows: generic.rows
            });
        });

        ["mtd", "ytd", "trend", "brand"].forEach(k => {
            if (!result[k]) result.warnings.push(`Section not found in the sheet: ${({ mtd: "month to date", ytd: "year to date", trend: "monthly trend", brand: "brand performance" })[k]}`);
        });

        flagPartialMonth(result);
        return result;
    }

    const api = { parseSheet, parseCsv, parseCell, monthIndex, columnRole, TOTAL_RE };

    root.SalesParser = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;

})(typeof window !== "undefined" ? window : globalThis);
