function updateSearch() {
    const query = document.getElementById("orderSearch").value.trim().toLowerCase();
    const resultsDiv = document.getElementById("searchResultsCard");
    const tableDiv = document.getElementById("searchResultsTable");

    if (!query) {
        resultsDiv.style.display = "none";
        return;
    }

const filtered = allOrders.filter(o => {
    const orderNo = o?.orderNo;

    if (!orderNo) return false;

    return orderNo.toLowerCase().includes(query);
});

    if (!filtered.length) {
        tableDiv.innerHTML =
            "<p style='color:var(--warning)'>No matching orders found.</p>";
        resultsDiv.style.display = "block";
        return;
    }

    tableDiv.innerHTML = `  
    <table>  
<tr>
    <th>Order #</th>
    <th>Warehouses</th>
    <th>Received</th>
    <th>Packing</th>
    <th>Distributed</th>
    <th>Batch</th>
    <th>Status</th>
    <th>Comment</th>
</tr>

        ${filtered.map(order => {
const distributedInfo = distributedOrdersMap[order.orderNo];

const receivedHTML = order.warehouses
    .map(w => `
        <div>
            <b>${w.base.toUpperCase()}</b><br>
            ${formatLebanonDateTime(w.receivedTime) || "-"}
        </div>
    `)
    .join("<hr style='margin:4px 0;border-color:#334155;'>");

const packingHTML = order.warehouses
    .map(w => `
        <div>
            <b>${w.base.toUpperCase()}</b><br>
            ${formatLebanonDateTime(w.packingTime) || "-"}
        </div>
    `)
    .join("<hr style='margin:4px 0;border-color:#334155;'>");

        /* ---------------- STATUS ---------------- */

        let statusText = "";

        if ( order.status === "distributed"){
            statusText = `<span style="color:#22c55e;font-weight:600;">Distributed</span>`;
        }
        else if(order.status ==="ready_to_distribute"){
              statusText = `<span style="color:#3b82f6;font-weight:600;">ready to Distributed</span>`;

        }
        else if (order.status === "canceled") {
            statusText = `<span style="color:#f59e0b;font-weight:600;">canceled</span>`;
        }
        else if (order.status === "completed") {
            statusText = `<span style="color:#22c55e;font-weight:600;">In-Packing</span>`;
        }
        else if (order.status === "partial") {
            statusText = `<span style="color:#f59e0b;font-weight:600;">Partial</span>`;
        }
        else {
            statusText = `<span style="color:#f59e0b;font-weight:600;">Pending</span>`;
        }

        /* ---------------- WAREHOUSES ---------------- */

        const warehousesHTML = `  
                <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;align-items:center">  
                    ${order.warehouses.map(w => {

            const color = getWarehouseBadgeColor(order, w);

            let tooltipText = "";

const distributedInfo = distributedOrdersMap[order.orderNo];

tooltipText = `
<b>${w.base.toUpperCase()}</b><br><br>

📥 <b>Received:</b><br>
${formatLebanonDateTime(w.receivedTime) || "-"}

<br><br>

📦 <b>Packing:</b><br>
${formatLebanonDateTime(w.packingTime) || "-"}

<br><br>

🚚 <b>Distributed:</b><br>
${distributedInfo?.date || "-"}

<br><br>

🏷️ <b>Batch:</b>
${distributedInfo?.batch || "-"}
`;

            return `  
                        <div style="position:relative;display:inline-block;">  
                            <span style="  
                                display:inline-block;  
                                padding:5px 10px;  
                                border-radius:8px;  
                                font-size:12px;  
                                font-weight:600;  
                                background:${color};  
                                color:black;  
                                cursor:pointer;  
                            ">  
                                ${w.base.toUpperCase()}  
                            </span>  
  
<div style="
    position:absolute;
    bottom:130%;
    left:50%;
    transform:translateX(-50%);
    background:#0f172a;
    color:white;
    padding:10px 12px;
    border-radius:8px;
    font-size:12px;
    white-space:normal;
    min-width:220px;
    text-align:left;
    line-height:1.5;
    opacity:0;
    pointer-events:none;
    transition:.2s ease;
    box-shadow:0 8px 25px rgba(0,0,0,.4);
    z-index:9999;
" class="wh-tooltip">
    ${tooltipText}
</div>

                        </div>  
                        `;
        }).join("")}  
                </div>  
            `;

        /* ---------------- DISTRIBUTED BOX ---------------- */

        const distributedBox =
            order.status === "distributed" && distributedOrdersMap[order.orderNo]
                ? `  
                <div style="  
                    margin-top:8px;  
                    padding:8px 10px;  
                    border-radius:10px;  
                    background:#022c22;  
                    border:1px solid #065f46;  
                    font-size:12px;  
                    display:inline-block;  
                ">  
                    <div style="color:#22c55e;font-weight:600;">  
                        <i class="fa-solid fa-truck"></i>  
                        Distributed by ${distributedOrdersMap[order.orderNo].company}  
                    </div>  

                </div>  
                `
                : "";

        /* ---------------- ROW ---------------- */

        return `  
                <tr>  
                    <td>  
                        <div style="font-weight:600;">  
                            ${order.orderNo}  
                        </div>  
                        ${distributedBox}  
                    </td>  
  
<td>${warehousesHTML}</td>

<td style="font-size:12px;">
    ${receivedHTML}
</td>

<td style="font-size:12px;">
    ${packingHTML}
</td>

<td style="font-size:12px;">
    ${distributedInfo?.date || "-"}
</td>

<td style="font-size:12px;">
    ${distributedInfo?.batch || "-"}
</td>

<td>${statusText}</td>

                    <td style="
    color:#38bdf8;
    font-size:12px;
    max-width:200px;
    word-break:break-word;
">
    ${order.comment ? order.comment : "-"}
</td>
                </tr>  
            `;
    }).join("")}  
    </table>  
    `;

    /* -------- Tooltip Hover Fix -------- */

    setTimeout(() => {
        document.querySelectorAll("td div > span").forEach(badge => {
            badge.addEventListener("mouseenter", function () {
                const tooltip = this.parentElement.querySelector(".wh-tooltip");
                if (tooltip) tooltip.style.opacity = "1";
            });
            badge.addEventListener("mouseleave", function () {
                const tooltip = this.parentElement.querySelector(".wh-tooltip");
                if (tooltip) tooltip.style.opacity = "0";
            });
        });
    }, 0);

    resultsDiv.style.display = "block";
}
