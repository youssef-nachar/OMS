/* =========================================================
   distribution.js  —  reads the Google Sheet of distributed orders

   The old loader needed the header names ("request number",
   "request registration date time"...). If anybody renamed a
   column, nothing loaded.

   The new loader NEVER looks at header names:
     1. If SHEET_COLUMNS has a fixed index, that index is used.
     2. Otherwise each column is detected from its CONTENT
        (order numbers, dates, HH:MM times, company names).
   Header rows, blank rows and junk rows are skipped
   automatically because rows are validated by content.
   ========================================================= */

/**
 * Optional fixed positions (0 = first column, A in Excel).
 * Leave as null to auto-detect. Example: { orderNo: 0, date: 1, time: 2, company: 3 }
 */
const SHEET_COLUMNS = {
    orderNo: null,
    date: null,
    time: null,
    company: null
};

const KNOWN_COMPANIES = ["lmd", "wakilni", "employee"];

const DISTRIBUTION_REFRESH_MS = 60 * 1000;

let distributionSheetRows = [];      // parsed rows of the last successful fetch
let distributionLoading = false;
let distributionLastFetch = 0;
let distributionTimer = null;

/* ---------------------------------------------------------
   Generic sheet helpers (also used by the canceled sheet)
   --------------------------------------------------------- */

async function fetchSheetRows(url) {
    const res = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), {
        cache: "no-store"
    });
    if (!res.ok) throw new Error(`Sheet request failed (${res.status})`);

    const csv = await res.text();
    return Papa.parse(csv, { skipEmptyLines: true }).data;
}

const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;
const DATE_RE = /(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})/;

function cellText(row, index) {
    return String(row?.[index] ?? "").trim();
}

/** Returns the column index whose cells match `test` most often (or -1). */
function detectColumn(rows, test, exclude = [], minRatio = 0.5) {
    const sample = rows.slice(0, 300);
    const width = Math.max(0, ...sample.map(r => r.length));
    let best = -1;
    let bestScore = 0;

    for (let c = 0; c < width; c++) {
        if (exclude.includes(c)) continue;

        let hits = 0;
        let filled = 0;
        sample.forEach(r => {
            const v = cellText(r, c);
            if (!v) return;
            filled++;
            if (test(v)) hits++;
        });

        if (!filled) continue;
        const ratio = hits / filled;
        if (ratio >= minRatio && hits > bestScore) {
            best = c;
            bestScore = hits;
        }
    }
    return best;
}

function resolveColumns(rows) {
    const cols = { ...SHEET_COLUMNS };
    const taken = () => Object.values(cols).filter(v => v !== null && v !== -1);

    if (cols.orderNo === null) cols.orderNo = detectColumn(rows, v => isOrderNoPattern(v));
    if (cols.date === null) cols.date = detectColumn(rows, v => DATE_RE.test(v), taken());
    if (cols.time === null) cols.time = detectColumn(rows, v => TIME_RE.test(v), taken());
    if (cols.company === null) {
        cols.company = detectColumn(
            rows,
            v => KNOWN_COMPANIES.includes(v.toLowerCase()),
            taken(),
            0.3
        );
    }
    return cols;
}

/* ---------------------------------------------------------
   Lookup helpers
   --------------------------------------------------------- */

/**
 * distributedOrdersMap is keyed canonically ("#M12345") but this proxy lets
 * the rest of the app keep writing distributedOrdersMap[order.orderNo]
 * whether the order number has the "#" or not.
 */
function wrapOrderMap(store) {
    const canon = k => (typeof k === "string" && isOrderNoPattern(k) ? normalizeOrderNo(k) : k);
    return new Proxy(store, {
        get: (t, k) => t[canon(k)],
        has: (t, k) => canon(k) in t,
        set: (t, k, v) => { t[canon(k)] = v; return true; }
    });
}

function getDistributionEntry(orderNo) {
    return distributedOrdersMap[orderNo];
}

/* ---------------------------------------------------------
   Batch naming (Wakilni / Batch 1-4)
   --------------------------------------------------------- */

/** Accepts "HH:MM", "HH:MM:SS", a Date, or an ISO string. Returns minutes since midnight or null. */
function timeToMinutes(value) {
    if (value === null || value === undefined || value === "") return null;

    if (value instanceof Date) {
        return isNaN(value) ? null : value.getHours() * 60 + value.getMinutes();
    }

    const text = String(value).trim();
    const m = text.match(/(\d{1,2}):(\d{2})/);
    if (m && !/^\d{4}-\d{2}-\d{2}T/.test(text)) {
        return Number(m[1]) * 60 + Number(m[2]);
    }

    const d = new Date(text);
    return isNaN(d) ? null : d.getHours() * 60 + d.getMinutes();
}

function getBatchName(timeValue, company) {
    if ((company || "").trim().toLowerCase() === "wakilni") return "Wakilni Batch";

    const minutes = timeToMinutes(timeValue);
    if (minutes === null) return "-";

    if (minutes <= 600) return "Batch 1";   // up to 10:00
    if (minutes <= 690) return "Batch 2";   // up to 11:30
    if (minutes <= 780) return "Batch 3";   // up to 13:00
    return "Batch 4";
}

/* ---------------------------------------------------------
   Build the map from sheet rows + manual (Firebase) distributions
   --------------------------------------------------------- */

function parseDistributionRows(rows) {
    const cols = resolveColumns(rows);

    if (cols.orderNo === -1 || cols.date === -1 || cols.orderNo === null || cols.date === null) {
        console.warn("Distribution sheet: could not locate order/date columns", cols);
        return null;
    }

    const store = {};

    rows.forEach(r => {
        const orderNo = normalizeOrderNo(cellText(r, cols.orderNo));
        if (!orderNo || !isOrderNoPattern(orderNo)) return;          // skips header + junk

        const rawDate = cellText(r, cols.date);
        const date = formatDateForInput(rawDate);
        if (!date) return;

        let time = cols.time !== -1 && cols.time !== null ? cellText(r, cols.time) : "";
        if (!time) {
            const m = rawDate.match(/\d{1,2}:\d{2}(:\d{2})?/);       // "27/01/2026 12:54:26"
            if (m) time = m[0];
        }

        const company = cols.company !== -1 && cols.company !== null
            ? cellText(r, cols.company)
            : "";

        store[orderNo] = {
            date,
            time,
            company: company || "LMD",
            batch: getBatchName(time, company)
        };
    });

    return store;
}

/** Re-applies manual distributions + Firebase batch info on top of the sheet data. */
function rebuildDistributionMap() {
    const store = parseDistributionRows(distributionSheetRows) || {};

    allOrders.forEach(order => {
        const key = normalizeOrderNo(order.orderNo);
        const fbBatchTime = order.distributedTime || order.batch?.time;

        // distributed manually in the app but not (yet) in the sheet
        if (!store[key] && order.status === "distributed" && order.distributedDate) {
            store[key] = {
                date: order.distributedDate,
                time: "",
                company: order.company || order.batch?.type || "LMD",
                batch: "-"
            };
        }

        const entry = store[key];
        if (!entry) return;

        if (!entry.time && fbBatchTime) {
            const d = new Date(fbBatchTime);
            if (!isNaN(d)) {
                entry.time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
            }
        }

        if (order.batch?.name) {
            entry.batch = order.batch.name;
            entry.batchType = order.batch.type;
        }
    });

    distributedOrdersMap = wrapOrderMap(store);
}

/* ---------------------------------------------------------
   Public API (names kept: loadDistributedOrders is called from listenToOrders)
   --------------------------------------------------------- */

async function loadDistributedOrders(force = false) {

    // always re-merge with the freshest allOrders, even when the sheet was not re-fetched
    const stale = Date.now() - distributionLastFetch > DISTRIBUTION_REFRESH_MS;

    if (distributionLoading || (!force && !stale && distributionSheetRows.length)) {
        rebuildDistributionMap();
        return;
    }

    distributionLoading = true;

    try {
        const rows = await fetchSheetRows(distributionSheetURL);
        if (rows.length) {
            distributionSheetRows = rows;
            distributionLastFetch = Date.now();
        }
    } catch (err) {
        console.error("Distribution load error:", err);   // keep the last good snapshot
    } finally {
        distributionLoading = false;
    }

    rebuildDistributionMap();
    updateDashboard();
}

function startDistributionAutoRefresh() {
    if (distributionTimer) return;
    distributionTimer = setInterval(() => loadDistributedOrders(true), DISTRIBUTION_REFRESH_MS);
}

/* ---------------------------------------------------------
   Canceled orders sheet (optional) — same position-free reading
   --------------------------------------------------------- */

const canceledSheetURL = "";   // paste the published CSV link here to enable it

async function loadCanceledOrders() {
    if (!canceledSheetURL) return;

    try {
        const rows = await fetchSheetRows(canceledSheetURL);
        const col = detectColumn(rows, v => isOrderNoPattern(v));

        if (col === -1) {
            console.warn("Canceled sheet: no order column detected");
            return;
        }

        const next = new Set();
        rows.forEach(r => {
            const no = normalizeOrderNo(cellText(r, col));
            if (no && isOrderNoPattern(no)) next.add(no);
        });

        canceledOrdersSet = next;
        allOrders.forEach(o => {
            if (canceledOrdersSet.has(normalizeOrderNo(o.orderNo))) o.status = "canceled";
        });

    } catch (err) {
        console.error("Canceled load error:", err);
    }
}

/* ---------------------------------------------------------
   Used by the "Distributed Orders" listing
   --------------------------------------------------------- */

function showDistributedOrders() {
    const from = dateFrom.value || null;
    const to = dateTo.value || null;

    const orders = allOrders.filter(o => {
        const entry = getDistributionEntry(o.orderNo);
        if (!entry) return false;
        if (from && entry.date < from) return false;
        if (to && entry.date > to) return false;
        return true;
    });

    displayOrders(orders, "Distributed Orders");
}
