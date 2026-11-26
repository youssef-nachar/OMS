/* =========================================================
   returntab.js  —  Returns (Ready To Return → Returned)

   Data model (one consistent shape, per ORDER + WAREHOUSE):

     readyToReturnOrders[orderNo] = {
         orderNo, warehouse: "PHARMA, RETAIL", date, comment, addedBy
     }

     returnedOrdersMap["#M12345_PHARMA"] = {
         orderNo, warehouse, returnedDate, returnedAt, comment, by
     }

     returnedOrders = Set of returnKey(orderNo, warehouse)

   Firebase  (each record is written on its own path, so two users
   can no longer overwrite each other's whole list):
     returnedOrders/readyToReturnOrders/{orderKey}
     returnedOrders/returnedOrdersMap/{orderKey}_{warehouseKey}

   An order becomes "returned" only when EVERY warehouse of the order
   was returned (see resolveOrderStatus). Returning one warehouse used
   to mark the whole order as returned.
   ========================================================= */

let editingReturnOrder = null;
let returnsListenerStarted = false;

/* ---------------------------------------------------------
   Keys / helpers
   --------------------------------------------------------- */

function returnKey(orderNo, warehouse) {
    return `${String(orderNo || "").trim().toUpperCase()}_${normalizeWarehouseName(warehouse)}`;
}

function isWarehouseReturned(orderNo, warehouse) {
    return returnedOrders.has(returnKey(orderNo, warehouse));
}

function returnDbKey(orderNo) {
    return firebaseSafeKey(orderNo);
}

function returnedDbKey(orderNo, warehouse) {
    return `${firebaseSafeKey(orderNo)}_${firebaseSafeKey(normalizeWarehouseName(warehouse))}`;
}

function splitWarehouses(text) {
    return String(text || "")
        .split(",")
        .map(w => w.trim())
        .filter(Boolean);
}

function findOrderByNumber(orderNo) {
    const wanted = normalizeOrderNo(orderNo);
    return allOrders.find(o => normalizeOrderNo(o.orderNo) === wanted);
}

/** Warehouses of an order that physically hold goods (packing station excluded). */
function getReturnableWarehouses(order) {
    return (order?.warehouses || [])
        .map(w => w.base)
        .filter(base => normalizeWarehouseName(base) !== "PACKING STATION");
}

/* ---------------------------------------------------------
   Persistence
   --------------------------------------------------------- */

function persistReadyRecord(orderNo) {
    const path = `returnedOrders/readyToReturnOrders/${returnDbKey(orderNo)}`;
    const record = readyToReturnOrders[orderNo];

    const op = record
        ? update(ref(db, path), record)
        : remove(ref(db, path));

    return op.catch(err => {
        console.error("Returns save error:", err);
        showToast("Could not save the change. Check your connection.", "error");
    });
}

function persistReturnedRecord(key) {
    const record = returnedOrdersMap[key];
    const path = `returnedOrders/returnedOrdersMap/${returnedDbKey(record.orderNo, record.warehouse)}`;
    return update(ref(db, path), record);
}

/** Kept for older callers. Writes everything that is currently in memory. */
function saveReturnedOrders() {
    Object.keys(readyToReturnOrders).forEach(persistReadyRecord);
}

/* ---------------------------------------------------------
   Live sync
   --------------------------------------------------------- */

function listenToReturnedOrders() {
    if (returnsListenerStarted) return;
    returnsListenerStarted = true;

    onValue(ref(db, "returnedOrders"), snapshot => {
        const data = snapshot.val() || {};

        const nextReady = {};
        Object.values(data.readyToReturnOrders || {}).forEach(item => {
            if (!item?.orderNo) return;
            nextReady[item.orderNo] = item;
        });

        const nextMap = {};
        const nextSet = new Set();
        Object.values(data.returnedOrdersMap || {}).forEach(item => {
            if (!item?.orderNo || !item?.warehouse) return;
            const key = returnKey(item.orderNo, item.warehouse);
            nextMap[key] = item;
            nextSet.add(key);
        });

        readyToReturnOrders = nextReady;
        returnedOrdersMap = nextMap;
        returnedOrders = nextSet;

        updateDashboard();
        renderReturnedOrders();
    });
}

/* ---------------------------------------------------------
   Navigation + input
   --------------------------------------------------------- */

function showReturnTab() {
    showOnlyTab("returnTab");
    renderReturnedOrders();
    setTimeout(() => document.getElementById("returnOrderInput")?.focus(), 150);
}

function initReturnTab() {
    const input = document.getElementById("returnOrderInput");
    if (!input || input.dataset.bound) return;
    input.dataset.bound = "1";

    // scanner / quick typing: add as soon as a complete order number is there
    input.addEventListener("input", () => {
        if (isOrderNoPattern(input.value)) handleReturnInput(input);
    });

    // typed manually: Enter
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleReturnInput(input);
        }
    });
}

function handleReturnInput(input) {
    const value = input.value.trim();
    if (!value) return;

    if (addToReadyToReturn(value)) input.value = "";
    else input.select();
}

/** Adds every not-yet-returned warehouse of the order. Returns true on success. */
function addToReadyToReturn(rawOrderNo) {
    if (!requirePermission("manageReturns")) return false;

    const orderNo = normalizeOrderNo(rawOrderNo);
    const order = findOrderByNumber(orderNo);

    if (!order) {
        showToast(`Order ${orderNo} was not found`, "error");
        return false;
    }

    const existing = readyToReturnOrders[order.orderNo];
    const alreadyReady = splitWarehouses(existing?.warehouse);

    const candidates = getReturnableWarehouses(order).filter(wh =>
        !isWarehouseReturned(order.orderNo, wh) &&
        !alreadyReady.some(x => normalizeWarehouseName(x) === normalizeWarehouseName(wh))
    );

    if (!candidates.length) {
        const why = alreadyReady.length ? "is already in the Ready To Return list" : "was already fully returned";
        showToast(`Order ${order.orderNo} ${why}`, "error");
        return false;
    }

    readyToReturnOrders[order.orderNo] = {
        ...(existing || {}),
        orderNo: order.orderNo,
        warehouse: [...alreadyReady, ...candidates].join(", "),
        date: existing?.date || todayLocalISO(),
        comment: existing?.comment || "",
        addedBy: existing?.addedBy || currentActor()
    };

    persistReadyRecord(order.orderNo);
    renderReturnedOrders();
    updateDashboard();
    showToast(`${order.orderNo} added`, "success");
    return true;
}

/* ---------------------------------------------------------
   Rendering
   --------------------------------------------------------- */

function buildReturnRows() {
    const rows = [];

    Object.keys(readyToReturnOrders).forEach(orderNo => {
        const data = readyToReturnOrders[orderNo];
        splitWarehouses(data.warehouse).forEach(warehouse => {
            rows.push({ orderNo, warehouse, data });
        });
    });

    if (readyToReturnWarehouseFilter) {
        const wanted = normalizeWarehouseName(readyToReturnWarehouseFilter);
        return rows.filter(r => normalizeWarehouseName(r.warehouse) === wanted);
    }
    return rows;
}

function renderReturnedOrders() {
    const container = document.getElementById("returnedOrdersList");
    if (!container) return;

    const rows = buildReturnRows();
    const canManage = can("manageReturns");

    const history = Object.values(returnedOrdersMap)
        .sort((a, b) => String(b.returnedAt || b.returnedDate).localeCompare(String(a.returnedAt || a.returnedDate)))
        .slice(0, 50);

    container.innerHTML = `
    <div class="ret-toolbar">
        <label class="ret-filter">
            <span>Filter warehouse</span>
            <select onchange="filterReadyToReturnWarehouse(this.value)">
                <option value="">All Warehouses</option>
                ${WAREHOUSES.map(wh => `
                    <option value="${escapeHtml(wh)}" ${readyToReturnWarehouseFilter === wh ? "selected" : ""}>${escapeHtml(wh)}</option>
                `).join("")}
            </select>
        </label>
        <div class="ret-count">${rows.length} Orders</div>
    </div>

    <div class="ret-table-wrap">
        <table class="ret-table">
            <thead>
                <tr>
                    <th>✓</th><th>Order</th><th>Warehouse</th><th>Date</th>
                    <th>Status</th><th>Comment</th><th>Edit</th><th>Remove</th>
                </tr>
            </thead>
            <tbody>
                ${rows.length === 0
                    ? `<tr><td colspan="8" class="ret-empty">No Ready To Return Orders</td></tr>`
                    : rows.map(r => `
                    <tr>
                        <td><input type="checkbox" class="return-checkbox"
                            data-order="${escapeHtml(r.orderNo)}" data-wh="${escapeHtml(r.warehouse)}"></td>
                        <td class="ret-order">${escapeHtml(r.orderNo)}</td>
                        <td>${escapeHtml(r.warehouse)}</td>
                        <td class="muted">${escapeHtml(r.data.date || "-")}</td>
                        <td><span class="ret-badge">Ready To Return</span></td>
                        <td class="ret-comment">${escapeHtml(r.data.comment || "-")}</td>
                        <td><button class="btn btn-ghost" ${canManage ? "" : "disabled"}
                            onclick="editReadyToReturnOrder('${escapeJsAttr(r.orderNo)}')">✏️ Edit</button></td>
                        <td><button class="btn btn-ghost" ${canManage ? "" : "disabled"}
                            onclick="removeWarehouseFromReadyToReturn('${escapeJsAttr(r.orderNo)}','${escapeJsAttr(r.warehouse)}')">🗑 Remove</button></td>
                    </tr>`).join("")}
            </tbody>
        </table>
    </div>

    <div class="ret-actions">
        <button class="btn btn-success" onclick="selectAllReturnOrders()">Select All</button>
        <button class="btn btn-muted" onclick="clearAllReturnSelection()">Clear</button>
        ${canManage ? `<button class="btn btn-danger" onclick="confirmReturnOrders()">Return Selected</button>` : ""}
        ${can("exportData") ? `<button class="btn btn-success" onclick="exportSelectedReadyToReturn()">Export To Excel</button>` : ""}
        ${canManage ? `<button class="btn btn-danger-dark" onclick="removeSelectedReadyToReturn()">Remove Selected</button>` : ""}
    </div>

    ${history.length ? `
    <details class="ret-history">
        <summary>Recently returned (${history.length})</summary>
        <table class="ret-table">
            <thead><tr><th>Order</th><th>Warehouse</th><th>Returned</th><th>By</th><th>Comment</th><th></th></tr></thead>
            <tbody>
                ${history.map(h => `
                <tr>
                    <td class="ret-order">${escapeHtml(h.orderNo)}</td>
                    <td>${escapeHtml(h.warehouse)}</td>
                    <td class="muted">${escapeHtml(h.returnedDate || "-")}</td>
                    <td class="muted">${escapeHtml(h.by || "-")}</td>
                    <td>${escapeHtml(h.comment || "-")}</td>
                    <td>${canManage ? `<button class="btn btn-ghost"
                        onclick="undoReturn('${escapeJsAttr(h.orderNo)}','${escapeJsAttr(h.warehouse)}')">↩ Undo</button>` : ""}</td>
                </tr>`).join("")}
            </tbody>
        </table>
    </details>` : ""}
    `;
}

function filterReadyToReturnWarehouse(warehouse) {
    readyToReturnWarehouseFilter = warehouse;
    renderReturnedOrders();
}

/* ---------------------------------------------------------
   Selection
   --------------------------------------------------------- */

function getSelectedReturnItems() {
    return [...document.querySelectorAll(".return-checkbox:checked")].map(cb => ({
        orderNo: cb.dataset.order,
        warehouse: cb.dataset.wh
    }));
}

function selectAllReturnOrders() {
    document.querySelectorAll(".return-checkbox").forEach(cb => (cb.checked = true));
}

function clearAllReturnSelection() {
    document.querySelectorAll(".return-checkbox").forEach(cb => (cb.checked = false));
}

/* ---------------------------------------------------------
   Remove from the ready list
   --------------------------------------------------------- */

function dropWarehouseFromReady(orderNo, warehouse) {
    const data = readyToReturnOrders[orderNo];
    if (!data) return;

    const left = splitWarehouses(data.warehouse).filter(
        w => normalizeWarehouseName(w) !== normalizeWarehouseName(warehouse)
    );

    if (left.length) readyToReturnOrders[orderNo] = { ...data, warehouse: left.join(", ") };
    else delete readyToReturnOrders[orderNo];
}

function removeWarehouseFromReadyToReturn(orderNo, warehouse) {
    if (!requirePermission("manageReturns")) return;

    dropWarehouseFromReady(orderNo, warehouse);
    persistReadyRecord(orderNo);
    renderReturnedOrders();
    updateDashboard();
}

async function removeSelectedReadyToReturn() {
    if (!requirePermission("manageReturns")) return;

    const selected = getSelectedReturnItems();
    if (!selected.length) return showToast("Select orders first", "error");
    if (!(await confirmDialog(`Remove ${selected.length} orders from Ready To Return?`, { title: "Remove orders", okText: "Remove", danger: true }))) return;

    const touched = new Set();
    selected.forEach(({ orderNo, warehouse }) => {
        dropWarehouseFromReady(orderNo, warehouse);
        touched.add(orderNo);
    });

    touched.forEach(persistReadyRecord);
    renderReturnedOrders();
    updateDashboard();
}

/* ---------------------------------------------------------
   Edit comment / order number
   --------------------------------------------------------- */

function editReadyToReturnOrder(orderNo) {
    if (!requirePermission("manageReturns")) return;

    editingReturnOrder = orderNo;
    const data = readyToReturnOrders[orderNo];
    if (!data) return;

    document.getElementById("editReturnOrderNo").value = data.orderNo;
    document.getElementById("editReturnComment").value = data.comment || "";
    document.getElementById("editReturnModal").classList.remove("hidden");
}

function closeEditReturnModal() {
    document.getElementById("editReturnModal").classList.add("hidden");
    editingReturnOrder = null;
}

function saveEditReturnOrder() {
    if (!requirePermission("manageReturns")) return;

    const oldNo = editingReturnOrder;
    const oldData = readyToReturnOrders[oldNo];
    if (!oldData) return closeEditReturnModal();

    const newNo = normalizeOrderNo(document.getElementById("editReturnOrderNo").value);
    const comment = document.getElementById("editReturnComment").value.trim();

    let warehouse = oldData.warehouse;
    let finalNo = oldData.orderNo;

    if (normalizeOrderNo(oldNo) !== newNo) {
        const order = findOrderByNumber(newNo);
        if (!order) return showToast(`Order ${newNo} was not found`, "error");
        if (readyToReturnOrders[order.orderNo]) {
            return showToast(`Order ${order.orderNo} is already in the list`, "error");
        }

        warehouse = getReturnableWarehouses(order)
            .filter(wh => !isWarehouseReturned(order.orderNo, wh))
            .join(", ");

        if (!warehouse) return showToast(`Order ${order.orderNo} was already fully returned`, "error");

        finalNo = order.orderNo;
        delete readyToReturnOrders[oldNo];
        persistReadyRecord(oldNo);
    }

    readyToReturnOrders[finalNo] = { ...oldData, orderNo: finalNo, warehouse, comment };

    persistReadyRecord(finalNo);
    renderReturnedOrders();
    updateDashboard();
    closeEditReturnModal();
}

/* ---------------------------------------------------------
   Return (confirm → execute)
   --------------------------------------------------------- */

function confirmReturnOrders() {
    if (!requirePermission("manageReturns")) return;

    const selected = getSelectedReturnItems();
    if (!selected.length) return showToast("Select orders first", "error");

    pendingReturnOrders = selected;

    document.getElementById("returnConfirmText").innerHTML =
        `You are about to mark <b style="color:#22c55e">${selected.length}</b> order(s) as Returned.<br>`;

    document.getElementById("returnConfirmModal").classList.remove("hidden");
}

function closeReturnConfirmModal() {
    document.getElementById("returnConfirmModal").classList.add("hidden");
    pendingReturnOrders = [];
}

async function executeReturnOrders() {
    if (!requirePermission("manageReturns")) return;

    const items = [...pendingReturnOrders];
    if (!items.length) return closeReturnConfirmModal();

    const writes = [];
    const touched = new Set();
    let done = 0;

    items.forEach(({ orderNo, warehouse }) => {
        const ready = readyToReturnOrders[orderNo];
        if (!ready) return;                                         // someone else already handled it

        const key = returnKey(orderNo, warehouse);
        returnedOrdersMap[key] = {
            orderNo,
            warehouse,
            returnedDate: todayLocalISO(),
            returnedAt: new Date().toISOString(),
            comment: ready.comment || "",
            by: currentActor()
        };
        returnedOrders.add(key);
        writes.push(persistReturnedRecord(key));

        dropWarehouseFromReady(orderNo, warehouse);
        touched.add(orderNo);
        done++;
    });

    touched.forEach(orderNo => writes.push(persistReadyRecord(orderNo)));

    try {
        await Promise.all(writes);
    } catch (err) {
        console.error(err);
        showToast("Some returns could not be saved", "error");
    }

    updateDashboard();                                              // status is derived, never forced
    renderReturnedOrders();
    closeReturnConfirmModal();
    showToast(`${done} order(s) returned`, "success");
}

async function undoReturn(orderNo, warehouse) {
    if (!requirePermission("manageReturns")) return;
    if (!(await confirmDialog(`Undo the return of ${orderNo} (${warehouse})?`, { title: "Undo return", okText: "Undo", danger: true }))) return;

    const key = returnKey(orderNo, warehouse);
    const record = returnedOrdersMap[key];
    if (!record) return;

    delete returnedOrdersMap[key];
    returnedOrders.delete(key);

    await remove(ref(db, `returnedOrders/returnedOrdersMap/${returnedDbKey(orderNo, warehouse)}`));

    updateDashboard();
    renderReturnedOrders();
    showToast("Return undone", "success");
}

/* ---------------------------------------------------------
   Export
   --------------------------------------------------------- */

function exportSelectedReadyToReturn() {
    if (!requirePermission("exportData")) return;

    const selected = getSelectedReturnItems();
    if (!selected.length) return showToast("Select orders first", "error");

    const data = selected.map(({ orderNo, warehouse }) => {
        const rec = readyToReturnOrders[orderNo] || {};
        return {
            "Order No": orderNo,
            "Warehouse": warehouse,
            "Date": rec.date || "",
            "Comment": rec.comment || "",
            "Status": "Ready To Return"
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ready To Return");
    XLSX.writeFile(workbook, `Ready_To_Return_${todayLocalISO()}.xlsx`);
}
