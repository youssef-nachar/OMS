let showOnlyReceived = false;
let refreshTimer = null;
let isRefreshing = false;
let showOnlyBacklog = false;
let firstLoad = true;
let showOnlyComments = false;
let dataCache = null;
let lastDataHash = "";
let isLoading = false;
let showOnlyPartial = false;
let selectedDateFilter = null;
let showOnlyDistributed = false;
let selectedWarehouseFilter = "";
let readyToReturnOrders = {};
let returnedOrders = new Set();
let returnedOrdersMap = {};
let localOrders = [];
let currentReportType = "";
let readyToReturnWarehouseFilter = "";
function cleanOrderKey(orderNo) {
    return orderNo.replace(/#/g, "");
}
function hashData(data) {
return JSON.stringify(
data
.slice()
.sort((a, b) => a.orderNo.localeCompare(b.orderNo))
.map(o => ({
orderNo: o.orderNo,
status: o.status,
wh: o.warehouses
.slice()
.sort((a, b) => a.base.localeCompare(b.base))
.map(w => w.base + w.packed + w.distributed)
}))
);
}

const loginContainer = document.getElementById("loginContainer");
const dashboard = document.getElementById("dashboard");
window.addEventListener('DOMContentLoaded', () => {
const orderDetails = document.getElementById("orderDetails");
if (orderDetails) {
orderDetails.addEventListener("click", (e) => {

if (e.target === orderDetails) {  
            orderDetails.classList.add("hidden");  
        }  
        const warehouse = localStorage.getItem("currentWarehouse");  

        let input = null;  

        // 🔵 Packing → البحث  
        if (warehouse === "Packing Station") {  
            input = document.getElementById("newOrderSearch");  
        }  

        // 🟢 باقي المستخدمين → إدخال الطلب  
        else {  
            input = document.getElementById("newOrderNumber");  
        }  

        if (!input) return;  

        input.addEventListener("blur", () => {  
const modal =
    document.getElementById(
        "editOrderModal"
    );

if (
    modal &&
    !modal.classList.contains("hidden")
) {
    return;
}

});
});
}
const loggedIn = localStorage.getItem("isLoggedIn");
const role = localStorage.getItem("userRole");

if (loggedIn === "true") {

// 🔥 إخفاء العناصر للـ manager
loginContainer.style.display = "none";
dashboard.classList.remove("hidden");

if (role === "manager") {
    document.getElementById("teamNotesBtn").style.display = "block";

    listenToOrders();
    listenToReturnedOrders();


document.getElementById("newOrderNumber")?.style.setProperty("display", "none");
document.getElementById("warehouseName")?.style.setProperty("display", "none");
document.getElementById("newWarehouseName")?.style.setProperty("display", "none");
document.getElementById("y")?.style.setProperty("display", "none");
document.getElementById("n")?.style.setProperty("display", "none");
document.getElementById("newOrderDate").style.display = "none";
document.getElementById("newOrderTab")?.classList.add("hidden");
} else {

document.querySelector(".kpis").style.display = "none";  
        document.querySelector(".warehouse-container").style.display = "none";  
        document.querySelector(".sales-order").style.display = "none";  

        showNewOrderTab();  

        const aside = document.querySelector("aside");  

        aside.innerHTML = `  
            <a href="#" onclick="signOut()" style="  
                width:100%;  
                padding:12px;  
                background:#ef4444;  
                border:none;  
                border-radius:8px;  
                color:white;  
                font-weight:600;  
                cursor:pointer;  
            ">  
                Logout  
            </a>  
        `;  
    }  
}

});

//   const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAeWlFZdvqQqrWCq0uJKqxz6boomvVuNal1IYM1tOuoeraNE_ZW2BfYYKr3lKfmldOWOgWAXhz88Ke/pub?output=csv";

let allOrders = [];
const distributionSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTecpCEwZ10-Ncz2y0xSsAnNdLXcWDGt_GiAeJlbWYhgg9B8zlhvJ1DeDH8H0NDSg/pub?output=csv";
let distributedOrders = new Set(); //

let distributedOrdersMap = {};

// const canceledSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTecpCEwZ10-Ncz2y0xSsAnNdLXcWDGt_GiAeJlbWYhgg9B8zlhvJ1DeDH8H0NDSg/pub?gid=508410365&single=true&output=csv";
let canceledOrdersSet = new Set();

async function loadCanceledOrders() {

const res = await fetch(canceledSheetURL + "&t=" + Date.now(), {  
    cache: "no-store"  
});  

const csv = await res.text();  
const parsed = Papa.parse(csv, { skipEmptyLines: true });  
const rows = parsed.data;  

if (!rows.length) return;  

const headers = rows.shift().map(h => h.toLowerCase().trim());  

const ORDER_COL = headers.indexOf("order #"); //  lowercase  

if (ORDER_COL === -1) {  
    console.warn("Canceled column not found", headers);  
    return;  
}  

let newSet = new Set();  

rows.forEach(r => {  
    const orderNo = r[ORDER_COL]?.trim().toUpperCase();  
    if (orderNo) newSet.add(orderNo);  
});  
canceledOrdersSet = newSet;  

allOrders.forEach(order => {  

    if (canceledOrdersSet.has(order.orderNo)) {  

        order.status = "canceled";  

    }  

});  

console.log("Canceled Orders Loaded:", canceledOrdersSet.size);

}

// LOGIN
loginForm.onsubmit = e => {
e.preventDefault();

const u = users.find(  
    x =>  
        x.username === username.value &&  
        x.password === password.value  
);  

if (!u) {  
    loginError.classList.remove("hidden");  
    return;  
}  

loginError.classList.add("hidden");  

if (u.warehouse === "Packing Station") {  
    autoMoveToPacking();  
}  

// =========================  
// SAVE SESSION  
// =========================  
localStorage.setItem("isLoggedIn", "true");  
localStorage.setItem("currentWarehouse", u.warehouse);  
localStorage.setItem("userWarehouse", u.warehouse);  
localStorage.setItem("userRole", u.role);  

// =========================  
// SWITCH UI  
// =========================  
loginContainer.classList.add("hidden");  
dashboard.classList.remove("hidden");  

// =========================  
// ELEMENTS  
// =========================  
const teamNotesBtn = document.getElementById("teamNotesBtn");  
const warehouseSwitcher = document.getElementById("warehouseSwitcher");  
const kpis = document.querySelector(".kpis");  
const warehouseContainer = document.querySelector(".warehouse-container");  
const salesOrder = document.querySelector(".sales-order");  

// =========================  
// RESET UI FIRST (IMPORTANT)  
// =========================  
if (teamNotesBtn) teamNotesBtn.classList.add("hidden");  
if (warehouseSwitcher) warehouseSwitcher.classList.add("hidden");  
if (kpis) kpis.classList.add("hidden");  
if (warehouseContainer) warehouseContainer.classList.add("hidden");  
if (salesOrder) salesOrder.classList.add("hidden");  

// =========================  
// MANAGER  
// =========================  
// =========================

// MANAGER
// =========================
if (u.role === "manager") {

// إظهار عناصر المدير فقط  
if (teamNotesBtn) teamNotesBtn.classList.remove("hidden");  
if (warehouseSwitcher) warehouseSwitcher.classList.remove("hidden");  
if (kpis) kpis.classList.remove("hidden");  
if (warehouseContainer) warehouseContainer.classList.remove("hidden");  
if (salesOrder) salesOrder.classList.remove("hidden");  

// 🔥 إخفاء واجهة إدخال الطلب  
const newOrderTab = document.getElementById("newOrderTab");  
if (newOrderTab) {  
    newOrderTab.classList.add("hidden");  
}

document.getElementById("y").style.display = "none";
document.getElementById("h").style.display = "none";
document.getElementById("n").style.display= "none";
document.getElementById("newOrderDate").style.display = "none";
// 🔥 إخفاء input الطلب
const newOrderInput = document.getElementById("newOrderNumber");
if (newOrderInput) {
newOrderInput.style.display = "none";
}

// 🔥 إخفاء اسم المستودع  
const warehouseName = document.getElementById("warehouseName");  
if (warehouseName) {  
    warehouseName.style.display = "none";  
}  

// 🔥 إخفاء newWarehouseName  
const newWarehouseName = document.getElementById("newWarehouseName");  

if (newWarehouseName) {  
    newWarehouseName.style.display = "none";  
}  

showDashboardHome();  
listenToOrders();  
    listenToReturnedOrders();

return;

}
// =========================
// NORMAL USER
// =========================
showNewOrderTab();

const aside = document.querySelector("aside");  

if (aside) {  
    aside.innerHTML = `  
        <button onclick="signOut()" style="  
            width:100%;  
            padding:12px;  
            background:#ef4444;  
            border:none;  
            border-radius:8px;  
            color:white;  
            font-weight:600;  
            cursor:pointer;  
        ">  
            Logout  
        </button>  
    `;  
}

};
function getWarehouseBadgeColor(order, warehouse) {
if (order.status === "returned") {
return "#dc2626";
}
if (
order.status === "canceled" ||
order.status === "canceled_before_delivery"
) {
return "#ef4444";
}

if (order.status === "distributed") {
return "#22c55e";
}

if (order.status === "ready_to_distribute") {
return "#3b82f6"; // 🔵 أزرق
}

if (order.status === "partial") {  
    return warehouse.packed ? "#22c55e" : "#f59e0b";  
}  

if (order.status === "completed") {  
    return "#16a34a";  
}  

return "#7c2d12";

}

let highestOrderCountSeen = 0;
let highestEffectiveDateSeen = null;

let lastKPI = {
total: 0,
completed: 0,
pending: 0,
distributed: 0,
ready: 0 // 🔥 جديد
};

//filteredOrders = Object.values(unique);

function renderWarehouseBreakdown(orders) {

const warehouseMap = {};  
const grandTotal = { t: 0, c: 0, p: 0, d: 0 };  

orders.forEach(order => {

const isDistributed = order.status === "distributed";
const isReady = order.status === "ready_to_distribute";
const seenWH = new Set();

order.warehouses.forEach(w => {  

        if (!w.base) return;  

        const base = w.base.trim().toLowerCase();  

        // منع التكرار داخل نفس الطلب  
        if (seenWH.has(base)) return;  
        seenWH.add(base);  

        // 🔥 هنا التعديل الأساسي  
        grandTotal.t++; // ✔ كل warehouse يُحسب  

        if (!warehouseMap[base]) {  
            warehouseMap[base] = { t: 0, c: 0, p: 0, d: 0 };  
        }  

        warehouseMap[base].t++;

if (isDistributed) {
warehouseMap[base].d++;
grandTotal.d++;
}
else if (isReady) {
// 🔥 إذا بدك تحسبه مع delivered أو تعمل column جديد
warehouseMap[base].d++; // أو تعمل ready column لاحقاً
grandTotal.d++;
}
else if (order.status === "completed") {
warehouseMap[base].c++;
grandTotal.c++;
}
else {
warehouseMap[base].p++;
grandTotal.p++;
}

});  

});  

warehouseBreakdownTable.innerHTML = `

<table>  
<tr>  
<th>Warehouse</th>  
<th>Total</th>  
<th>In-Packing</th>  
<th>Pending</th>  
<th>Delivered</th>  
</tr>  ${Object.entries(warehouseMap).map(([wh, v]) => {

if (!wh || !v) return "";  

    const safeWh = wh.replace(/'/g, "\\'");  

    return `

<tr>  
<td>${wh.toUpperCase()}</td>  
<td><a href="#" onclick="showWarehouseOrders('${safeWh}','total')">${v.t}</a></td>  
<td><a href="#" onclick="showWarehouseOrders('${safeWh}','completed')">${v.c}</a></td>  
<td><a href="#" onclick="showWarehouseOrders('${safeWh}','pending')">${v.p}</a></td>  
<td><a href="#" onclick="showWarehouseOrders('${safeWh}','distributed')">${v.d}</a></td>  
</tr>  
`;  }).join("")}

<tr style="font-weight:bold;background:#020617;color:#22c55e">  
<td>TOTAL</td>  
<td>${grandTotal.t}</td>  
<td>${grandTotal.c}</td>  
<td>${grandTotal.p}</td>  
<td>${grandTotal.d}</td>  
</tr>  </table>  
`;  
}  
function resetFilters() {  // 🔹 إلغاء Today Mode    
todayOnlyMode = false;  

const todayBtn = document.getElementById("todayToggleBtn");  
if (todayBtn) {  
    todayBtn.style.background = "#020617";  
    todayBtn.style.color = "white";  
    todayBtn.textContent = "Today Only";  
}  

// 🔹 إعادة التاريخ للقيمة الافتراضية    
const defaultStart = "2026-02-01";  // 01-Feb-2026    
const today = new Date().toISOString().slice(0, 10);  

dateFrom.value = defaultStart;  
dateTo.value = today;  

// 🔹 إعادة ترتيب الطلبات    
orderSortMode = "newest";  

// 🔹 تحديث الداشبورد    
updateDashboard();  
updateFooterStats();

}

function FiltersReset() {

// 🔹 إلغاء Today Mode    
todayOnlyMode = false;  

const todayBtn = document.getElementById("todayToggleBtn");  
if (todayBtn) {  
    todayBtn.style.background = "#020617";  
    todayBtn.style.color = "white";  
    todayBtn.textContent = "Today Only";  
}  

// 🔹 إعادة التاريخ للقيمة الافتراضية    
const defaultStart = "2026-02-01";  // 01-Feb-2026    
const today = new Date().toISOString().slice(0, 10);  

dateFrom.value = defaultStart;  
dateTo.value = today;  

// 🔹 إعادة ترتيب الطلبات    
orderSortMode = "newest";  

// 🔹 تحديث الداشبورد    
updateDashboard();  
updateFooterStats();

}
let lastDisplayedOrders = [];

// MULTI-WAREHOUSE ORDERS
function renderMultiWHOrders(orders) {
const m = orders.filter(x => (x.warehouses?.length || 0) > 1);
const completedOrders = m.filter(x => x.status === "completed");
const distributedOrders = m.filter(x =>
x.status === "distributed" ||
x.status === "ready_to_distribute"
);
const pendingOrders = m.filter(x => x.status === "pending" || x.status === "partial")
.filter(o => !completedOrders.includes(o) && !distributedOrders.includes(o));

multiWHTable.innerHTML = `

<table>    
<tr><th>Type</th><th>Orders</th></tr>    
<tr><td>Total</td><td><a href="#" onclick="showMultiWHOrders('total')">${m.length}</a></td></tr>    
<tr><td>In-Packing</td><td><a href="#" onclick="showMultiWHOrders('completed')">${completedOrders.length}</a></td></tr>    
<tr><td>Pending / partial</td>    
<td>    
<a href="#" onclick="showMultiWHOrders('pending')">    
${pendingOrders.length}</a>    
</td></tr>    
<tr><td>Distributed</td><td><a href="#" onclick="showMultiWHOrders('distributed')">${distributedOrders.length}</a></td></tr>    
</table>`;  
}  // SINGLE-WAREHOUSE ORDERS
function renderSingleWHOrders(orders) {
const s = orders.filter(x => x.warehouseCount === 1);
const completedOrders = s.filter(x => x.status === "completed");
const distributedOrders = s.filter(x =>
x.status === "distributed" ||
x.status === "ready_to_distribute"
);    const pendingOrders = s.filter(x => x.status === "pending")
.filter(o => !completedOrders.includes(o) && !distributedOrders.includes(o));

singleWHTable.innerHTML = `

<table>    
<tr><th>Type</th><th>Orders</th></tr>    
<tr><td>Total</td><td><a href="#" onclick="showSingleWHOrders('total')">${s.length}</a></td></tr>    
<tr><td>In-Packing</td><td><a href="#" onclick="showSingleWHOrders('completed')">${completedOrders.length}</a></td></tr>    
<tr>    
  <td>Pending</td>    
  <td>    
    <a href="#" onclick="showSingleWHOrders('pending')">    
      ${pendingOrders.length}    
    </a>    
  </td>    
</tr>    
<tr><td>Distributed</td><td><a href="#" onclick="showSingleWHOrders('distributed')">${distributedOrders.length}</a></td></tr>    
</table>`;  
}  // SHOW ORDER DETAILS
function showOrderDetails(type) {

const ACCUMULATE_FROM = "2026-02-02";  
const todayOrders = applyFilters();  

let todayFiltered = todayOrders;  

if (type === "canceled") {  

    const CANCELED_START_DATE = "2026-02-02";  

    todayFiltered = allOrders.filter(o => {  

        if (  
            o.status !== "canceled" &&  
            o.status !== "canceled_before_delivery"  
        ) return false;  

        const dateToCheck = getEffectiveDate(o);  
        if (!dateToCheck) return false;  

        return dateToCheck >= CANCELED_START_DATE;  
    });  
}

if (type === "returned") {
todayFiltered = todayOrders.filter(o =>
o.status === "returned"
);
}
if (type === "completed") {
todayFiltered = todayOrders.filter(o => o.status === "completed");
}

if (type === "pending") {  
    todayFiltered = todayOrders.filter(o =>  
        (o.status === "pending" || o.status === "partial")  
        && o.status !== "canceled"  
    );  
}  

if (type === "distributed") {  
    todayFiltered = todayOrders.filter(o => o.status === "distributed");  
}

if (type === "ready") {
todayFiltered = todayOrders.filter(o =>
o.status === "ready_to_distribute"
);
}
if (type === "total") {
todayFiltered = todayOrders;
}

let backlogOrders = [];  

if (type === "completed" || type === "pending") {  

    backlogOrders = allOrders.filter(o => {  

        const dateToCheck = getEffectiveDate(o);  

        if (!dateToCheck) return false;  
        if (dateToCheck < ACCUMULATE_FROM) return false;  
        if (todayFiltered.includes(o)) return false;  

        if (type === "completed") return o.status === "completed";  
        if (type === "pending") return o.status === "pending" || o.status === "partial";  

        return false;  
    });  
}  

lastTodayOrders = todayFiltered;  
lastBacklogOrders = backlogOrders;  
lastType = type;  

displayOrdersWithBacklog(todayFiltered, backlogOrders, type);

}

let lastTodayOrders = [];
let lastBacklogOrders = [];
let lastType = null;

function displayOrdersWithBacklog(todayOrders, backlogOrders, type) {

const orderList = document.getElementById("orderList");  

    function buildTable(orders) {  

        if (!orders.length) {  
            return `<p style="color:#9ca3af">No orders found.</p>`;  
        }  
        orders.sort((a, b) => {  

            const dateA =  
                a.status === "distributed"  
                    ? distributedOrdersMap[a.orderNo]?.date  
                    : a.date;  

            const dateB =  
                b.status === "distributed"  
                    ? distributedOrdersMap[b.orderNo]?.date  
                    : b.date;  

            return new Date(dateB) - new Date(dateA); // ⬅️ من الأقدم للأحدث  

        });  
        return `  
    <table>  
       <tr>  
<th>Order #</th>  
<th>Warehouses</th>  
<th>Status</th>  
<th>Comment</th>

</tr>  
            ${orders.map(order => {  let statusText =  
                order.status === "canceled" ? "Canceled" :  
                order.status === "distributed" ? "Distributed"  : order.status === "ready_to_distribute"  ? "Ready to Distribute" :  
                order.status === "completed" ? "In-Packing" :

order.status === "returned" ? "Returned" :
order.status === "partial" ? "Partial" : "Pending";

return `  
            <tr>  
                <td>${order.orderNo}</td>  
                <td>  
                    ${order.warehouses.map(w => {  

                const badgeColor = getWarehouseBadgeColor(order, w);  

                let tooltipText = "";  

                if (order.status === "distributed" || order.status === "ready_to_distribute") {  
tooltipText = `  
    Ready/Distributed at:   
    ${distributedOrdersMap[order.orderNo]?.date   
      || order.readyTime   
      || "-"}  
`;

}
else if (w.packed) {
tooltipText = `
    Received: ${w.receivedTime || "-"} <br>
    Packed: ${w.packingTime || "-"}
`;
}
else {
tooltipText = `Received in Warehouse: ${w.receivedTime || "-"}`;
}

return `  
    <div class="tooltip-wrapper">  
        <span style="  
            display:inline-block;  
            margin:2px;  
            padding:4px 8px;  
            border-radius:6px;  
            font-size:12px;  
            font-weight:600;  
            background:${badgeColor};  
            color:black;  
            cursor:pointer;  
        ">  
            ${w.base.toUpperCase()}  
        </span>  
        <div class="tooltip-box">  
            ${tooltipText}  
        </div>  
    </div>  
`;  
            }).join("")}  
                </td>  
                <td>${statusText}</td>  
                <td style="color:#38bdf8;font-size:12px">  
${order.comment ? `

<div style="  
    margin-top:5px;  
    color:#22c55e;  
    font-size:11px;  
">  
💬 ${order.comment}  
</div>  
` : ""}  
</td>  
                </tr>  
                `;  
            }).join("")}  
        </table>  
    `;  
        }  let html = `  
<div style="display:flex;gap:10px;margin-bottom:15px">  
    <button onclick="toggleBacklogView(false)" class="toggle-btn">  
        All  
    </button>  
    <button onclick="toggleBacklogView(true)" class="toggle-btn">  
        Show Only Backlog  
    </button>  
</div>

`;

if (!showOnlyBacklog) {  
        html += `  
    <h3 style="color:#22c55e;margin-bottom:10px">  
        Today Orders (${todayOrders.length})  
    </h3>  
    ${buildTable(todayOrders)}  
`;  
    }  

    if (backlogOrders.length) {  

        // 🔥 تجميع الطلبات حسب التاريخ الفعلي  
        const grouped = {};  

        backlogOrders.forEach(order => {  

            const dateKey = getEffectiveDate(order) || "No Date";  

            if (!grouped[dateKey]) {  
                grouped[dateKey] = [];  
            }  

            grouped[dateKey].push(order);  
        });  

        // ترتيب التواريخ من الأحدث للأقدم  
        const sortedDates = Object.keys(grouped)  
            .sort((a, b) => new Date(b) - new Date(a));  

        html += `  
    <h3 style="color:#f59e0b;margin:30px 0 10px 0">  
        Backlog Orders (${backlogOrders.length})  
    </h3>  
`;  

        sortedDates.forEach(date => {  

            html += `  
        <h4 style="  
            margin:20px 0 8px 0;  
            color:#eab308;  
            font-weight:600;  
            border-bottom:1px solid #1f2937;  
            padding-bottom:4px;  
        ">  
            📅 ${date}  
        </h4>  
    `;  

            html += buildTable(grouped[date]);  
        });  
    }  

    orderList.innerHTML = html;  

    document.getElementById("orderDetails").classList.remove("hidden");  
}  
function toggleBacklogView(value) {  
    showOnlyBacklog = value;  
    updateLastOrderDetailsView();  
}  
function updateLastOrderDetailsView() {  
    displayOrdersWithBacklog(lastTodayOrders, lastBacklogOrders, lastType);  
}  
// SHOW WAREHOUSE ORDERS    
function showWarehouseOrders(warehouse, type) {  
    let o = applyFilters();  

    if (warehouse !== 'all') {

o = o.filter(order =>
order.warehouses.some(w =>
normalizeWarehouse(w.base).base === normalizeWarehouse(warehouse).base
)
);
}

if (type === "completed") o = o.filter(x => x.status === "completed");  
    if (type === "pending") o = o.filter(x => x.status === "pending" || x.status === "partial");

if (type === "distributed") {
o = o.filter(x =>
x.status === "distributed" ||
x.status === "ready_to_distribute"
);
}
if (type === "total") o = o; // all filtered orders

displayOrders(o, warehouse === 'all' ? 'All Warehouses' : `Warehouse: ${warehouse}`);  
}

// SHOW MULTI/SINGLE-WAREHOUSE ORDERS
function showMultiWHOrders(type) {
let o = applyFilters().filter(x => x.warehouseCount > 1);
if (type === "completed") o = o.filter(x => x.status === "completed");
if (type === "pending") {
o = o.filter(x =>
x.status === "pending" || x.status === "partial"
);
} if (type === "distributed") o = o.filter(x => x.status === "distributed");
displayOrders(o, "Multi-Warehouse Orders");
}

function showSingleWHOrders(type) {
let o = applyFilters().filter(x => x.warehouseCount === 1);
if (type === "completed") o = o.filter(x => x.status === "completed");
if (type === "pending") o = o.filter(x => x.status === "pending");
if (type === "distributed") o = o.filter(x => x.status === "distributed");
displayOrders(o, "Single-Warehouse Orders");
}

const toggleToDateBtn = document.getElementById("toggleToDate");
const dateToInput = document.getElementById("dateTo");

// CLOSE MODAL

function normalizeWarehouse(name) {
if (!name) return { base: "", packed: false };

const raw = name.toLowerCase();  

const packed = /pack/.test(raw);  

const base = raw  
    .replace(/pack/gi, "")  
    .replace(/wh/gi, "")  
    .replace(/['’\s]/g, "")  
    .replace(/[-_]+/g, " ")  
    .replace(/\s+/g, " ")  
    .trim()  
    .toUpperCase();  
return { base, packed };

}
function signOut() {
clearInterval(refreshTimer);
refreshTimer = null;

localStorage.removeItem("isLoggedIn");  

localStorage.removeItem("currentWarehouse");  

location.reload();  
dashboard.classList.add("hidden");  
loginContainer.style.display = "flex";

}
document.addEventListener("mouseover", function (e) {

const row = e.target.closest(".order-row");  
if (!row) return;  

const tooltip = document.getElementById("tooltip");  

const status = row.dataset.status;  
const receivedWH = row.dataset.wh;  
const receivedPack = row.dataset.pack;  

let text = "";  

if (status === "pending" || status === "partial") {  
    text = "Received at WH: " + receivedWH;  
}  

if (status === "completed") {  
    text = "Received at Packing Station: " + receivedPack;  
}  

if (!text) return;  

tooltip.textContent = text;  
tooltip.classList.remove("hidden");

});

document.addEventListener("mousemove", function (e) {
const tooltip = document.getElementById("tooltip");
tooltip.style.top = (e.pageY + 15) + "px";
tooltip.style.left = (e.pageX + 15) + "px";
});

document.addEventListener("mouseout", function (e) {
if (e.target.closest(".order-row")) {
document.getElementById("tooltip").classList.add("hidden");
}
});

const newOrderInput = document.getElementById("newOrderNumber");

newOrderInput.addEventListener("input", function () {

const value = this.value.trim();  
const pattern = /^#m\d{5}$/i;  

const currentWarehouse = localStorage.getItem("currentWarehouse");  

// 🔵 إذا المستخدم Packing Station  
if (currentWarehouse === "Packing Station") {  

    // يعمل مثل search فقط  
    updateSearch();  

    // يبقي المؤشر داخل input  
    // setTimeout(() => {  
    //     this.focus();  
    // }, 0);  

    return;  
}  

// باقي المستخدمين يحفظ الطلب  
if (pattern.test(value)) {  

    if (this.dataset.saved === value) return;  

    this.dataset.saved = value;  

    saveNewOrder();  

    this.value = "";  

}

});

document.getElementById("newOrderSearch")
.addEventListener("input", function () {

const query = this.value.toLowerCase().trim();  
    const cards = document.querySelectorAll("#newOrdersList > div");  

    cards.forEach(card => {  

        const text = card.innerText.toLowerCase();  

        if (text.includes(query)) {  
            card.style.display = "flex";  
        } else {  
            card.style.display = "none";  
        }  

    });  
});

function getOrderWarehouse(orderNo) {

    const order = allOrders.find(
        o => o.orderNo.toUpperCase() === orderNo.toUpperCase()
    );

    if (!order) return "";

    return order.warehouses
        .filter(w =>
            w.base.toUpperCase() !== "PACKING STATION"
        )
        .map(w => w.base)
        .join(", ");
}

// إغلاق عند الضغط خارجها
document.addEventListener("click", function () {
const menu = document.getElementById("quickDateMenu");
if (menu) menu.style.display = "none";
});
document.addEventListener("click", () => {
const menu = document.getElementById("quickDateMenu");
if (menu) menu.style.display = "none";
});
function clearDateFilter() {
document.getElementById("dateFrom").value = "";
document.getElementById("dateTo").value = "";
DateFilter();
}

let lastDistributionHash = "";
let distributionCache = {};
function hashDistribution(dataMap) {
return JSON.stringify(
Object.keys(dataMap)
.sort()
.map(key => ({
orderNo: key,
date: dataMap[key].date,
company: dataMap[key].company
}))
);
}
function updateDashboard() {

for (const order of allOrders) {
    order.status = resolveOrderStatus(order);
}

allOrders.forEach(order => {

    if (returnedOrders.has(order.orderNo)) {
        order.status = "returned";
    }

});
const todayOrders = Array.isArray(applyFilters())
? applyFilters()
: Object.values(applyFilters() || {});
const ACCUMULATE_FROM = "2026-02-02";

const accumulatedOrders = allOrders.filter(o => {  
    const dateToCheck = getEffectiveDate(o);  
    if (!dateToCheck) return false;  
    return dateToCheck >= ACCUMULATE_FROM;  


    order.status = resolveOrderStatus(order); // الحالة الأصلية  

});  


// ================= TODAY =================  
const CANCELED_START_DATE = "2026-02-02";  

const canceledToday = allOrders.filter(o => {  

    if (  
        o.status !== "canceled" &&  
        o.status !== "canceled_before_delivery"  
    ) return false;  

    const dateToCheck = getEffectiveDate(o);  
    if (!dateToCheck) return false;  

    return dateToCheck >= CANCELED_START_DATE;  
});

const returnedToday = todayOrders.filter(o =>
o.status === "returned"
);
const distributedToday = todayOrders.filter(isDistributed);
const readyToday = todayOrders.filter(o =>
o.status === "ready_to_distribute"
);
const completedToday = todayOrders.filter(o => o.status === "completed");
const pendingToday = todayOrders.filter(o =>
(o.status === "pending" || o.status === "partial")
&& o.status !== "canceled"
);

// ================= BACKLOG =================  

const completedBacklog = accumulatedOrders.filter(o =>  
    o.status === "completed"  
);  

const pendingBacklog = accumulatedOrders.filter(o =>  
    o.status === "pending" || o.status === "partial"  
);

const distributedBacklog = accumulatedOrders.filter(o =>
o.status === "distributed"
);

const readyBacklog = accumulatedOrders.filter(o =>
o.status === "ready_to_distribute"
);
// ================= DISPLAY =================
updateKPINumber("returned", returnedToday.length);
updateKPINumber("total", todayOrders.length);
updateKPINumber("distributed", distributedToday.length);
updateKPINumber("ready", readyToday.length);
updateKPINumber("canceled", canceledToday.length);

updateKPIWithBacklog("completed", completedToday.length, completedBacklog.length);  
updateKPIWithBacklog("pending", pendingToday.length, pendingBacklog.length);  

renderWarehouseBreakdown(todayOrders);  
renderMultiWHOrders(todayOrders);  
renderSingleWHOrders(todayOrders);

}
function updateKPIWithBacklog(id, todayValue, backlogValue) {

const container = document.getElementById(id);  
const main = container.querySelector(".main-number");  
const sub = container.querySelector(".sub-number");  

main.textContent = todayValue;  

if (backlogValue > todayValue) {  
    const backlogOnly = backlogValue - todayValue;  
    sub.textContent = `(+${backlogOnly} backlog)`;  
} else {  
    sub.textContent = "";  
}

}

function updateKPINumber(id, newValue) {
if (lastKPI[id] === newValue) return;

lastKPI[id] = newValue;  
document.getElementById(id).textContent = newValue;  
const element = document.getElementById(id);  
const currentValue = lastKPI[id];  

// إذا زاد → فقط أضف الفرق  
if (newValue > currentValue) {  
    const diff = newValue - currentValue;  
    lastKPI[id] += diff;  
    element.textContent = lastKPI[id];  
    return;  
}  

// إذا نقص (تغيير فلتر مثلاً) → حدّث مباشرة  

element.textContent = newValue;

}
function showDistributedOrders() {

const from = dateFrom.value || null;  
const to = dateTo.value || null;  

const orders = allOrders.filter(o => {  

    const distData = distributedOrdersMap[o.orderNo];  

    if (!distData) return false;  

    const distDate = distData.date;  

    if (from && distDate < from) return false;  
    if (to && distDate > to) return false;  

    return true;  
});  

displayOrders(orders, "Distributed Orders");

}
function loadDistributedOrders() {

return fetch(distributionSheetURL + "&t=" + Date.now(), {  
    cache: "no-store"  
})  
    .then(r => r.text())  
    .then(csv => {  

        const parsed = Papa.parse(csv, { skipEmptyLines: true });  
        const rows = parsed.data;  

        if (!rows.length) return;  

        const headers = rows  
            .shift()  
            .map(h => h.toString().trim().toLowerCase());  

        const ORDER_COL = headers.indexOf("request number");  
        const DATE_COL = headers.indexOf("request registration date time");  
        const COMPANY_COL = headers.findIndex(h => h.includes("company"));  

        if (ORDER_COL === -1 || DATE_COL === -1) {  

            console.warn("❌ Distribution columns not found");  
            return;  
        }  

        let newMap = {};  

        rows.forEach(r => {  

            const orderNo =  
                r[ORDER_COL]?.trim().toUpperCase();  

            const rawDate = r[DATE_COL];  

            const company =  
                COMPANY_COL !== -1  
                    ? r[COMPANY_COL]?.trim()  
                    : "";  

            if (!orderNo || !rawDate) return;  

            const formattedDate =  
                formatDateForInput(rawDate);  

            if (!formattedDate) return;  

            newMap[orderNo] = {  

                date: formattedDate,  

                company: company || "LMD"  
            };  
        });  

        // ✅ دمج الطلبات الموزعة يدوياً من Firebase  
        allOrders.forEach(order => {  

            if (  
                order.status === "distributed" &&  
                order.distributedDate  
            ) {  

                // إذا غير موجود بالـ CSV  
                if (!newMap[order.orderNo]) {  

                    newMap[order.orderNo] = {  

                        date: order.distributedDate,  

                        company:  
                            order.company ||  
                            order.batch?.company ||  
                            "LMD"  
                    };  
                }  
            }  
        });  

        const newHash = hashDistribution(newMap);  

        // 🔥 BLOCK إذا رجعت نسخة قديمة  
        if (  
            lastDistributionHash &&  
            newHash === lastDistributionHash  
        ) {  
            return;  
        }  

        // 🔥 لو النسخة أقدم تجاهلها  
        if (  
            Object.keys(newMap).length <  
            Object.keys(distributionCache).length  
        ) {  

            console.warn(  
                "⚠️ Older distribution snapshot blocked"  
            );  

            return;  
        }  

        // ✅ اعتماد النسخة الجديدة  
        distributionCache = newMap;  

        distributedOrdersMap = newMap;  

        lastDistributionHash = newHash;  

        updateDashboard();  

        console.log(  
            "✅ Distribution updated safely"  
        );  
    })  
    .catch(err => {  

        console.error(  
            "Distribution load error:",  
            err  
        );  
    });

}

// function clearAllOrders() {

//     remove(ref(db, "orders"))
//         .then(() => {
//             // showToast("🗑️ All orders deleted");
//         })
//         .catch(err => {
//             console.error(err);
//         });

// }
function showReturnTab() {

document.getElementById("dashboardHeader")  
    .style.display = "none";  

document.getElementById("newOrderTab")  
    .classList.add("hidden");  

document.getElementById("teamNotesTab")  
    .classList.add("hidden");  

document.getElementById("readyTab")  
    .classList.add("hidden");  

// 🔥 إظهار return tab  
document.getElementById("returnTab")  
    .classList.remove("hidden");  

// 🔥 إخفاء الداشبورد  
document.querySelector(".kpis")  
    .classList.add("hidden");  

document.querySelector(".warehouse-container")  
    .classList.add("hidden");  

document.querySelector(".sales-order")  
    .classList.add("hidden");  

  
// 🔥 render مباشر  
renderReturnedOrders();  

// 🔥 focus على input  
setTimeout(() => {

    const input =
        document.getElementById("returnOrderInput");

    if (input) input.focus();

}, 200);

}
// ===============================
// AUTO ADD TO READY TO RETURN
// ===============================
document.getElementById("returnOrderInput")
.addEventListener("input", function () {

    const orderNo = this.value
        .trim()
        .toUpperCase();

    // لو الحقل فاضي
    if (!orderNo) return;

    const pattern = /^#?M\d{5}$/i;
    if (!pattern.test(orderNo)) return;

    const cleanOrderNo = orderNo.toUpperCase();

    const order = allOrders.find(o =>
        o.orderNo.toUpperCase() === cleanOrderNo
    );

    if (!order) {
        return;
    }

    // منع التكرار
    if (readyToReturnOrders[cleanOrderNo]) {
        this.value = "";
        return;
    }

    const warehouse = getOrderWarehouse(cleanOrderNo);

    // 🔥 إضافة مباشرة إلى Ready To Return
    readyToReturnOrders[cleanOrderNo] = {
        orderNo: cleanOrderNo,
        warehouse,
        date: new Date().toISOString().slice(0, 10)
    };

    saveReturnedOrders();

    renderReturnedOrders();
    updateDashboard();

    // تنظيف الحقل بعد الإدخال
    this.value = "";

});
function renderReturnedOrders() {

    const container =
        document.getElementById("returnedOrdersList");

    let orders = Object.keys(readyToReturnOrders);

    // استخراج المستودعات
    const warehouses = [
        ...new Set(
            orders
                .map(o => readyToReturnOrders[o]?.warehouse)
                .filter(Boolean)
        )
    ].sort();

    // تطبيق الفلتر
    if (readyToReturnWarehouseFilter) {
        orders = orders.filter(orderNo =>
            readyToReturnOrders[orderNo]?.warehouse
    ?.includes(readyToReturnWarehouseFilter)
        );
    }
    if (!orders.length) {

        container.innerHTML =
            "<p>No Ready To Return Orders</p>";

        return;
    }

    container.innerHTML = `

<div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:20px;
    gap:15px;
    flex-wrap:wrap;
">

    <div style="
        display:flex;
        align-items:center;
        gap:10px;
    ">
        <span style="
            color:#94a3b8;
            font-weight:600;
            font-size:14px;
        ">
            Filter Warehouse
        </span>

        <select
            onchange="filterReadyToReturnWarehouse(this.value)"
            style="
                background:#0f172a;
                color:white;
                border:1px solid #334155;
                padding:10px 14px;
                border-radius:10px;
                min-width:220px;
                font-size:14px;
                outline:none;
            "
        >
            <option value="">
                All Warehouses
            </option>

            ${warehouses.map(wh => `
                <option
                    value="${wh}"
                    ${readyToReturnWarehouseFilter === wh ? "selected" : ""}
                >
                    ${wh}
                </option>
            `).join("")}
        </select>
    </div>

    <div style="
        background:#1e293b;
        color:#22c55e;
        padding:10px 16px;
        border-radius:10px;
        font-weight:700;
        font-size:14px;
    ">
        ${orders.length} Orders
    </div>

</div>

<div style="
    overflow:auto;
    border-radius:14px;
    border:1px solid #1e293b;
">

<table style="
    width:100%;
    border-collapse:collapse;
">

<tr style="
    background:#020617;
    position:sticky;
    top:0;
">
    <th style="padding:14px">✓</th>
    <th style="padding:14px">Order</th>
    <th style="padding:14px">Warehouse</th>
    <th style="padding:14px">Date</th>
    <th style="padding:14px">Status</th>
    <th style="padding:14px">Edit</th>
</tr>

${orders.map(orderNo => {

    const data = readyToReturnOrders[orderNo];

    return `

    <tr
        style="
            border-bottom:1px solid #1e293b;
            transition:.2s;
        "
        onmouseover="this.style.background='#111827'"
        onmouseout="this.style.background='transparent'"
    >

        <td style="text-align:center;padding:12px">
            <input
                type="checkbox"
                class="return-checkbox"
                value="${orderNo}"
                style="
                    width:18px;
                    height:18px;
                    cursor:pointer;
                "
            >
        </td>

        <td style="
            padding:12px;
            font-weight:700;
            color:#38bdf8;
        ">
            ${orderNo}
        </td>

        <td style="padding:12px">

            <span style="
                background:#1e293b;
                color:#e2e8f0;
                padding:6px 10px;
                border-radius:999px;
                font-size:12px;
                font-weight:600;
            ">
                ${data.warehouse}
            </span>

        </td>

        <td style="
            padding:12px;
            color:#94a3b8;
        ">
            ${data.date}
        </td>

        <td style="padding:12px">

            <span style="
                background:linear-gradient(
                    135deg,
                    #f59e0b,
                    #ea580c
                );
                color:white;
                padding:6px 12px;
                border-radius:999px;
                font-size:12px;
                font-weight:700;
                box-shadow:0 0 10px rgba(245,158,11,.3);
            ">
                Ready To Return
            </span>

        </td>

        <td style="padding:12px">

            <button
                onclick="editReadyToReturnOrder('${orderNo}')"
                style="
                    background:linear-gradient(
                        135deg,
                        #2563eb,
                        #3b82f6
                    );
                    color:white;
                    border:none;
                    padding:8px 14px;
                    border-radius:8px;
                    cursor:pointer;
                    font-weight:600;
                "
            >
                ✏️ Edit
            </button>

        </td>

    </tr>

    `;
}).join("")}

</table>

</div>

<div style="margin-top:15px; display:flex; gap:10px">

    <button
        onclick="selectAllReturnOrders()"
        style="
            background:#22c55e;
            color:white;
            border:none;
            padding:10px 15px;
            border-radius:8px;
            cursor:pointer;
        "
    >
        Select All
    </button>

    <button
        onclick="clearAllReturnSelection()"
        style="
            background:#6b7280;
            color:white;
            border:none;
            padding:10px 15px;
            border-radius:8px;
            cursor:pointer;
        "
    >
        Clear
    </button>

    <button
        onclick="confirmReturnOrders()"
        style="
            background:#dc2626;
            color:white;
            border:none;
            padding:10px 20px;
            border-radius:8px;
            cursor:pointer;
        "
    >
        Return Selected
    </button>

</div>

`;
}
function selectAllReturnOrders() {
    document.querySelectorAll(".return-checkbox")
        .forEach(cb => cb.checked = true);
}

function clearAllReturnSelection() {
    document.querySelectorAll(".return-checkbox")
        .forEach(cb => cb.checked = false);
}
function filterReadyToReturnWarehouse(warehouse) {

    readyToReturnWarehouseFilter = warehouse;

    renderReturnedOrders();
}
function editReadyToReturnOrder(oldOrderNo) {

    const newOrderNo = prompt(
        "Enter Correct Order Number",
        oldOrderNo
    );

    if (!newOrderNo) return;

    const cleanNewOrder =
        newOrderNo.trim().toUpperCase();

    if (readyToReturnOrders[cleanNewOrder]) {
        alert("Order already exists");
        return;
    }

    // جلب الطلب الجديد من النظام
    const order = allOrders.find(
        o => o.orderNo.toUpperCase() === cleanNewOrder
    );

    if (!order) {
        alert("Order not found");
        return;
    }

    // تحديد المستودع الصحيح للطلب الجديد
    const warehouse =
        getOrderWarehouse(cleanNewOrder);

    const oldData =
        readyToReturnOrders[oldOrderNo];

    delete readyToReturnOrders[oldOrderNo];

    readyToReturnOrders[cleanNewOrder] = {
        orderNo: cleanNewOrder,
        warehouse: warehouse,
        date: oldData.date
    };

    saveReturnedOrders();

    renderReturnedOrders();

    alert("Order Updated Successfully");
}
function confirmReturnOrders() {

    const selected = [
        ...document.querySelectorAll(
            ".return-checkbox:checked"
        )
    ];

    if (!selected.length) {

        alert("Select orders first");
        return;
    }

    selected.forEach(cb => {

        const orderNo = cb.value;

        const data =
            readyToReturnOrders[orderNo];

        returnedOrders.add(orderNo);

returnedOrdersMap[orderNo] = {

    orderNo,

    ...data,

    returnedDate:
        new Date()
        .toISOString()
        .slice(0,10)
};
        const order = allOrders.find(
            o => o.orderNo === orderNo
        );

        if (order) {
            order.status = "returned";
        }

        delete readyToReturnOrders[orderNo];
    });

    saveReturnedOrders();

    updateDashboard();

    renderReturnedOrders();

    alert("Orders Returned Successfully");
}
// const savedReturnedOrders =
// JSON.parse(
// localStorage.getItem("returnedOrders") || "[]"
// );

// returnedOrders = new Set(savedReturnedOrders);

// returnedOrdersMap =
// JSON.parse(
// localStorage.getItem("returnedOrdersMap") || "{}"
// );
// readyToReturnOrders =
// JSON.parse(
//     localStorage.getItem(
//         "readyToReturnOrders"
//     ) || "{}"
// );
function listenToReturnedOrders() {

    onValue(ref(db, "returnedOrders"), snapshot => {

        const data = snapshot.val();

        if (!data) {
            returnedOrders = new Set();
            returnedOrdersMap = {};
            readyToReturnOrders = {};
            return;
        }

        returnedOrders =
            new Set(data.returnedOrders || []);

returnedOrdersMap = {};

Object.values(
    data.returnedOrdersMap || {}
).forEach(item => {

    if (!item.orderNo) return;

    returnedOrdersMap[item.orderNo] = item;
});
readyToReturnOrders = {};

Object.values(
    data.readyToReturnOrders || {}
).forEach(item => {

    if (!item.orderNo) return;

    readyToReturnOrders[item.orderNo] = item;
});
        updateDashboard();
        renderReturnedOrders();

        console.log("✅ Returned Orders Synced");
    });
}
function saveReturnedOrders() {

    const safeReady = {};
    const safeReturnedMap = {};

    Object.keys(readyToReturnOrders).forEach(key => {

        const safeKey = cleanOrderKey(key);

        safeReady[safeKey] =
            readyToReturnOrders[key];
    });

    Object.keys(returnedOrdersMap).forEach(key => {

        const safeKey = cleanOrderKey(key);

        safeReturnedMap[safeKey] =
            returnedOrdersMap[key];
    });

    update(ref(db, "returnedOrders"), {

        readyToReturnOrders: safeReady,

        returnedOrders: [...returnedOrders],

        returnedOrdersMap: safeReturnedMap

    })
    .then(() => {

        console.log(
            "✅ Returned Orders Saved"
        );

    })
    .catch(err => {

        console.error(
            "❌ Save Error",
            err
        );

    });
}

function toggleWarehouseMenu(event) {

event.preventDefault();  

const menu =  
    document.getElementById("warehouseMenu");  

menu.classList.toggle("hidden");

}

function loginAsWarehouse(warehouseName) {

const user = users.find(  
    u => u.warehouse === warehouseName  
);  

if (!user) {  
    alert("Warehouse user not found");  
    return;  
}  

// حفظ بيانات الدخول  
localStorage.setItem("isLoggedIn", "true");  
localStorage.setItem("currentWarehouse", user.warehouse);  
localStorage.setItem("userWarehouse", user.warehouse);  
localStorage.setItem("userRole", user.role);  

// إعادة تحميل الصفحة  
location.reload();

}
