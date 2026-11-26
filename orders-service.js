/* =========================================================
   orders-service.js  —  one place that knows about the two
   Firebase collections ("orders" and "orders_new").
   Every tab used to copy/paste this loop (and some forgot one
   of the paths, or referenced an undefined `allOrdersMap`).
   ========================================================= */

const ORDER_PATHS = ["orders", "orders_new"];

/** Returns [{ path, key, data }] for every record that holds this order number. */
async function findOrderRecords(orderNo) {
    const wanted = String(orderNo || "").trim().toUpperCase();
    if (!wanted) return [];

    const snaps = await Promise.all(ORDER_PATHS.map(p => get(ref(db, p))));
    const found = [];

    snaps.forEach((snap, i) => {
        snap.forEach(child => {
            const data = child.val();
            if (String(data?.orderNo || "").trim().toUpperCase() === wanted) {
                found.push({ path: ORDER_PATHS[i], key: child.key, data });
            }
        });
    });

    return found;
}

/**
 * Update every record of an order.
 * `build(record)` returns the patch object (or null to skip).
 * `historyEntry` (optional) is appended to the record history.
 */
async function updateOrderRecords(orderNo, build, historyEntry = null) {
    const records = await findOrderRecords(orderNo);
    if (!records.length) return 0;

    const writes = [];

    records.forEach(rec => {
        const patch = build(rec.data, rec);
        if (!patch) return;

        if (historyEntry) {
            patch.history = [
                ...(rec.data.history || []),
                { date: new Date().toISOString(), by: currentActor(), ...historyEntry }
            ];
        }

        writes.push(update(ref(db, `${rec.path}/${rec.key}`), patch));
    });

    await Promise.all(writes);
    return writes.length;
}

async function removeOrderRecords(orderNo) {
    const records = await findOrderRecords(orderNo);
    await Promise.all(records.map(r => remove(ref(db, `${r.path}/${r.key}`))));
    return records.length;
}

/** Name that is written to history entries. */
function currentActor() {
    return localStorage.getItem("currentUser")
        || localStorage.getItem("currentWarehouse")
        || "unknown";
}

/** Local mirror so the UI reacts before Firebase echoes the change back. */
function patchLocalOrder(orderNo, patch) {
    const o = allOrders.find(x => x.orderNo === orderNo);
    if (o) Object.assign(o, patch);
    return o;
}

/**
 * Same as updateOrderRecords but for many orders with ONE read of each
 * collection (the old loops re-downloaded everything per order).
 * `build(data, rec)` -> patch | null     `history(data, rec)` -> entry | null
 */
async function updateOrdersBulk(orderNos, build, history = null) {
    const wanted = new Set(orderNos.map(n => String(n || "").trim().toUpperCase()));
    const snaps = await Promise.all(ORDER_PATHS.map(p => get(ref(db, p))));
    const writes = [];

    snaps.forEach((snap, i) => {
        snap.forEach(child => {
            const data = child.val();
            const no = String(data?.orderNo || "").trim().toUpperCase();
            if (!wanted.has(no)) return;

            const rec = { path: ORDER_PATHS[i], key: child.key, data };
            const patch = build(data, rec);
            if (!patch) return;

            const entry = history ? history(data, rec) : null;
            if (entry) {
                patch.history = [
                    ...(data.history || []),
                    { date: new Date().toISOString(), by: currentActor(), ...entry }
                ];
            }

            writes.push(update(ref(db, `${rec.path}/${rec.key}`), patch));
        });
    });

    await Promise.all(writes);
    return writes.length;
}
