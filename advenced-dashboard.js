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
    // document.getElementById("aboutTab")?.classList.add("hidden");
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

orders
    .filter(order => order.status === "completed") // In-Packing
    .forEach(order => {

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

                        text: "Order Daily",

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
