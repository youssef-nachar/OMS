/* =========================================================
   readytodistribute.js  —  Ready To Distribute / Checked / Distribute
   (sheet loading moved to distribution.js, DB loops moved to
    orders-service.js, styles moved to oms.css)
   ========================================================= */

let selectedCompanyFilter = "";
let selectedStatusFilter = "";
let editingReadyOrderNo = null;

const DEFAULT_APP_SETTINGS = {
    batchTypes: {
        Wakilni:  [{ name: "Wakilni Batch 1",  from: "10:00", to: "12:00" }],
        Employee: [{ name: "Employee Batch 1", from: "12:00", to: "15:00" }],
        LMD:      [{ name: "LMD Batch 1",      from: "15:00", to: "23:59" }]
    },
    selectedBatchType: "Wakilni",
    batchesColumns: 2
};

let appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));

const COMPANIES = ["LMD", "Wakilni", "Employee"];

/* ---------------------------------------------------------
   Settings  (loadSettings was never called before, so saved
   batch times were ignored after every refresh)
   --------------------------------------------------------- */

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem("appSettings") || "null");
        if (!saved) return;

        appSettings = {
            ...DEFAULT_APP_SETTINGS,
            ...saved,
            batchTypes: { ...DEFAULT_APP_SETTINGS.batchTypes, ...(saved.batchTypes || {}) }
        };
    } catch (err) {
        console.warn("Settings reset (corrupted value)", err);
    }
}

function saveSettings() {
    localStorage.setItem("appSettings", JSON.stringify(appSettings));
}

function getCurrentBatchList() {
    return appSettings.batchTypes[appSettings.selectedBatchType] || [];
}

function toMinutes(hhmm) {
    const [h, m] = String(hhmm || "0:0").split(":").map(Number);
    return h * 60 + m;
}

/** Batch of a company for the current time of day. */
function getCurrentBatch(company) {
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();

    for (const batch of appSettings.batchTypes[company] || []) {
        if (current >= toMinutes(batch.from) && current < toMinutes(batch.to)) {
            return { type: company, name: batch.name };
        }
    }
    return { type: company, name: "No Batch" };
}

/* ---------------------------------------------------------
   Modals
   --------------------------------------------------------- */

function showGlobalModal(message) {
    document.getElementById("globalModalText").innerText = message;
    document.getElementById("globalModal").classList.remove("hidden");
}

function closeGlobalModal() {
    document.getElementById("globalModal").classList.add("hidden");
}

function showPremiumModal(html) {
    document.getElementById("premiumModalText").innerHTML = html;
    document.getElementById("premiumModal").classList.remove("hidden");
}

function closePremiumModal() {
    document.getElementById("premiumModal").classList.add("hidden");
}

function showBlockedModal(title, bodyHtml) {
    showPremiumModal(`
        <div class="rtd-blocked">
            <div class="rtd-blocked-icon">⛔</div>
            <div class="rtd-blocked-title">${escapeHtml(title)}</div>
            <div class="rtd-blocked-body">${bodyHtml}</div>
        </div>`);
}

/* ---------------------------------------------------------
   Comment guard
   --------------------------------------------------------- */

async function hasOpenComment(orderNo) {
    const commentsSnap = await get(ref(db, "orderComments"));
    const hasComments = commentsSnap.exists() &&
        Object.values(commentsSnap.val()).some(c => c.orderNo === orderNo);

    if (!hasComments) return false;

    const metaSnap = await get(ref(db, `orderCommentsMeta/${getOrderKey(orderNo)}`));
    return !(metaSnap.exists() && metaSnap.val().closed === true);
}

/** Shared pre-flight check. Returns the order, or null after telling the user why not. */
async function validateOrderForReady(orderNo) {
    const order = findOrderByNumber(orderNo);

    if (!order) {
        showToast(`Order ${orderNo} was not found`, "error");
        return null;
    }

    const blockedStatus = {
        pending: "PENDING",
        partial: "PARTIAL (not every warehouse has packed it)",
        distributed: "already DISTRIBUTED",
        returned: "RETURNED",
        canceled: "CANCELED",
        canceled_before_delivery: "CANCELED"
    }[order.status];

    if (blockedStatus) {
        showBlockedModal(
            "Distribution Blocked",
            `Order <b class="rtd-hl">${escapeHtml(order.orderNo)}</b> is currently
             <b class="rtd-bad">${blockedStatus}</b> and cannot be moved to
             <b class="rtd-ok">Ready To Distribute</b>.`
        );
        return null;
    }

    if (await hasOpenComment(order.orderNo)) {
        showGlobalModal("❌ This order has an OPEN comment. Please close it before proceeding.");
        return null;
    }

    return order;
}

/* ---------------------------------------------------------
   Add to Ready
   --------------------------------------------------------- */

async function moveToReadyFromInputs() {
    if (!requirePermission("manageReady")) return;

    const orderNo = normalizeOrderNo(document.getElementById("readyOrderInput").value);
    if (!orderNo) return;

    const company = document.getElementById("readyCompanyInput").value.trim();
    const boxes = document.getElementById("readyBoxesInput").value.trim();
    const cbmRaw = document.getElementById("readyCBMInput").value.trim();
    const note = document.getElementById("readyEmailInput").value.trim();

    if (boxes === "" || cbmRaw === "") return showToast("Enter Boxes and CBM first", "error");
    if (!company) return showToast("Select a company", "error");

    const boxesNum = Number(boxes);
    const cbmNum = Number(cbmRaw.replace(",", "."));
    if (!Number.isFinite(boxesNum) || boxesNum < 0 || !Number.isFinite(cbmNum) || cbmNum < 0) {
        return showToast("Boxes and CBM must be valid numbers", "error");
    }

    const order = await validateOrderForReady(orderNo);
    if (!order) return;

    const readyTime = new Date().toISOString();

    const saved = await updateOrderRecords(
        order.orderNo,
        () => ({
            readyToDistribute: true,
            status: "ready_to_distribute",
            boxes: boxesNum,
            cbm: cbmNum,
            company,
            emailOrComment: note,
            readyTime
        }),
        { action: "ready_to_distribute", boxes: boxesNum, cbm: cbmNum, company, emailOrComment: note }
    );

    if (!saved) return showToast(`Order ${order.orderNo} was not found in the database`, "error");

    patchLocalOrder(order.orderNo, {
        readyToDistribute: true,
        status: "ready_to_distribute",
        boxes: boxesNum,
        cbm: cbmNum,
        company,
        emailOrComment: note,
        readyTime
    });

    renderReadyOrders();
    updateDashboard();

    ["readyOrderInput", "readyBoxesInput", "readyCBMInput", "readyEmailInput", "readyCompanyInput"]
        .forEach(id => (document.getElementById(id).value = ""));

    showToast(`${order.orderNo} is ready to distribute`, "success");
}

/* ---------------------------------------------------------
   Edit
   --------------------------------------------------------- */

function openReadyEditModal(orderNo) {
    if (!requirePermission("manageReady")) return;

    const order = findOrderByNumber(orderNo);
    if (!order) return;

    editingReadyOrderNo = order.orderNo;
    document.getElementById("editBoxes").value = order.boxes ?? 0;
    document.getElementById("editCBM").value = order.cbm ?? 0;

    const note = document.getElementById("editReadyComment");   // renamed: the id used to be duplicated
    if (note) note.value = order.emailOrComment || "";

    document.getElementById("readyEditModal").classList.remove("hidden");
}

async function saveReadyEdit() {
    if (!requirePermission("manageReady")) return;
    if (!editingReadyOrderNo) return;

    const boxes = Number(document.getElementById("editBoxes").value);
    const cbm = Number(String(document.getElementById("editCBM").value).replace(",", "."));
    const note = document.getElementById("editReadyComment")?.value.trim();

    if (!Number.isFinite(boxes) || boxes < 0 || !Number.isFinite(cbm) || cbm < 0) {
        return showToast("Boxes and CBM must be valid numbers", "error");
    }

    const patch = { boxes, cbm };
    if (note !== undefined) patch.emailOrComment = note;

    await updateOrderRecords(
        editingReadyOrderNo,
        () => ({ ...patch }),
        { action: "ready_edited", boxes, cbm }
    );

    patchLocalOrder(editingReadyOrderNo, patch);
    document.getElementById("readyEditModal").classList.add("hidden");
    editingReadyOrderNo = null;
    renderReadyOrders();
}

/* ---------------------------------------------------------
   Checked
   --------------------------------------------------------- */

async function markOrderChecked(orderNo) {
    if (!requirePermission("manageReady")) return;

    const order = findOrderByNumber(orderNo);
    if (!order || order.status === "pending" || order.status === "partial") return;

    if (await hasOpenComment(order.orderNo)) {
        return showToast(`Order ${order.orderNo} has an OPEN comment. Close it first.`, "error");
    }

    await updateOrderRecords(
        order.orderNo,
        () => ({ status: "checked", readyToDistribute: true }),
        { action: "checked" }
    );

    patchLocalOrder(order.orderNo, { status: "checked", readyToDistribute: true });
    renderReadyOrders();
    updateDashboard();
}

/* ---------------------------------------------------------
   Distribute
   --------------------------------------------------------- */

async function distributeSelectedOrders() {
    if (!requirePermission("distribute")) return;

    const selected = [...document.querySelectorAll(".readyCheckbox:checked")].map(cb => cb.value);
    if (!selected.length) return showToast("Select at least one order", "error");

    const notChecked = selected.filter(no => findOrderByNumber(no)?.status !== "checked");
    if (notChecked.length) {
        return showBlockedModal(
            "Not Checked Yet",
            `The following orders must be <b class="rtd-warn">Checked</b> before distribution:
             <div class="rtd-list">${notChecked.map(escapeHtml).join("<br>")}</div>`
        );
    }

    if (!(await confirmDialog(`Distribute ${selected.length} order(s)?`, { title: "Distribute orders", okText: "Distribute" }))) return;

    const now = new Date();
    const isoNow = now.toISOString();
    const today = toLocalISODate(now);

    try {
        await updateOrdersBulk(
            selected,
            data => {
                const batch = getCurrentBatch(data.company || "LMD");
                return {
                    status: "distributed",
                    readyToDistribute: false,
                    distributedDate: today,
                    distributedTime: isoNow,
                    batch: { type: batch.type, name: batch.name, date: today, time: isoNow }
                };
            },
            data => {
                const batch = getCurrentBatch(data.company || "LMD");
                return { action: "distributed", by: "Distribution", batch: batch.name, batchType: batch.type };
            }
        );

        selected.forEach(no => {
            const o = findOrderByNumber(no);
            if (!o) return;
            const batch = getCurrentBatch(o.company || "LMD");
            Object.assign(o, {
                status: "distributed",
                readyToDistribute: false,
                distributedDate: today,
                distributedTime: isoNow,
                batch: { type: batch.type, name: batch.name, date: today, time: isoNow }
            });
        });

        rebuildDistributionMap();
        renderReadyOrders();
        updateDashboard();
        showToast(`${selected.length} order(s) distributed`, "success");

    } catch (err) {
        console.error(err);
        showToast("Distribution failed", "error");
    }
}

function isDistributed(order) {
    return (
        order.status === "distributed" ||
        (order.readyToDistribute === false && !!order.batch) ||
        (order.history || []).some(h => h.action === "distributed")
    );
}

/* ---------------------------------------------------------
   Batches overview (kept; escaped)
   --------------------------------------------------------- */

function renderSingleBatch(title, orders) {
    return `
    <div class="rtd-batch">
        <h4>${escapeHtml(title)}</h4>
        <table>
            <tr><th>Order</th><th>Warehouse</th><th>Boxes</th><th>CBM</th></tr>
            ${orders.map(o => `
            <tr>
                <td>${escapeHtml(o.orderNo)}</td>
                <td>${escapeHtml(o.warehouse || "-")}</td>
                <td>${o.boxes || 0}</td>
                <td>${o.cbm || 0}</td>
            </tr>`).join("")}
        </table>
    </div>`;
}

function renderBatchesTable() {
    const container = document.getElementById("batchesTable");
    if (!container) return;

    const grouped = {};
    allOrders.forEach(o => {
        if (!o.batch) return;
        const name = `${o.batch.type || "Unknown"} - ${o.batch.name || "No Batch"}`;
        (grouped[name] = grouped[name] || []).push(o);
    });

    if (!Object.keys(grouped).length) {
        container.innerHTML = `<div class="rtd-empty">No batches distributed yet</div>`;
        return;
    }

    container.innerHTML = `
        <h3 class="rtd-title-accent">📦 Distribution Batches</h3>
        <div class="rtd-batch-grid" style="grid-template-columns:repeat(${appSettings.batchesColumns},1fr)">
            ${Object.keys(grouped).map(n => renderSingleBatch(n, grouped[n])).join("")}
        </div>`;
}

/* ---------------------------------------------------------
   Page
   --------------------------------------------------------- */

function showReadyToDistributeTab() {
    showOnlyTab("readyTab");

    const canManage = can("manageReady");
    const canDistribute = can("distribute");

    document.getElementById("readyTab").innerHTML = `
    <div class="rtd-head">
        <div>
            <div class="rtd-eyebrow">Logistics Operations</div>
            <h2>Ready To Distribute</h2>
        </div>
        <div class="rtd-live">LIVE</div>
    </div>

    <div class="rtd-layout">

        <aside class="rtd-panel rtd-form">
            <h3>🚚 Ready To Distribute</h3>

            ${canManage ? `
            <input id="readyOrderInput" class="ready" placeholder="Order #" autocomplete="off">

            <select id="readyCompanyInput">
                <option value="">Select Company</option>
                ${COMPANIES.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>

            <input id="readyBoxesInput" placeholder="Boxes Count" type="number" min="0">
            <input id="readyCBMInput" placeholder="CBM" type="number" step="0.01" min="0">
            <input id="readyEmailInput" placeholder="Comment / Email Notification">

            <button class="btn btn-success btn-block" onclick="moveToReadyFromInputs()">🚚 Add To Ready</button>
            ` : ""}

            ${canDistribute ? `
            <button class="btn btn-success btn-block" onclick="distributeSelectedOrders()">🚚 Distribute Selected</button>
            ` : ""}

            ${can("manageSettings") ? `
            <button class="btn btn-muted btn-block" onclick="showSettingsTab()">⚙️ Settings</button>
            ` : ""}
        </aside>

        <section class="rtd-panel rtd-list">
            <div class="rtd-list-head">
                <h3>📦 Ready Orders</h3>
                ${can("exportData") ? `<button class="btn btn-primary" onclick="exportReadyToExcel()">⬇ Export to Excel</button>` : ""}
            </div>
            <div id="readyOrdersTable"></div>
        </section>
    </div>`;

    renderReadyOrders();
}

function getReadyOrders() {
    // an order that already left (distributed / returned / canceled) is not "ready" anymore
    let list = allOrders.filter(o => o.status === "ready_to_distribute" || o.status === "checked");

    if (selectedStatusFilter === "checked") list = list.filter(o => o.status === "checked");
    if (selectedStatusFilter === "ready") list = list.filter(o => o.status === "ready_to_distribute");
    if (selectedCompanyFilter) list = list.filter(o => o.company === selectedCompanyFilter);

    return list.sort((a, b) => new Date(b.readyTime || 0) - new Date(a.readyTime || 0));
}

function renderReadyOrders() {
    const container = document.getElementById("readyOrdersTable");
    if (!container) return;

    const orders = getReadyOrders();
    const canManage = can("manageReady");

    if (!orders.length) {
        container.innerHTML = `
        <div class="rtd-empty">
            <h3>No orders found</h3>
            <p>No orders available for <b>${escapeHtml(selectedCompanyFilter || "selected filter")}</b></p>
            <button class="btn btn-primary" onclick="clearCompanyFilter()">🔄 Show All Orders</button>
        </div>`;
        return;
    }

    const select = (id, handler, current, options) => `
        <select id="${id}" class="rtd-th-select" onchange="${handler}(this.value)">
            ${options.map(([value, label]) =>
                `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>`;

    container.innerHTML = `
    <table class="ready-table">
        <thead>
            <tr>
                <th><input type="checkbox" id="selectAllReady" onchange="toggleSelectAllReady(this)"></th>
                <th>Order</th>
                <th>Boxes</th>
                <th>CBM</th>
                <th>${select("readyCompanyFilter", "filterReadyByCompany", selectedCompanyFilter,
                    [["", "All Companies"], ...COMPANIES.map(c => [c, c])])}</th>
                <th>Note</th>
                <th>Status</th>
                <th>${select("readyStatusFilter", "setStatusFilter", selectedStatusFilter,
                    [["", "All Status"], ["checked", "Checked"], ["ready", "Ready"]])}</th>
            </tr>
        </thead>
        <tbody>
        ${orders.map(o => {
            const checked = o.status === "checked";
            return `
            <tr>
                <td><input type="checkbox" class="readyCheckbox" value="${escapeHtml(o.orderNo)}" onchange="updateSelectAllReady()"></td>
                <td>${escapeHtml(o.orderNo)}</td>
                <td>${o.boxes || 0}</td>
                <td>${o.cbm || 0}</td>
                <td class="rtd-company">${escapeHtml(o.company || "-")}</td>
                <td class="rtd-note">${escapeHtml(o.emailOrComment || "-")}</td>
                <td class="${checked ? "rtd-checked" : "rtd-ready"}">${checked ? "Checked" : "Ready"}</td>
                <td>
                    <div class="rtd-row-actions">
                        ${canManage ? (checked
                            ? `<span class="rtd-checked">✓ Checked</span>`
                            : `<button class="btn btn-warn" onclick="markOrderChecked('${escapeJsAttr(o.orderNo)}')">✓ Checked</button>`) : ""}
                        ${canManage ? `<button class="btn btn-ghost" onclick="openReadyEditModal('${escapeJsAttr(o.orderNo)}')">Edit</button>` : ""}
                    </div>
                </td>
            </tr>`;
        }).join("")}
        </tbody>
    </table>`;
}

/* ---------------------------------------------------------
   Filters / selection
   --------------------------------------------------------- */

function filterReadyByCompany(company) {
    selectedCompanyFilter = company || "";
    renderReadyOrders();
}

function setStatusFilter(type) {
    selectedStatusFilter = type || "";
    renderReadyOrders();
}

function clearCompanyFilter() {
    selectedCompanyFilter = "";
    selectedStatusFilter = "";
    renderReadyOrders();
}

function toggleSelectAllReady(source) {
    document.querySelectorAll(".readyCheckbox").forEach(cb => (cb.checked = source.checked));
}

function updateSelectAllReady() {
    const all = document.querySelectorAll(".readyCheckbox");
    const checked = document.querySelectorAll(".readyCheckbox:checked");
    const selectAll = document.getElementById("selectAllReady");
    if (selectAll) selectAll.checked = all.length > 0 && all.length === checked.length;
}

/* ---------------------------------------------------------
   Export (real .xlsx, notes with commas no longer break columns)
   --------------------------------------------------------- */

function exportReadyToExcel() {
    if (!requirePermission("exportData")) return;

    const orders = getReadyOrders();
    if (!orders.length) return showToast("No data to export", "error");

    let totalBoxes = 0;
    const rows = orders.map(o => {
        const boxes = Number(o.boxes || 0);
        totalBoxes += boxes;
        return {
            "Order": o.orderNo || "",
            "Boxes": boxes,
            "CBM": Number(o.cbm || 0),
            "Company": o.company || "",
            "Status": o.status === "checked" ? "Checked" : "Ready",
            "Note": o.emailOrComment || ""
        };
    });

    rows.push({ "Order": "TOTAL", "Boxes": totalBoxes, "CBM": "", "Company": "", "Status": "", "Note": "" });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Ready");
    XLSX.writeFile(wb, `Ready_To_Distribute_${todayLocalISO()}.xlsx`);
}

/* ---------------------------------------------------------
   Batch settings page
   --------------------------------------------------------- */

function showSettingsTab() {
    if (!requirePermission("manageSettings")) return;

    showOnlyTab("settingsTab");

    document.getElementById("settingsTab").innerHTML = `
    <div class="rtd-settings">
        <div class="rtd-settings-head">
            <h2>⚙️ Batch Settings</h2>
            <button class="btn btn-success" onclick="showReadyToDistributeTab()">← Back</button>
        </div>

        <select id="settingsBatchType" onchange="changeSettingsBatchType(this.value)">
            ${Object.keys(appSettings.batchTypes).map(type => `
                <option value="${escapeHtml(type)}" ${appSettings.selectedBatchType === type ? "selected" : ""}>${escapeHtml(type)}</option>
            `).join("")}
        </select>

        <div id="batchSettingsList">
            ${getCurrentBatchList().map((b, i) => `
            <div class="rtd-batch-row">
                <input value="${escapeHtml(b.name)}" onchange="updateBatchName(${i}, this.value)">
                <input type="time" value="${escapeHtml(b.from)}" onchange="updateBatchFrom(${i}, this.value)">
                <input type="time" value="${escapeHtml(b.to)}" onchange="updateBatchTo(${i}, this.value)">
                <button class="btn btn-danger" onclick="deleteBatch(${i})">❌</button>
            </div>`).join("")}
        </div>

        <button class="btn btn-primary" onclick="addBatch()">➕ Add Batch</button>
    </div>`;
}

function updateBatchName(i, v) { getCurrentBatchList()[i].name = v; saveSettings(); }
function updateBatchFrom(i, v) { getCurrentBatchList()[i].from = v; saveSettings(); }
function updateBatchTo(i, v)   { getCurrentBatchList()[i].to = v;   saveSettings(); }

function deleteBatch(i) {
    getCurrentBatchList().splice(i, 1);
    saveSettings();
    showSettingsTab();
}

function changeSettingsBatchType(type) {
    appSettings.selectedBatchType = type;
    saveSettings();
    showSettingsTab();
}

function addBatch() {
    getCurrentBatchList().push({ name: "New Batch", from: "00:00", to: "00:00" });
    saveSettings();
    showSettingsTab();
}

/* ---------------------------------------------------------
   One-time wiring
   --------------------------------------------------------- */

document.getElementById("readyEditModal")?.addEventListener("click", e => {
    if (e.target.id === "readyEditModal") e.target.classList.add("hidden");
});
