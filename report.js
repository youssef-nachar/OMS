
function showReportsTab() {
  document.getElementById("aboutTab").classList.add("hidden");
document.getElementById("reportConfigPage").classList.add("hidden")
document.getElementById("dashboardHeader").style.display = "none";  

document.getElementById("newOrderTab")  
    ?.classList.add("hidden");  

document.getElementById("teamNotesTab")  
    ?.classList.add("hidden");  

document.getElementById("readyTab")  
    ?.classList.add("hidden");  

document.getElementById("returnTab")  
    ?.classList.add("hidden");  

document.getElementById("reportsTab")  
    ?.classList.remove("hidden");  

document.querySelector(".kpis")  
    ?.classList.add("hidden");  

document.querySelector(".warehouse-container")  
    ?.classList.add("hidden");  

document.querySelector(".sales-order")  
    ?.classList.add("hidden");

}
function getReportDate(order) {

if (!order) return "";  

if (  
    distributedOrdersMap &&  
    distributedOrdersMap[order.orderNo]  
) {  

    return distributedOrdersMap[  
        order.orderNo  
    ].date || "";  
}  

return (  
    order.date ||  
    getEffectiveDate(order) ||  
    ""  
);

}
function formatStatus(status) {

switch (status) {  

    case "completed":  
        return "In Packing";  

    case "distributed":  
        return "Distributed";  

    case "ready_to_distribute":  
        return "Ready To Distribute";  

    case "partial":  
        return "Partial";  

    case "returned":  
        return "Returned";  

    case "canceled":  
        return "Canceled";  

    default:  
        return "Pending";  
}

}

function exportReport(reportName, orders) {

try {  

    if (!orders?.length) {  

        alert("No orders found");  
        return;  
    }  

    // 🔥 بيانات خفيفة فقط  
    const rows = orders.map(order => ({  

        Order: order.orderNo || "",  

        Status: formatStatus(  
            order.status || ""  
        ),  

        Warehouses:  
            order.warehouses?.length || 0,  

        Date:  
            getReportDate(order) || ""  

    }));  

    // 🔥 Loading UI  
    const loading =  
        document.getElementById("exportLoading");  

    if (loading) {  
        loading.style.display = "flex";  
    }  

    // 🔥 إنشاء Worker  
    const worker = new Worker(  
        "./excel-worker.js"  
    );  

    worker.postMessage({  
        reportName,  
        rows  
    });  

    worker.onmessage = function (e) {  

        if (loading) {  
            loading.style.display = "none";  
        }  

        const data = e.data;  

        if (!data.success) {  

            alert(  
                "Export failed: " +  
                data.error  
            );  

            worker.terminate();  

            return;  
        }  

        // 🔥 تنزيل الملف  
        const blob = new Blob(  
            [data.buffer],  
            {  
                type:  
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"  
            }  
        );  

        const url =  
            URL.createObjectURL(blob);  

        const a =  
            document.createElement("a");  

        a.href = url;  

        a.download = data.fileName;  

        document.body.appendChild(a);  

        a.click();  

        a.remove();  

        URL.revokeObjectURL(url);  

        worker.terminate();  
    };  

} catch (err) {  

    console.error(err);  

    alert(err.message);  
}

}
async function exportAdvancedExcel() {

const from =  
    document.getElementById("advancedFromDate").value;  

const to =  
    document.getElementById("advancedToDate").value;  

if (!from || !to) {  

    alert("Select date range");  
    return;  
}  

const orders = allOrders.filter(order => {  

    const date = getReportDate(order);  

    if (!date) return false;  

    return date >= from && date <= to;  
});  

if (!orders.length) {  

    alert("No orders found");  
    return;  
}  

// =========================  
// COUNTS  
// =========================  

const total = orders.length;  

const completed =  
    orders.filter(o =>  
        o.status === "completed"  
    ).length;  

const pending =  
    orders.filter(o =>  
        o.status === "pending" ||  
        o.status === "partial"  
    ).length;  

const distributed =  
    orders.filter(o =>  
        o.status === "distributed"  
    ).length;  

const ready =  
    orders.filter(o =>  
        o.status === "ready_to_distribute"  
    ).length;  

const returned =  
    orders.filter(o =>  
        o.status === "returned"  
    ).length;  

const canceled =  
    orders.filter(o =>  
        o.status === "canceled"  
    ).length;  

// =========================  
// PERCENTAGES  
// =========================  

const percent = val =>  
    ((val / total) * 100).toFixed(1);  

// =========================  
// UI STATS  
// =========================  

document.getElementById("reportStats").innerHTML = `  

    ${buildReportCard(  
        "Total Orders",  
        total,  
        "100%"  
    )}  

    ${buildReportCard(  
        "In Packing",  
        completed,  
        percent(completed) + "%"  
    )}  

    ${buildReportCard(  
        "Pending",  
        pending,  
        percent(pending) + "%"  
    )}  

    ${buildReportCard(  
        "Distributed",  
        distributed,  
        percent(distributed) + "%"  
    )}  

    ${buildReportCard(  
        "Ready",  
        ready,  
        percent(ready) + "%"  
    )}  

    ${buildReportCard(  
        "Returned",  
        returned,  
        percent(returned) + "%"  
    )}  

    ${buildReportCard(  
        "Canceled",  
        canceled,  
        percent(canceled) + "%"  
    )}  
`;  

// =========================  
// EXPORT ROWS  
// =========================  

const rows = orders.map(order => ({  

    "Order #": order.orderNo,  

    "Status":  
        formatStatus(order.status),  

    "Warehouse Count":  
        order.warehouses?.length || 0,  

    "Warehouses":  
        order.warehouses  
            ?.map(w => w.base)  
            .join(", "),  

    "Date":  
        getReportDate(order)  
}));  

// =========================  
// SUMMARY  
// =========================  

const summaryRows = [  

    {  
        Metric: "Total Orders",  
        Count: total,  
        Percentage: "100%"  
    },  

    {  
        Metric: "In Packing",  
        Count: completed,  
        Percentage:  
            percent(completed) + "%"  
    },  

    {  
        Metric: "Pending",  
        Count: pending,  
        Percentage:  
            percent(pending) + "%"  
    },  

    {  
        Metric: "Distributed",  
        Count: distributed,  
        Percentage:  
            percent(distributed) + "%"  
    },  

    {  
        Metric: "Ready",  
        Count: ready,  
        Percentage:  
            percent(ready) + "%"  
    },  

    {  
        Metric: "Returned",  
        Count: returned,  
        Percentage:  
            percent(returned) + "%"  
    },  

    {  
        Metric: "Canceled",  
        Count: canceled,  
        Percentage:  
            percent(canceled) + "%"  
    }  
];  

// =========================  
// EXCEL  
// =========================  

const wb = XLSX.utils.book_new();  

const ordersSheet =  
    XLSX.utils.json_to_sheet(rows);  

const summarySheet =  
    XLSX.utils.json_to_sheet(summaryRows);  

XLSX.utils.book_append_sheet(  
    wb,  
    ordersSheet,  
    "Orders"  
);  

XLSX.utils.book_append_sheet(  
    wb,  
    summarySheet,  
    "Summary"  
);  

// WIDTHS  
ordersSheet["!cols"] = [  
    { wch: 18 },  
    { wch: 20 },  
    { wch: 18 },  
    { wch: 40 },  
    { wch: 18 }  
];  

summarySheet["!cols"] = [  
    { wch: 25 },  
    { wch: 15 },  
    { wch: 15 }  
];  

// DOWNLOAD  
XLSX.writeFile(  
    wb,  
    `Report_${from}_to_${to}.xlsx`  
);

}
function buildReportCard(title, value, percent) {

return `  
    <div style="  
        background:#1e293b;  
        padding:18px;  
        border-radius:12px;  
        text-align:center;  
    ">  

        <div style="  
            color:#94a3b8;  
            font-size:13px;  
            margin-bottom:8px;  
        ">  
            ${title}  
        </div>  

        <div style="  
            color:white;  
            font-size:28px;  
            font-weight:800;  
        ">  
            ${value}  
        </div>  

        <div style="  
            margin-top:8px;  
            color:#22c55e;  
            font-size:14px;  
            font-weight:700;  
        ">  
            ${percent}  
        </div>  

    </div>  
`;

}

function toggleAdvancedReports() {

    const box = document.getElementById("advancedReportBox");
    const btn = document.getElementById("toggleAdvancedReportsBtn");

    box.classList.toggle("hidden");

    if (box.classList.contains("hidden")) {
        btn.innerHTML = "📊 Open Analytics";
    } else {
        btn.innerHTML = "❌ Hide Analytics";
    }

}
let statusChart = null;

function loadEnterpriseReport() {

    const from =
        document.getElementById("advancedFromDate").value;

    const to =
        document.getElementById("advancedToDate").value;

    if (!from || !to) {
        alert("Select date range");
        return;
    }

    const orders = allOrders.filter(order => {

        const date = getReportDate(order);

        if (!date) return false;

        return date >= from && date <= to;

    });

    if (!orders.length) {
        alert("No orders found");
        return;
    }

    renderEnterpriseKPIs(orders);
    renderWarehouseAnalytics(orders);
    renderDelayedOrders(orders);
    renderStatusChart(orders);
}

function renderEnterpriseKPIs(orders){

    const total = orders.length;

    const distributed =
        orders.filter(x =>
            x.status === "distributed"
        ).length;

    const packing =
        orders.filter(x =>
            x.status === "completed"
        ).length;

    const pending =
        orders.filter(x =>
            x.status === "pending" ||
            x.status === "partial"
        ).length;

    const ready =
        orders.filter(x =>
            x.status === "ready_to_distribute"
        ).length;

    const returned =
        orders.filter(x =>
            x.status === "returned"
        ).length;

    const canceled =
        orders.filter(x =>
            x.status === "canceled"
        ).length;

    const percent = n =>
        total
        ? ((n / total) * 100).toFixed(1)
        : 0;

    document.getElementById("reportStats").innerHTML = `

    ${buildCard("Total Orders",total,"100%")}
    ${buildCard("In Packing",packing,percent(packing)+"%")}
    ${buildCard("Pending",pending,percent(pending)+"%")}
    ${buildCard("Ready",ready,percent(ready)+"%")}
    ${buildCard("Distributed",distributed,percent(distributed)+"%")}
    ${buildCard("Returned",returned,percent(returned)+"%")}
    ${buildCard("Canceled",canceled,percent(canceled)+"%")}

    `;
}

function buildCard(title,value,percent){

    return `
        <div class="report-card">

            <div class="report-title">
                ${title}
            </div>

            <div class="report-value">
                ${value}
            </div>

            <div class="report-percent">
                ${percent}
            </div>

        </div>
    `;
}

function renderWarehouseAnalytics(orders){

    const stats = {};

    orders.forEach(order=>{

        order.warehouses.forEach(w=>{

            const wh = w.base;

            if(!stats[wh]){

                stats[wh] = {
                    total:0,
                    distributed:0,
                    pending:0
                };

            }

            stats[wh].total++;

            if(order.status==="distributed"){
                stats[wh].distributed++;
            }else{
                stats[wh].pending++;
            }

        });

    });

    let html = `
    <table class="analytics-table">

        <tr>
            <th>Warehouse</th>
            <th>Total</th>
            <th>Distributed</th>
            <th>Rate</th>
        </tr>
    `;

    Object.entries(stats).forEach(([wh,data])=>{

        const rate =
            data.total
            ? ((data.distributed/data.total)*100).toFixed(1)
            : 0;

        html += `
        <tr>
            <td>${wh}</td>
            <td>${data.total}</td>
            <td>${data.distributed}</td>
            <td>${rate}%</td>
        </tr>
        `;

    });

    html += "</table>";

    document.getElementById(
        "warehouseAnalytics"
    ).innerHTML = html;
}

function renderDelayedOrders(orders){

    const today = new Date();

    const delayed = orders
        .map(order=>{

            const days =
                Math.floor(
                    (today - new Date(order.date))
                    /86400000
                );

            return {
                orderNo:order.orderNo,
                days
            };

        })
        .sort((a,b)=>b.days-a.days)
        .slice(0,20);

    let html = `
    <table class="analytics-table">

        <tr>
            <th>Order</th>
            <th>Days Waiting</th>
        </tr>
    `;

    delayed.forEach(d=>{

        html += `
        <tr>
            <td>${d.orderNo}</td>
            <td>${d.days}</td>
        </tr>
        `;

    });

    html += "</table>";

    document.getElementById(
        "delayedOrders"
    ).innerHTML = html;
}

function renderStatusChart(orders){

    const counts = {
        pending:0,
        packing:0,
        ready:0,
        distributed:0,
        returned:0,
        canceled:0
    };

    orders.forEach(order=>{

        switch(order.status){

            case "completed":
                counts.packing++;
                break;

            case "ready_to_distribute":
                counts.ready++;
                break;

            case "distributed":
                counts.distributed++;
                break;

            case "returned":
                counts.returned++;
                break;

            case "canceled":
                counts.canceled++;
                break;

            default:
                counts.pending++;
        }

    });

    const ctx =
        document.getElementById("statusChart");

    if(statusChart){
        statusChart.destroy();
    }

    statusChart = new Chart(ctx,{
        type:"doughnut",
        data:{
            labels:[
                "Pending",
                "Packing",
                "Ready",
                "Distributed",
                "Returned",
                "Canceled"
            ],
            datasets:[{
                data:[
                    counts.pending,
                    counts.packing,
                    counts.ready,
                    counts.distributed,
                    counts.returned,
                    counts.canceled
                ]
            }]
        }
    });
}

function openReportConfig(type) {

    currentReportType = type;

    document.getElementById("reportsTab")
        .classList.add("hidden");

    document.getElementById("reportConfigPage")
        .classList.remove("hidden");
loadReportWarehouses()
    const titles = {

        daily: "Daily Report",

        warehouse: "Warehouse Report",

        pending: "Pending Orders Report",

        distributed: "Distributed Report",

        returned: "Returned Orders Report",

        canceled: "Canceled Orders Report"

    };

    document.getElementById("reportTitle")
        .textContent = titles[type];
}
function generateSelectedReport() {

    const warehouse =
        document.getElementById("reportWarehouse").value;

    const from =
        document.getElementById("reportFrom").value;

    const to =
        document.getElementById("reportTo").value;

    const exportType =
        document.getElementById("reportExportType").value;

    let orders = [...allOrders];

    // Date Filter
    if (from) {
        orders = orders.filter(o =>
            getReportDate(o) >= from
        );
    }

    if (to) {
        orders = orders.filter(o =>
            getReportDate(o) <= to
        );
    }

    // Warehouse Filter
    if (warehouse) {

        orders = orders.filter(order =>
            order.warehouses.some(w =>
                w.base === warehouse
            )
        );
    }

    // Report Type Filter
    switch(currentReportType){

        case "pending":
            orders = orders.filter(o =>
                o.status === "pending" ||
                o.status === "partial"
            );
            break;

        case "distributed":
            orders = orders.filter(o =>
                o.status === "distributed"
            );
            break;

        case "returned":
            orders = orders.filter(o =>
                o.status === "returned"
            );
            break;

        case "canceled":
            orders = orders.filter(o =>
                o.status === "canceled"
            );
            break;
    }

    if(exportType === "excel"){

        exportReport(
            currentReportType + "_report",
            orders
        );

    } else {

        exportPDFReport(
            currentReportType + "_report",
            orders
        );
    }
}
function exportPDFReport(reportName, orders) {

    const doc = new jsPDF();

    doc.text(reportName, 10, 10);

    let y = 20;

    orders.forEach(order => {

        doc.text(
            `${order.orderNo} | ${order.status}`,
            10,
            y
        );

        y += 8;

        if(y > 280){
            doc.addPage();
            y = 20;
        }

    });

    doc.save(reportName + ".pdf");
}
function loadWarehouseOptions() {

    const select =
        document.getElementById("reportWarehouse");

    const warehouses =
        [...new Set(
            allOrders.flatMap(o =>
                o.warehouses.map(w => w.base)
            )
        )];

    select.innerHTML =
        '<option value="">All Warehouses</option>';

    warehouses.forEach(wh => {

        select.innerHTML += `
            <option value="${wh}">
                ${wh}
            </option>
        `;
    });
}
const warehouses = [
    "PHARMA",
    "RETAIL",
    "P&C",
    "LOREAL LUX",
    "BEESLINE",
    "Packing Station"
];

function loadReportWarehouses() {
    const select = document.getElementById("reportWarehouse");
    if (!select) return;

    // نخلي أول option كما هو
    select.innerHTML = `<option value="">All Warehouses</option>`;

    warehouses.forEach(w => {
        const option = document.createElement("option");
        option.value = w;
        option.textContent = w;
        select.appendChild(option);
    });
}
document.querySelectorAll('.date-field input').forEach(input => {

    input.parentElement.addEventListener('click', () => {

        if (input.showPicker) {
            input.showPicker();
        } else {
            input.focus();
        }

    });

});

function renderDistributedCompaniesReport(orders) {
renderDistributedCompaniesReport(orders);
    const companies = {};

    orders.forEach(order => {

        const dist = distributedOrdersMap[order.orderNo];

        if (!dist) return;

        const company = dist.company || "Unknown";

        if (!companies[company]) {
            companies[company] = 0;
        }

        companies[company]++;

    });

    let html = `
        <table class="analytics-table">
            <tr>
                <th>Company</th>
                <th>Distributed Orders</th>
            </tr>
    `;

    Object.entries(companies)
        .sort((a,b) => b[1] - a[1])
        .forEach(([company,count]) => {

            html += `
                <tr>
                    <td>${company}</td>
                    <td>${count}</td>
                </tr>
            `;

        });

    html += `
            <tr style="font-weight:bold;background:#0f172a">
                <td>TOTAL</td>
                <td>${Object.values(companies).reduce((a,b)=>a+b,0)}</td>
            </tr>
        </table>
    `;

    document.getElementById(
        "distributedCompaniesReport"
    ).innerHTML = html;
}
