/* =========================================================
   utils.js  —  shared helpers (load FIRST)
   ========================================================= */

/** Local (not UTC) YYYY-MM-DD. toISOString() shifts the date for UTC+2/+3. */
function toLocalISODate(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function todayLocalISO() {
    return toLocalISODate(new Date());
}

/** Escape text before putting it inside innerHTML. */
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Escape a value that is placed inside an inline JS string: onclick="fn('...')". */
function escapeJsAttr(value) {
    return escapeHtml(String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
}

/** Firebase keys cannot contain . # $ / [ ] */
function firebaseSafeKey(value) {
    return String(value ?? "").replace(/[.#$/\[\]]/g, "").trim();
}

/** Kept for backward compatibility with older code. */
function cleanOrderKey(orderNo) {
    return firebaseSafeKey(orderNo);
}

function getOrderKey(orderNo) {
    return firebaseSafeKey(orderNo);
}

/** "m12345" / "M12345" / "#m12345"  ->  "#M12345" (null if it is not an order number). */
function normalizeOrderNo(value) {
    const v = String(value ?? "").trim().toUpperCase();
    if (/^#?M\d{5}$/.test(v)) return v.startsWith("#") ? v : "#" + v;
    return v || null;
}

function isOrderNoPattern(value) {
    return /^#?M\d{5}$/i.test(String(value ?? "").trim());
}

/** Lightweight toast (the old code called showToast which was never defined). */
function showToast(message, type = "info") {
    let host = document.getElementById("toastHost");
    if (!host) {
        host = document.createElement("div");
        host.id = "toastHost";
        host.className = "toast-host";
        document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.classList.add("toast-hide"), 2800);
    setTimeout(() => el.remove(), 3300);
}

function debounce(fn, wait = 250) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

/**
 * One way to switch screens. Every tab used to hide its neighbours by hand
 * and forgot some (settings, users, team notes ...), leaving two tabs visible.
 */
function showOnlyTab(tabId) {
    const header = document.getElementById("dashboardHeader");
    if (header) header.style.display = "none";

    document.querySelectorAll(".main > div").forEach(div => {
        div.classList.toggle("hidden", div.id !== tabId);
    });

    [".kpis", ".warehouse-container", ".sales-order"].forEach(sel =>
        document.querySelector(sel)?.classList.add("hidden")
    );

    document.getElementById(tabId)?.classList.remove("hidden");
}

/* ---------------------------------------------------------
   Render scheduling
   Firebase fires several events in a row (orders, orders_new, comments,
   returns, sheet). Every event used to rebuild the whole screen. Now they
   are coalesced into one pass and hidden screens are not rendered at all
   (they are marked dirty and drawn when they are opened).
   --------------------------------------------------------- */

const viewState = { orders: true, dashboard: true, timer: null };

function isVisible(selector) {
    const el = document.querySelector(selector);
    return !!el && !el.classList.contains("hidden");
}

function scheduleViews({ dashboard = true } = {}) {
    viewState.orders = true;
    if (dashboard) viewState.dashboard = true;
    if (viewState.timer) return;

    viewState.timer = setTimeout(() => {
        viewState.timer = null;
        flushViews();
    }, 60);
}

function flushViews() {
    if (viewState.orders && isVisible("#newOrderTab")) {
        viewState.orders = false;
        renderRecentOrders();
    }
    if (viewState.dashboard && (isVisible(".kpis") || isVisible("#advancedDashboardTab"))) {
        viewState.dashboard = false;
        updateDashboard();
    }
}

/* ---------------------------------------------------------
   Dialogs (replace blocking alert / confirm / prompt)
   --------------------------------------------------------- */

// every old alert("...") call now shows a toast instead of freezing the page
window.alert = message => showToast(String(message), "error");

function dialogHost() {
    let host = document.getElementById("dialogHost");
    if (!host) {
        host = document.createElement("div");
        host.id = "dialogHost";
        document.body.appendChild(host);
    }
    return host;
}

function confirmDialog(message, { title = "Please confirm", okText = "Confirm", danger = false } = {}) {
    return new Promise(resolve => {
        const host = dialogHost();
        host.innerHTML = `
        <div class="modal-backdrop" data-dialog>
            <div class="modal-card dialog-card" role="dialog" aria-modal="true">
                <h3>${escapeHtml(title)}</h3>
                <p class="dialog-text">${escapeHtml(message)}</p>
                <div class="modal-footer">
                    <button class="btn btn-ghost" data-act="cancel">Cancel</button>
                    <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="ok">${escapeHtml(okText)}</button>
                </div>
            </div>
        </div>`;

        const done = value => { host.innerHTML = ""; resolve(value); };
        host.querySelector("[data-act=ok]").onclick = () => done(true);
        host.querySelector("[data-act=cancel]").onclick = () => done(false);
        host.querySelector("[data-dialog]").onclick = e => { if (e.target.dataset.dialog !== undefined) done(false); };
        host.cancelHandler = () => done(false);
        host.querySelector("[data-act=ok]").focus();
    });
}

function promptDialog(message, { title = "Enter a value", type = "text", okText = "OK" } = {}) {
    return new Promise(resolve => {
        const host = dialogHost();
        host.innerHTML = `
        <div class="modal-backdrop" data-dialog>
            <div class="modal-card dialog-card" role="dialog" aria-modal="true">
                <h3>${escapeHtml(title)}</h3>
                <p class="dialog-text">${escapeHtml(message)}</p>
                <input id="dialogInput" type="${type}" autocomplete="off">
                <div class="modal-footer">
                    <button class="btn btn-ghost" data-act="cancel">Cancel</button>
                    <button class="btn btn-primary" data-act="ok">${escapeHtml(okText)}</button>
                </div>
            </div>
        </div>`;

        const input = host.querySelector("#dialogInput");
        const done = value => { host.innerHTML = ""; resolve(value); };
        host.querySelector("[data-act=ok]").onclick = () => done(input.value);
        host.querySelector("[data-act=cancel]").onclick = () => done(null);
        input.addEventListener("keydown", e => { if (e.key === "Enter") done(input.value); });
        host.cancelHandler = () => done(null);
        input.focus();
    });
}

/* Esc closes the top-most dialog / modal */
document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;

    const dialog = document.getElementById("dialogHost");
    if (dialog?.cancelHandler && dialog.innerHTML) return dialog.cancelHandler();

    const userModal = document.getElementById("userModalHost");
    if (userModal?.innerHTML && !userModal.querySelector("[data-force]")) {
        userModal.innerHTML = "";
        return;
    }

    ["premiumModal", "globalModal", "readyEditModal", "editReturnModal", "returnConfirmModal",
     "commentModal", "editOrderModal", "orderDetails"].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains("hidden")) el.classList.add("hidden");
    });
});
