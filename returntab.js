function showReturnTab() {
    // document.getElementById("aboutTab").classList.add("hidden");
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
