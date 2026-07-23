// Disable Right Click
document.addEventListener("contextmenu", e => e.preventDefault());

// Disable common DevTools shortcuts
document.addEventListener("keydown", function (e) {

    // F12
    if (e.key === "F12") {
        e.preventDefault();
        return false;
    }

    // Ctrl+Shift+I / J / C
    if (
        e.ctrlKey &&
        e.shiftKey &&
        ["I", "J", "C"].includes(e.key.toUpperCase())
    ) {
        e.preventDefault();
        return false;
    }

    // Ctrl+U
    if (e.ctrlKey && e.key.toUpperCase() === "U") {
        e.preventDefault();
        return false;
    }

    // Ctrl+S
    if (e.ctrlKey && e.key.toUpperCase() === "S") {
        e.preventDefault();
        return false;
    }

    // Ctrl+Shift+K (Firefox)
    if (
        e.ctrlKey &&
        e.shiftKey &&
        e.key.toUpperCase() === "K"
    ) {
        e.preventDefault();
        return false;
    }
});

(function () {

    let opened = false;

    setInterval(() => {

        const widthThreshold =
            window.outerWidth - window.innerWidth > 160;

        const heightThreshold =
            window.outerHeight - window.innerHeight > 160;

        if (widthThreshold || heightThreshold) {

            if (!opened) {

                opened = true;

                document.body.innerHTML = `
                    <div style="
                        display:flex;
                        justify-content:center;
                        align-items:center;
                        height:100vh;
                        background:#020617;
                        color:white;
                        font-size:28px;
                        font-family:Arial;
                        text-align:center;
                    ">
                        Security Violation Detected
                    </div>
                `;

            }

        }

    }, 500);

})();
document.addEventListener("dragstart", e => e.preventDefault());
document.addEventListener("selectstart", e => e.preventDefault());
let showOnlyReceived = false;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.devicePixelRatio = window.devicePixelRatio || 2;
Chart.defaults.animation = false;
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
let pendingReturnOrders = [];
let currentOriginalComment = "";
let currentOriginalDate = null;
let currentCommentClosed = false;
let advCharts = {};
let advancedDashboardTimer=null;
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
    listenToOrders();
    listenToReturnedOrders();


document.getElementById("newOrderNumber")?.style.setProperty("display", "none");
document.getElementById("warehouseName")?.style.setProperty("display", "none");
document.getElementById("newWarehouseName")?.style.setProperty("display", "none");
document.getElementById("y")?.style.setProperty("display", "none");
document.getElementById("n")?.style.setProperty("display", "none");
document.getElementById("h")?.style.setProperty("display", "none");
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

const headers = rows.shift().map(h =>
    h.toString().toLowerCase().trim().replace(/\s+/g, " ")
);

const ORDER_COL = headers.findIndex(h =>
    h.includes("order") && h.includes("#")
);
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

const warehouseSwitcher = document.getElementById("warehouseSwitcher");  
const kpis = document.querySelector(".kpis");  
const warehouseContainer = document.querySelector(".warehouse-container");  
const salesOrder = document.querySelector(".sales-order");  

// =========================  
// RESET UI FIRST (IMPORTANT)  
// =========================  

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

    todayFiltered = applyFilters().filter(o => {

        return (
            o.status === "canceled" ||
            o.status === "canceled_before_delivery"
        );

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
        o.status === "ready_to_distribute" ||
        o.status === "checked"
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

    function buildTable(orders, type) {
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
${type === "distributed" ? "<th>Company</th><th>Batch</th>" : ""}
<th>Comment</th>
</tr>
            ${orders.map(order => {  let statusText =  
                order.status === "canceled" ? "Canceled" :  
                order.status === "distributed" ? "Distributed"  : order.status === "ready_to_distribute"  ? "Ready to Distribute" :  
                order.status === "checked" ? "Checked" :
                order.status === "completed" ? "In-Packing" :
order.status === "returned" ? "Returned" :
order.status === "partial" ? "Partial" : "Pending";
const company =
    distributedOrdersMap[order.orderNo]?.company ||
    order.company ||
    "-";
    const batch = getBatchName(
    distributedOrdersMap[order.orderNo]?.time,
    company
);
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
Received: ${formatLebanonDateTime(w.receivedTime)}
<br>
Packed: ${formatLebanonDateTime(w.packingTime)}
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
${type === "distributed" ? `
<td>
    ${company}
</td>
<td>${distributedOrdersMap[order.orderNo]?.batch || "-"}</td>
` : ""}

<td style="padding:8px">

    <div style="
        display:flex;
        align-items:center;
        gap:8px;
    ">

     <span
    onclick="openEditOrder('${order.orderNo}')"
    style="
        color:#22c55e;
        font-size:20px;
        max-width:180px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        display:inline-block;
        cursor:pointer;
        text-decoration:underline;
    "
>
    ${order.comment || "Add +"}
</span>

        ${order.comment ? `
            <button
                onclick="openCommentModal(
                    '${order.orderNo}',
                    \`${(order.comment || "").replace(/`/g,"\\`")}\`
                )"
                title="View Full Comment"
                style="
                    background:transparent;
                    border:none;
                    cursor:pointer;
                    font-size:18px;
                    padding:0;
                "
            >
<i class="fas fa-expand"></i>        
    </button>
        ` : ""}

    </div>

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
    ${buildTable(todayOrders, type)}
`;  
    }  

    if (backlogOrders.length) {  

        // 🔥 تجميع الطلبات حسب التاريخ الفعلي  
        const grouped = {};  

        backlogOrders.forEach(order => {  

            const dateKey = normalizeDateOnly(getEffectiveDate(order));  

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

            html += buildTable(grouped[date], type);
        });  
    }  

    orderList.innerHTML = html;  

    document.getElementById("orderDetails").classList.remove("hidden");  
}  


let currentCommentOrder = null;

async function openCommentModal(orderNo, comment) {

    currentCommentOrder = orderNo;
    currentOriginalComment = comment;
    currentOriginalDate = Date.now();

    document.getElementById("commentModalTitle").innerText = orderNo;

    // ✅ مفتاح صالح لـ Firebase
    const orderKey = orderNo.replace(/[.#$[\]]/g, "");

    const closedSnap = await get(
        ref(db, `orderCommentsMeta/${orderKey}`)
    );

    currentCommentClosed =
        closedSnap.exists() &&
        closedSnap.val().closed === true;

  const snap = await get(ref(db, "orderCommentsChat"));

    let replies = [];

    if (snap.exists()) {
        replies = Object.values(snap.val())
            .filter(r =>
                r.orderNo === orderNo &&
                r.type === "reply"
            );
    }

    renderChat(currentOriginalComment, replies);
const closeBtn = document.getElementById("closeCommentBtn");

if (closeBtn) {

if (currentCommentClosed) {
    closeBtn.innerText = "🔓 Reopen Comment";
    closeBtn.style.background = "#22c55e";
} else {
    closeBtn.innerText = "🔒 Close Comment";
    closeBtn.style.background = "#ef4444";
}

closeBtn.disabled = false;
closeBtn.style.cursor = "pointer";
}
    document.getElementById("commentModal")
        .classList.remove("hidden");
}
function renderChat(comment, replies) {

    const container = document.getElementById("commentModalText");

    let html = "";

    // =========================
    // ORIGINAL COMMENT
    // =========================
    html += `
    <div style="
        background:#0f172a;
        border:1px solid #1e293b;
        border-radius:14px;
        padding:14px;
        margin-bottom:15px;
    ">

        <div style="
            font-size:12px;
            color:#38bdf8;
            font-weight:700;
            margin-bottom:6px;
        ">
            ORIGINAL COMMENT
        </div>

        <div style="
            color:white;
            font-size:14px;
            line-height:1.5;
        ">
            ${comment || "-"}
        </div>

        <div style="
            margin-top:8px;
            font-size:11px;
            color:#64748b;
        ">
            ${formatCommentDate(currentOriginalDate || Date.now())}
        </div>

    </div>
    `;

    // =========================
    // REPLIES TITLE
    // =========================
    html += `
    <div style="
        font-size:12px;
        color:#94a3b8;
        margin-bottom:10px;
        font-weight:600;
    ">
        REPLIES (${replies.length})
    </div>
    `;

    // =========================
    // REPLIES LIST (TIMELINE)
    // =========================
    if (replies.length === 0) {

        html += `
        <div style="
            color:#64748b;
            font-size:13px;
            padding:10px;
        ">
            No replies yet
        </div>
        
        `;
    }

    replies.forEach(r => {

        html += `
        <div style="
            background:#111827;
            border:1px solid #1f2937;
            border-radius:12px;
            padding:12px;
            margin-bottom:10px;
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:6px;
            ">

                <div style="
                    font-size:12px;
                    color:#22c55e;
                    font-weight:600;
                ">
                    ${r.by || "User"}
                </div>

                <div style="
                    font-size:10px;
                    color:#64748b;
                ">
                    ${formatCommentDate(r.createdAt)}
                </div>

            </div>

            <div style="
                color:#e2e8f0;
                font-size:14px;
                line-height:1.4;
            ">
                ${r.comment}
            </div>

        </div>
        `;
    });

    container.innerHTML = html;
}
function getOrderKey(orderNo) {
    return orderNo.replace(/[.#$[\]]/g, "");
}
async function toggleCommentStatus() {

    if (!currentCommentOrder) return;

    const orderKey = getOrderKey(currentCommentOrder);

    const newStatus = !currentCommentClosed;

    await update(
        ref(db, `orderCommentsMeta/${orderKey}`),
        {
            closed: newStatus,
            updatedAt: Date.now(),
            updatedBy:
                localStorage.getItem("currentWarehouse") ||
                "Manager"
        }
    );

    currentCommentClosed = newStatus;

    const btn = document.getElementById("closeCommentBtn");

    if (currentCommentClosed) {
        btn.innerText = "🔓 Reopen Comment";
        btn.style.background = "#22c55e";
    } else {
        btn.innerText = "🔒 Close Comment";
        btn.style.background = "#ef4444";
    }

    btn.disabled = false;
    btn.style.cursor = "pointer";
}
function closeCommentModal() {

    document.getElementById(
        "commentModal"
    ).classList.add("hidden");
}
function formatCommentDate(timestamp) {

    if (!timestamp) return "";

    const date = new Date(timestamp);

    return date.toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}
async function saveCommentReply() {

    if (currentCommentClosed) {
        alert("This comment is closed");
        return;
    }

    const input = document.getElementById("commentReply");
    const text = input.value.trim();

    if (!text) return;

  await push(ref(db, "orderCommentsChat"), {
        orderNo: currentCommentOrder,
        comment: text,
        type: "reply",
        by: localStorage.getItem("currentWarehouse") || "Manager",
        createdAt: Date.now()
    });

    input.value = "";

    const replies = await getReplies();
    renderChat(currentOriginalComment, replies);
}
async function getReplies() {
  const snap = await get(ref(db, "orderCommentsChat"));

    if (!snap.exists()) return [];

    return Object.values(snap.val())
        .filter(r =>
            r.orderNo === currentCommentOrder &&
            r.type === "reply"
        );
}
function appendReply(text, by) {

    const container = document.getElementById("commentModalText");

    container.innerHTML += `
        <div style="
            align-self:flex-end;
            background:linear-gradient(135deg,#22c55e,#16a34a);
            color:white;
            padding:12px;
            border-radius:14px;
            max-width:85%;
            margin-top:10px;
        ">
            ${text}
        </div>
    `;

    container.scrollTop = container.scrollHeight;
}
document.getElementById("commentReply")
.addEventListener("keydown", function(e) {

    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        saveCommentReply();
    }
});
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

        const tooltip = document.getElementById("tooltip");

        if (tooltip) {
            tooltip.classList.add("hidden");
        }
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

const canceledToday = todayOrders.filter(o =>
    o.status === "canceled" ||
    o.status === "canceled_before_delivery"
);
const returnedToday = todayOrders.filter(o =>
o.status === "returned"
);
const readyToReturnCount =
    Object.keys(readyToReturnOrders).length;
const distributedToday = todayOrders.filter(isDistributed);
const distributedByCompany = {
    LMD: 0,
    Employee: 0,
    Wakilni: 0
};

distributedToday.forEach(order => {
    const company =
        distributedOrdersMap[order.orderNo]?.company?.trim().toLowerCase();

    if (company === "lmd") {
        distributedByCompany.LMD++;
    } else if (company === "employee") {
        distributedByCompany.Employee++;
    } else if (company === "wakilni") {
        distributedByCompany.Wakilni++;
    }
});
const readyToday = todayOrders.filter(o =>
o.status === "ready_to_distribute"
);
const checkedToday = allOrders.filter(o =>
    o.status === "checked"
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
const checkedBacklog = accumulatedOrders.filter(o =>
    o.status === "checked"
);
// ================= DISPLAY =================
updateKPINumber("returned", returnedToday.length);
const returnedKpi = document.getElementById("returned");

if (returnedKpi) {

    const returnedSub =
        returnedKpi.closest(".kpi")
        ?.querySelector(".sub-number");

    if (returnedSub) {
        returnedSub.textContent =
            `Ready To Return: ${readyToReturnCount}`;
    }
}
updateKPINumber("total", todayOrders.length);
updateKPINumber("distributed", distributedToday.length);

const distributedCard = document.getElementById("distributed");
const subNumber = distributedCard
    .closest(".kpi")
    .querySelector(".sub-number");

subNumber.textContent =
    `(LMD: ${distributedByCompany.LMD}) ` +
    `(Employee: ${distributedByCompany.Employee}) ` +
    `(Wakilni: ${distributedByCompany.Wakilni})`;
updateKPINumber("ready", readyToday.length);

const readyContainer =
    document.getElementById("ready");

if (readyContainer) {

    const readySubNumber =
        readyContainer.closest(".kpi")
        ?.querySelector(".sub-number");

    if (readySubNumber) {
        readySubNumber.textContent =
            `Checked: ${checkedToday.length}`;
    }
}
updateKPINumber("canceled", canceledToday.length);

updateKPIWithBacklog("completed", completedToday.length, completedBacklog.length);  
updateKPIWithBacklog("pending", pendingToday.length, pendingBacklog.length);  

renderWarehouseBreakdown(todayOrders);  
renderMultiWHOrders(todayOrders);  
renderSingleWHOrders(todayOrders);
if(
!document
.getElementById("advancedDashboardTab")
.classList.contains("hidden")
){

setTimeout(() => {
    refreshAdvancedDashboard();
}, 100);

}

  
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
    document.getElementById("aboutTab").classList.add("hidden");
    document.getElementById("orderCommentsTab")
        .classList.add("hidden");
document.getElementById("reportsTab")  
    ?.classList.add("hidden");  
document.getElementById("advancedDashboardTab")
        ?.classList.add("hidden");

document.getElementById("dashboardHeader")  
    .style.display = "none";  

document.getElementById("newOrderTab")  
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

    if (!container) return;

    let orders = Object.keys(readyToReturnOrders);

    const warehouses = [
        "PHARMA",
        "RETAIL",
        "P&C",
        "LOREAL LUX",
        "BEESLINE"
    ];

    // تحويل الطلبات إلى Rows (كل مستودع بسطر مستقل)
    let rows = [];

    orders.forEach(orderNo => {

        const data = readyToReturnOrders[orderNo];

        const orderWarehouses = (data.warehouse || "")
            .split(",")
            .map(w => w.trim())
            .filter(Boolean);

        orderWarehouses.forEach(warehouse => {

            rows.push({
                orderNo,
                warehouse,
                data
            });

        });

    });

    // فلترة على مستوى المستودع
    if (readyToReturnWarehouseFilter) {

        const filter =
            readyToReturnWarehouseFilter
                .toUpperCase()
                .replace(/'/g, "");

        rows = rows.filter(row =>
            row.warehouse
                .toUpperCase()
                .replace(/'/g, "") === filter
        );

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
        ${rows.length} Orders
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
    <th style="padding:14px">Comment</th>
    <th style="padding:14px">Edit</th>
    <th style="padding:14px">Remove</th>
</tr>

${rows.length === 0
? `
<tr>
    <td colspan="8" style="
        text-align:center;
        padding:30px;
        color:#94a3b8;
    ">
        No Ready To Return Orders
    </td>
</tr>
`
: rows.map(row => {

    const orderNo = row.orderNo;
    const warehouse = row.warehouse;
    const data = row.data;

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
            value="${orderNo}|||${warehouse}"
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
        ${warehouse}
    </td>

    <td style="
        padding:12px;
        color:#94a3b8;
    ">
        ${data.date || "-"}
    </td>

    <td style="padding:12px">
        <span style="
            background:linear-gradient(135deg,#f59e0b,#ea580c);
            color:white;
            padding:6px 12px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
        ">
            Ready To Return
        </span>
    </td>

    <td style="
        padding:12px;
        color:#22c55e;
    ">
        ${data.comment || "-"}
    </td>

    <td style="padding:12px">
        <button
            onclick="editReadyToReturnOrder('${orderNo}')"
        >
            ✏️ Edit
        </button>
    </td>

    <td style="padding:12px">
        <button  onclick="removeWarehouseFromReadyToReturn(
    '${orderNo}',
    '${warehouse.replace(/'/g, "\\'")}'
)">
            🗑 Remove
        </button>
    </td>

</tr>

`;
}).join("")
}

</table>

</div>

<div style="
    margin-top:15px;
    display:flex;
    gap:10px;
    flex-wrap:wrap;
">

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

    <button
        onclick="exportSelectedReadyToReturn()"
        style="
            background:#16a34a;
            color:white;
            border:none;
            padding:10px 20px;
            border-radius:8px;
            cursor:pointer;
        "
    >
        Export To Excel
    </button>

    <button
        onclick="removeSelectedReadyToReturn()"
        style="
            background:#b91c1c;
            color:white;
            border:none;
            padding:10px 20px;
            border-radius:8px;
            cursor:pointer;
        "
    >
        Remove Selected
    </button>

</div>

`;

}
function removeWarehouseFromReadyToReturn(orderNo, warehouse) {

    const data = readyToReturnOrders[orderNo];

    let warehouses = data.warehouse
        .split(",")
        .map(w => w.trim())
        .filter(w => w !== warehouse);

    if (warehouses.length) {

        readyToReturnOrders[orderNo] = {
            ...data,
            warehouse: warehouses.join(", ")
        };

    } else {

        delete readyToReturnOrders[orderNo];

    }

    saveReturnedOrders();
    renderReturnedOrders();
    updateDashboard();
}
function selectAllReturnOrders() {
    document.querySelectorAll(".return-checkbox")
        .forEach(cb => cb.checked = true);
}
function selectReturnWarehouse(btn) {

    const orderNo =
        btn.dataset.order;

    const warehouse =
        btn.dataset.warehouse;

    document
        .querySelectorAll(
            `.warehouse-choice[data-order="${orderNo}"]`
        )
        .forEach(b => {

            b.style.background = "#1e293b";
            b.style.borderColor = "#334155";
            b.style.color = "#e2e8f0";

        });

    btn.style.background =
        "linear-gradient(135deg,#22c55e,#16a34a)";

    btn.style.borderColor = "#22c55e";

    btn.style.color = "#fff";

    document.getElementById(
        `selectedWarehouse_${orderNo}`
    ).value = warehouse;
}
function removeSelectedReadyToReturn() {

    const selected = [
        ...document.querySelectorAll(
            ".return-checkbox:checked"
        )
    ];

    if (!selected.length) {
        alert("Select orders first");
        return;
    }

    if (
        !confirm(
            `Remove ${selected.length} orders from Ready To Return?`
        )
    ) {
        return;
    }

    selected.forEach(cb => {

    const [orderNo, warehouse] =
        cb.value.split("|||");

    removeWarehouseFromReadyToReturn(
        orderNo,
        warehouse
    );

});

    saveReturnedOrders();

    renderReturnedOrders();

    updateDashboard();
}
function openReturnEmailModal() {

    const selected = document.querySelectorAll(
        ".return-checkbox:checked"
    );

    if (!selected.length) {

        alert("Select orders first");
        return;
    }

    document.getElementById(
        "selectedOrdersCount"
    ).innerHTML =
    `Selected Orders: <b>${selected.length}</b>`;

    document.getElementById(
        "returnEmailModal"
    ).classList.remove("hidden");
}

function closeReturnEmailModal() {

    document.getElementById(
        "returnEmailModal"
    ).classList.add("hidden");
}
function clearAllReturnSelection() {
    document.querySelectorAll(".return-checkbox")
        .forEach(cb => cb.checked = false);
}
function filterReadyToReturnWarehouse(warehouse) {

    readyToReturnWarehouseFilter = warehouse;

    renderReturnedOrders();
}
let editingReturnOrder = null;

function editReadyToReturnOrder(orderNo) {

    editingReturnOrder = orderNo;

    const data = readyToReturnOrders[orderNo];

    document.getElementById(
        "editReturnOrderNo"
    ).value = data.orderNo;

    document.getElementById(
        "editReturnComment"
    ).value = data.comment || "";

    document.getElementById(
        "editReturnModal"
    ).classList.remove("hidden");
}
function closeEditReturnModal() {

    document.getElementById(
        "editReturnModal"
    ).classList.add("hidden");
}

function saveEditReturnOrder() {

    const newOrderNo =
        document.getElementById("editReturnOrderNo")
        .value
        .trim()
        .toUpperCase();

    const comment =
        document.getElementById("editReturnComment")
        .value
        .trim();

const oldData =
    readyToReturnOrders[editingReturnOrder];

const order = allOrders.find(
    o => o.orderNo.toUpperCase() === newOrderNo.toUpperCase()
);

const warehouse = order
    ? order.warehouses
        .filter(w => w.base.toUpperCase() !== "PACKING STATION")
        .map(w => w.base)
        .join(", ")
    : oldData.warehouse;

delete readyToReturnOrders[editingReturnOrder];

readyToReturnOrders[newOrderNo] = {
    ...oldData,
    orderNo: newOrderNo,
    warehouse,
    comment
};
    saveReturnedOrders();
    renderReturnedOrders();
    closeEditReturnModal();
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

    pendingReturnOrders = selected.map(cb => {

    const [orderNo, warehouse] =
        cb.value.split("|||");

    return {
        orderNo,
        warehouse
    };

});

    document.getElementById(
        "returnConfirmText"
    ).innerHTML =
        `You are about to mark <b style="color:#22c55e">${pendingReturnOrders.length}</b> order(s) as Returned.<br>`;

    document
        .getElementById("returnConfirmModal")
        .classList.remove("hidden");
}
function closeReturnConfirmModal() {

    document
        .getElementById("returnConfirmModal")
        .classList.add("hidden");

    pendingReturnOrders = [];
}
function executeReturnOrders() {

    pendingReturnOrders.forEach(item => {

        const orderNo =
            item.orderNo;

        const returnedWarehouse =
            item.warehouse;

        const data =
            readyToReturnOrders[orderNo];

    

    returnedOrders.add(orderNo);

    returnedOrdersMap[
        `${orderNo}_${returnedWarehouse}`
    ] = {
        orderNo,
        warehouse: returnedWarehouse,
        returnedDate:
            new Date()
            .toISOString()
            .slice(0, 10),
        comment: data.comment || ""
    };
        const order = allOrders.find(
            o => o.orderNo === orderNo
        );

        if (order) {
            order.status = "returned";
        }

        let warehouses =
    data.warehouse
        .split(",")
        .map(w => w.trim());

warehouses =
    warehouses.filter(
        w => w !== returnedWarehouse
    );

if (warehouses.length) {

    readyToReturnOrders[orderNo] = {
        ...data,
        warehouse: warehouses.join(", ")
    };

} else {

    delete readyToReturnOrders[orderNo];

}
    });

    saveReturnedOrders();

    updateDashboard();

    renderReturnedOrders();

    closeReturnConfirmModal();

    showToast?.(
        `${pendingReturnOrders.length} Orders Returned Successfully`
    );
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
function exportSelectedReadyToReturn() {

    const selected = [
        ...document.querySelectorAll(".return-checkbox:checked")
    ];

    if (!selected.length) {
        alert("Select orders first");
        return;
    }

    const data = selected.map(cb => {

        const orderNo = cb.value;
        const order = readyToReturnOrders[orderNo];

        return {
            "Order No": order.orderNo,
            "Warehouse": order.warehouse,
            "Date": order.date,
            "Comment": order.comment || "",
            "Status": "Ready To Return"
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Ready To Return"
    );

    XLSX.writeFile(
        workbook,
        `Ready_To_Return_${new Date().toISOString().slice(0,10)}.xlsx`
    );
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

function removeReadyToReturnOrder(orderNo) {

    const confirmed = confirm(
        `Remove ${orderNo} from Ready To Return list?`
    );

    if (!confirmed) return;

    delete readyToReturnOrders[orderNo];

    saveReturnedOrders();

    renderReturnedOrders();

    updateDashboard();

}
function normalizeDateOnly(dateStr) {
    if (!dateStr) return "No Date";

    const d = new Date(dateStr);

    if (isNaN(d)) return dateStr.split(" ")[0]; // fallback

    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function openOrderCommentsTab() {

    // إخفاء جميع التابات
    document.querySelectorAll(
        "#newOrderTab,#returnTab,#reportsTab,#aboutTab,#readyTab,#orderCommentsTab"
    ).forEach(tab => tab.classList.add("hidden"));

    // إخفاء الداشبورد
    document.getElementById("dashboardHeader").style.display = "none";

    document.querySelector(".kpis")
        ?.classList.add("hidden");

    document.querySelector(".warehouse-container")
        ?.classList.add("hidden");

    document.querySelector(".sales-order")
        ?.classList.add("hidden");

    // إظهار التاب المطلوبة
    document.getElementById("orderCommentsTab")
        .classList.remove("hidden");

    // تحميل التعليقات
    loadOrderComments();

    // Focus على البحث
    setTimeout(() => {
        document.getElementById("commentSearch")?.focus();
    }, 200);
}

window.saveOrderComment = async function(){

    const orderNo =
        document.getElementById("commentOrderNumber")
        .value.trim()
        .toUpperCase();

    const comment =
        document.getElementById("orderCommentText")
        .value.trim();
        const faultBy =
    document.getElementById("faultBy")
    .value.trim();
const selectedDate =
    document.getElementById("complainDate").value;

const complainDate =
    selectedDate || new Date().toISOString().slice(0,10);
    if(!orderNo || !comment){
        alert("Please complete all fields");
        return;
    }

    const order = allOrders.find(
        o => o.orderNo.toUpperCase() === orderNo
    );

    // مستودع الطلب
    const by = order
        ? order.warehouses
            .filter(w => w.base.toUpperCase() !== "PACKING STATION")
            .map(w => w.base)
            .join(", ")
        : "Unknown";

    // المستخدم الذي كتب التعليق
    const createdBy =
        localStorage.getItem("currentWarehouse") || "Manager";

    await push(ref(db,"orderCommentsTab"),{
    orderNo,
    comment,
    faultBy,
    by,
    createdBy,
    createdAt: complainDate
});

    document.getElementById("commentOrderNumber").value = "";
    document.getElementById("orderCommentText").value = "";
document.getElementById("complainDate").value = "";
document.getElementById("faultBy").value = "";
    loadOrderComments();
};

window.loadOrderComments = async function()
{
const faultFilter =
    document.getElementById("faultByFilter")
    ?.value || "";
    const container =
        document.getElementById("orderCommentsList");

    const search =
        document.getElementById("commentSearch")
        ?.value
        ?.toLowerCase() || "";

   const snap = await get(ref(db,"orderCommentsTab"));

    if(!snap.exists()){
        container.innerHTML=
        "<div style='color:#94a3b8'>No comments found</div>";
        return;
    }

    let html="";

    const data = snap.val();
const filter =
    document.getElementById("faultByFilter");

const currentValue = filter.value;

const faults = [
    ...new Set(
        Object.values(data)
            .map(r => (r.faultBy || "").trim())
            .filter(v => v)
    )
].sort();

filter.innerHTML =
    `<option value="">All Fault By</option>` +
    faults.map(f =>
        `<option value="${f}">${f}</option>`
    ).join("");

filter.value = currentValue;
    Object.entries(data)
    .reverse()
    .forEach(([id,row])=>{
const replies =
    row.replies
        ? Object.entries(row.replies)
        : [];
const repliesHtml =
    replies.map(
        ([replyId, reply]) => `
        <div style="
            margin-top:10px;
            margin-left:30px;
            padding:12px;
            background:#0f172a;
            border-left:3px solid #22c55e;
            border-radius:10px;
        ">

            <div style="
                color:#94a3b8;
                font-size:12px;
                margin-bottom:6px;
            ">
                ${reply.by || "System"}
                •
                ${reply.createdAt}
            </div>

     <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:15px;
">

    <div>
        ${reply.comment}
    </div>

    <button
        onclick="
            deleteReply(
                '${id}',
                '${replyId}'
            )
        "
        style="
            background:#dc2626;
            color:white;
            border:none;
            border-radius:8px;
            padding:5px 10px;
            cursor:pointer;
        "
    >
        🗑
    </button>

</div>
        </div>
    `).join("");
        if (
    search &&
    !row.orderNo.toLowerCase().includes(search)
){
    return;
}

if (
    faultFilter &&
    (row.faultBy || "") !== faultFilter
){
    return;
}

       html += `
<div class="comment-item">

    <div class="comment-order">
        ${row.orderNo}
    </div>

<div class="comment-meta">


 <div class="comment-meta">

    <div style="
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
    ">

        <span style="
            color:#16a34a;
            font-weight:700;
            font-size:14px;
        ">
            👤 ${row.createdBy || "Unknown"}
        </span>

        <span style="
            color:#94a3b8;
            font-size:12px;
        ">
            ${row.createdAt}
        </span>
<div style="
    margin-top:6px;
    color:#f59e0b;
    font-size:13px;
    font-weight:600;
">
    Fault By: ${row.faultBy || "-"}
</div>
    </div>

    <div style="
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        margin-top:8px;
    ">
        ${
            (row.by || "Unknown")
            .split(",")
            .map(w => `
                <span style="
                    display:inline-flex;
                    align-items:center;
                    padding:5px 12px;
                    background:#eff6ff;
                    color:#2563eb;
                    border:1px solid #bfdbfe;
                    border-radius:999px;
                    font-size:12px;
                    font-weight:600;
                ">
                    📦 ${w.trim()}
                </span>
            `)
            .join("")
        }
    </div>

</div>

</div>

<div class="comment-text">
  ${row.comment}
</div>

${repliesHtml}

<button
    onclick="addCommentReply('${id}','${row.orderNo}')"
    style="
        margin-top:10px;
        background:#22c55e;
        color:white;
        border:none;
        padding:6px 12px;
        border-radius:8px;
        cursor:pointer;
    "
>
    + Add
</button>
<button
    onclick="editComment('${id}')"
    style="
        margin-top:10px;
        margin-left:8px;
        background:#2563eb;
        color:white;
        border:none;
        padding:6px 12px;
        border-radius:8px;
        cursor:pointer;
    "
>
    ✏️ Edit
</button>
<button
    onclick="deleteComment('${id}')"
    style="
        margin-top:10px;
        margin-left:8px;
        background:#dc2626;
        color:white;
        border:none;
        padding:6px 12px;
        border-radius:8px;
        cursor:pointer;
    "
>
    🗑 Remove
</button>
</div>`;
    });
    document.getElementById("commentOrderNumber").value = "";
    document.getElementById("orderCommentText").value = "";
    

    container.innerHTML = html;
};
window.deleteReply = async function(
    commentId,
    replyId
){

    const confirmed = confirm(
        "Remove this reply?"
    );

    if (!confirmed) return;

    await remove(
ref(
    db,
    `orderCommentsTab/${commentId}/replies/${replyId}`
)
    );

    loadOrderComments();
};
window.editComment = async function(commentId){

    const snap = await get(
        ref(db, `orderCommentsTab/${commentId}`)
    );

    if(!snap.exists()){
        alert("Comment not found");
        return;
    }

    const row = snap.val();

    // حفظ الـ ID للتعديل لاحقاً
    currentEditCommentId = commentId;


    document.getElementById("editOrderInfo").innerHTML =
        `Order: ${row.orderNo}`;


    document.getElementById("editCommentText").value =
        row.comment || "";


    document.getElementById("editFaultBy").value =
        row.faultBy || "";


    document
        .getElementById("editCommentModal")
        .classList.remove("hidden");
};
window.closeEditCommentModal = function(){

    document
        .getElementById("editCommentModal")
        .classList.add("hidden");

    currentEditCommentId = null;
};
window.addCommentReply = function(commentId, orderNo){

    currentReplyCommentId = commentId;

    document.getElementById(
        "replyOrderInfo"
    ).innerHTML =
        `Order: ${orderNo}`;

    document.getElementById(
        "replyText"
    ).value = "";

    document.getElementById(
        "replyModal"
    ).classList.remove("hidden");
};
window.saveEditedComment = async function(){

    const comment =
        document.getElementById("editCommentText")
        .value.trim();


    const faultBy =
        document.getElementById("editFaultBy")
        .value.trim();


    if(!comment){
        alert("Comment cannot be empty");
        return;
    }


    await update(
        ref(
            db,
            `orderCommentsTab/${currentEditCommentId}`
        ),
        {
            comment,
            faultBy,

            editedBy:
                localStorage.getItem("currentWarehouse")
                || "Manager",

            editedAt:
                new Date().toLocaleString()
        }
    );


    closeEditCommentModal();

    loadOrderComments();
};
window.closeReplyModal = function(){

    document
        .getElementById("replyModal")
        .classList.add("hidden");

    currentReplyCommentId = null;
};
window.saveReply = async function(){

    const comment =
        document.getElementById(
            "replyText"
        ).value.trim();

    if (!comment) {
        alert("Please enter a reply");
        return;
    }

    await push(
ref(
    db,
    `orderCommentsTab/${currentReplyCommentId}/replies`
),
        {
            comment,
            by:
                localStorage.getItem(
                    "userWarehouse"
                ) || "System",
            createdAt:
                new Date().toLocaleString()
        }
    );

    closeReplyModal();
    loadOrderComments();
};
window.deleteComment = async function(commentId){

    const confirmed = confirm(
        "Remove this comment?"
    );

    if (!confirmed) return;

    await remove(
ref(
    db,
    `orderCommentsTab/${commentId}`
)
    );

    loadOrderComments();
};


function formatLebanonDateTime(dateValue) {
    if (!dateValue) return "-";

    return new Date(dateValue).toLocaleString("en-GB", {
        timeZone: "Asia/Beirut",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
                  }
window.addEventListener("click", function (event) {
    const modal = document.getElementById("commentModal");

    if (event.target === modal) {
        modal.classList.add("hidden");
    }
});

function showAdvancedDashboard() {

    // إيقاف أي تحديث سابق
    if (advancedDashboardTimer) {
        clearInterval(advancedDashboardTimer);
    }

    // إخفاء الصفحات الأخرى
    document.getElementById("reportConfigPage")?.classList.add("hidden");
    document.getElementById("orderCommentsTab")?.classList.add("hidden");
    document.getElementById("newOrderTab")?.classList.add("hidden");
    document.getElementById("reportsTab")?.classList.add("hidden");
    document.getElementById("readyTab")?.classList.add("hidden");
    document.getElementById("returnTab")?.classList.add("hidden");
    document.getElementById("aboutTab")?.classList.add("hidden");
    document.getElementById("settingsTab")?.classList.add("hidden");

    // إخفاء الداشبورد الرئيسي
    document.querySelector(".kpis")?.classList.add("hidden");
    document.querySelector(".warehouse-container")?.classList.add("hidden");
    document.querySelector(".sales-order")?.classList.add("hidden");


    // إظهار Advanced Dashboard
    document.getElementById("advancedDashboardTab")
        ?.classList.remove("hidden");

    // تحميل البيانات
    loadAdvancedDashboard();

    // تحديث تلقائي كل 30 ثانية
    advancedDashboardTimer = setInterval(() => {
        refreshAdvancedDashboard();
    }, 30000);
}
function loadAdvancedDashboard() {

    const container = document.getElementById("advancedDashboardContent");

    container.innerHTML = `

<div class="adv-row"
style="
display:grid;
grid-template-columns:1fr 1fr;
gap:20px;
">

    <!-- Orders By Status -->
    <div class="adv-panel" style="height:500px;">
        <div class="panel-title">
            Orders By Status
        </div>
        <canvas id="orderStatusChart"></canvas>
    </div>

    <!-- Order Trend -->
    <div class="adv-panel" style="height:500px;">
        <div class="panel-title">
            Daily Orders
        </div>
        <canvas id="orderTrendChart"></canvas>
    </div>

    <!-- Divider -->
    <div class="section-divider" style="grid-column:1 / -1;">
    </div>

    <!-- Warehouse -->
    <div class="adv-panel" style="height:520px;">
        <div class="panel-title">
            Warehouse Performance (SOD)
        </div>
        <canvas id="warehousePerformanceChart"></canvas>
    </div>

    <!-- Orders By Day -->
    <div class="adv-panel" style="height:520px;">

        <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:10px;
        ">

            <div class="panel-title">
                Orders By Date
            </div>

            <div style="display:flex;gap:10px;">

                <select id="yearFilter"
                        onchange="refreshAdvancedDashboard()"
                        style="
                        background:#1f2937;
                        color:white;
                        border:1px solid #374151;
                        padding:6px 12px;
                        border-radius:6px;
                        ">

                    <option>2024</option>
                    <option>2025</option>
                    <option selected>2026</option>

                </select>

<select id="monthFilter"
        onchange="refreshAdvancedDashboard()"
        style="
        background:#1f2937;
        color:white;
        border:1px solid #374151;
        padding:6px 12px;
        border-radius:6px;
        ">

    <option value="0">January</option>
    <option value="1">February</option>
    <option value="2">March</option>
    <option value="3">April</option>
    <option value="4">May</option>
    <option value="5">June</option>
    <option value="6">July</option>
    <option value="7">August</option>
    <option value="8">September</option>
    <option value="9">October</option>
    <option value="10">November</option>
    <option value="11">December</option>

</select>


            </div>

        </div>

        <canvas id="ordersByDayChart"></canvas>

    </div>

</div>
    `;

    setTimeout(() => {
        refreshAdvancedDashboard();
    }, 100);
}

function refreshAdvancedDashboard() {

    const orders = applyFilters();

    drawAdvancedCharts(orders);

}
document.querySelectorAll(".adv-stat-card").forEach(card=>{

card.style.opacity="0";

card.style.transform="translateY(15px)";

setTimeout(()=>{

card.style.transition=".4s";

card.style.opacity="1";

card.style.transform="translateY(0px)";

},100);
const warehouseTotals={};

orders.forEach(order=>{

    order.warehouses.forEach(w=>{

        if(!warehouseTotals[w.base])

            warehouseTotals[w.base]=0;

        warehouseTotals[w.base]++;

    });

});

advCharts.radar=new Chart(

document.getElementById("warehouseRadar"),

{

type:"radar",

data:{

labels:Object.keys(warehouseTotals),

datasets:[{

label:"Orders",

data:Object.values(warehouseTotals)

}]

},

options:{

plugins:{

legend:{

labels:{color:"white"}

}

}

}

}

);
});

function destroyAdvancedCharts() {

    Object.values(advCharts).forEach(chart => {

        if (chart) {

            chart.destroy();

        }

    });

    advCharts = {};

}

function drawAdvancedCharts(orders) {

    destroyAdvancedCharts();

    // ============================
    // Orders By Status
    // ============================

    const statusCanvas = document.getElementById("orderStatusChart");

    if (statusCanvas) {

        const pending = orders.filter(o => o.status === "pending").length;

        const partial = orders.filter(o => o.status === "partial").length;

        const inPacking = orders.filter(o => o.status === "completed").length;

        const openComments = orders.filter(o =>
            o.comment &&
            o.comment.trim() !== ""
        ).length;

        advCharts.status = new Chart(statusCanvas, {

            type: "doughnut",

            data: {

                labels: [
                    "Pending",
                    "Partial",
                    "Open Comments",
                    "In-Packing"
                ],

                datasets: [{

                    data: [
                        pending,
                        partial,
                        openComments,
                        inPacking
                    ],

                    backgroundColor: [
                        "#f59e0b",
                        "#fb923c",
                        "#ef4444",
                        "#22c55e"
                    ],

                    borderWidth: 2

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

    display: true,

    position: "right",

    align: "start",

    labels: {

        color: "#fff",

        usePointStyle: true,

        pointStyle: "rectRounded",

        padding: 22,

        boxWidth: 14,

        boxHeight: 14,

        font: {

            size: 13,

            family: "Arial",

            weight: "600"

        }

    }

},

                    title: {

                        display: true,

                        text: "Orders By Status",

                        color: "white",

                        font: {
                            size: 18,
                            weight: "bold"
                        }

                    }

                }

            }

        });

    }

    // ============================
    // Order Trend
    // ============================

    const trendCanvas = document.getElementById("orderTrendChart");

    if (trendCanvas) {

        const trend = {};

        orders.forEach(order => {

            const dateValue =
                order.created_at ||
                order.date ||
                order.createdDate ||
                order.timestamp;

            if (!dateValue) return;

            const d = new Date(dateValue);

            if (isNaN(d)) return;

            const hour = d.getHours().toString().padStart(2, "0") + ":00";

            trend[hour] = (trend[hour] || 0) + 1;

        });

        // ترتيب الساعات من 00 إلى 23
        const labels = [];

        const values = [];

        for (let i = 0; i < 24; i++) {

            const h = i.toString().padStart(2, "0") + ":00";

            labels.push(h);

            values.push(trend[h] || 0);

        }

        advCharts.orderTrend = new Chart(trendCanvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [{

                    label: "Orders",

                    data: values,

                    borderColor: "#3b82f6",

                    backgroundColor: "rgba(59,130,246,0.15)",

                    fill: true,

                    borderWidth: 3,

                    tension: 0.35,

                    pointRadius: 4,

                    pointHoverRadius: 6

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {

                    mode: "index",

                    intersect: false

                },

                plugins: {

                    legend: {

    display: true,

    position: "right",

    align: "start",

    labels: {

        color: "#fff",

        usePointStyle: true,

        pointStyle: "rectRounded",

        padding: 22,

        boxWidth: 14,

        boxHeight: 14,

        font: {

            size: 13,

            family: "Arial",

            weight: "600"

        }

    }

},

                    title: {

                        display: true,

                        text: "Order Trend",

                        color: "white",

                        font: {

                            size: 18,

                            weight: "bold"

                        }

                    }

                },

                scales: {

                    x: {

                        title: {

                            display: true,

                            text: "Time",

                            color: "white"

                        },

                        ticks: {

                            color: "white"

                        },

                        grid: {

                            color: "rgba(255,255,255,0.08)"

                        }

                    },

                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Orders",

                            color: "white"

                        },

                        ticks: {

                            color: "white",

                            precision: 0

                        },

                        grid: {

                            color: "rgba(255,255,255,0.08)"

                        }

                    }

                }

            }

        });

    }
// ============================
// Warehouse Performance
// ============================

const warehouseCanvas =
    document.getElementById("warehousePerformanceChart");

if (warehouseCanvas) {

    const warehouses = {};

    orders.forEach(order => {

        if (!order.warehouses) return;

        order.warehouses.forEach(w => {

            const name = w.base || "Unknown";

            if (!warehouses[name]) {

                warehouses[name] = {

                    pending: 0,
                    packing: 0,
                    distributed: 0

                };

            }

            if (order.status === "pending")
                warehouses[name].pending++;

            else if (order.status === "completed")
                warehouses[name].packing++;

            else if (order.status === "distributed")
                warehouses[name].distributed++;

        });

    });

    const labels = ["Total"];

    const pending = [0];

    const packing = [0];

    const distributed = [0];

    Object.keys(warehouses).forEach(name => {

        labels.push(name);

        pending.push(warehouses[name].pending);

        packing.push(warehouses[name].packing);

        distributed.push(warehouses[name].distributed);

        pending[0] += warehouses[name].pending;

        packing[0] += warehouses[name].packing;

        distributed[0] += warehouses[name].distributed;

    });

    advCharts.warehousePerformance =
        new Chart(warehouseCanvas, {

            type: "bar",

            data: {

                labels,

                datasets: [

                    {

                        label: "Pending",

                        data: pending,

                        backgroundColor: "#f59e0b"

                    },

                    {

                        label: "In Packing",

                        data: packing,

                        backgroundColor: "#22c55e"

                    },

                    {

                        label: "Distributed",

                        data: distributed,

                        backgroundColor: "#3b82f6"

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                indexAxis: "y",

                plugins: {

                    legend: {

                        position: "right",

                        labels: {

                            color: "#fff"

                        }

                    },

                    title: {

                        display: true,

                        text: "Warehouse Performance",

                        color: "#fff",

                        font: {

                            size: 18,

                            weight: "bold"

                        }

                    }

                },

                scales: {

                    x: {

                        stacked: true,

                        ticks: {

                            color: "#fff"

                        },

                        grid: {

                            color: "rgba(255,255,255,.08)"

                        }

                    },

                    y: {

                        stacked: true,

                        ticks: {

                            color: "#fff"

                        },

                        grid: {

                            color: "rgba(255,255,255,.08)"

                        }

                    }

                }

            }

        });

}

  // ============================
// Orders By Day (Quarter + Year)
// ============================

const monthCanvas =
    document.getElementById("ordersByDayChart");

if (monthCanvas) {


    const selectedYear =
        Number(document.getElementById("yearFilter")?.value || new Date().getFullYear());

const selectedMonth =
    Number(document.getElementById("monthFilter")?.value || new Date().getMonth());

const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

    const days = {};

    orders.forEach(order => {

        const dateValue =
            order.created_at ||
            order.date ||
            order.createdDate ||
            order.timestamp;

        if (!dateValue) return;

        const d = new Date(dateValue);

        if (isNaN(d)) return;

        // فلترة السنة
        if (d.getFullYear() !== selectedYear)
            return;

        // فلترة الربع
if (d.getMonth() !== selectedMonth)
    return;

        const day = d.getDate();

        days[day] = (days[day] || 0) + 1;

    });

    const labels = [];
    const values = [];

    for (let i = 1; i <= 31; i++) {

        labels.push(i.toString());

        values.push(days[i] || 0);

    }

    advCharts.ordersByDay = new Chart(monthCanvas, {

        type: "line",

        data: {

            labels,

            datasets: [{

label: `Orders (${monthNames[selectedMonth]} ${selectedYear})`,

                data: values,

                borderColor: "#8b5cf6",

                backgroundColor: "rgba(139,92,246,.15)",

                fill: true,

                borderWidth: 3,

                tension: 0.35,

                pointRadius: 4,

                pointHoverRadius: 6

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            interaction: {

                mode: "index",

                intersect: false

            },

            plugins: {

                legend: {

                    position: "right",

                    labels: {

                        color: "#fff",

                        usePointStyle: true,

                        pointStyle: "rectRounded",

                        padding: 22,

                        boxWidth: 14,

                        boxHeight: 14,

                        font: {

                            size: 13,

                            family: "Arial",

                            weight: "600"

                        }

                    }

                },

                title: {

                    display: true,

text: `Orders By Day - ${monthNames[selectedMonth]} (${selectedYear})`,

                    color: "#fff",

                    font: {

                        size: 18,

                        weight: "bold"

                    }

                }

            },

            scales: {

                x: {

                    title: {

                        display: true,

                        text: "Day",

                        color: "#fff"

                    },

                    ticks: {

                        color: "#fff"

                    },

                    grid: {

                        color: "rgba(255,255,255,.08)"

                    }

                },

                y: {

                    beginAtZero: true,

                    title: {

                        display: true,

                        text: "Orders",

                        color: "#fff"

                    },

                    ticks: {

                        color: "#fff",

                        precision: 0

                    },

                    grid: {

                        color: "rgba(255,255,255,.08)"

                    }

                }

            }

        }

    });

}
}

function renderHeatmap(orders){

const grid=document.getElementById("heatmapGrid");

if(!grid) return;

grid.innerHTML="";

const map={};

orders.forEach(o=>{

const h=new Date(o.date).getHours();

map[h]=(map[h]||0)+1;

});

for(let i=0;i<24;i++){

const value=map[i]||0;

let color="#1e293b";

if(value>2) color="#14532d";

if(value>5) color="#16a34a";

if(value>10) color="#22c55e";

grid.innerHTML+=`

<div
class="heat-cell"
title="${i}:00 (${value})"
style="background:${color}"
></div>

`;

}

}
