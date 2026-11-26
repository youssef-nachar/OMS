/* =========================================================
   users.js  —  users, roles, permissions and authentication

   • Users live in Firebase under  /users/{username}
   • Passwords are stored as salted SHA-256 hashes (never plain text)
   • Every user has a role preset + an editable permission set
   • can("permission") is the single source of truth for the UI

   IMPORTANT (honest limitation): this is client-side access control.
   It keeps normal users out of screens and actions, but anybody who
   can open DevTools can still talk to Firebase directly. Real
   protection needs Firebase Authentication + Realtime Database rules.
   ========================================================= */

/* ---------------------------------------------------------
   1) Constants
   --------------------------------------------------------- */

const WAREHOUSES = ["PHARMA", "RETAIL", "P&C", "LOREAL LUX", "BEESLINE"];

const SPECIAL_WAREHOUSES = ["Packing Station", "MYHOLDAL TEAM", "Manager"];

/** Grouped so the Users tab can render them as sections. */
const PERMISSION_GROUPS = [
    {
        title: "Pages",
        items: [
            { key: "viewDashboard", label: "Dashboard" },
            { key: "viewAdvanced", label: "Advanced Dashboard" },
            { key: "viewOrders", label: "Orders Overview" },
            { key: "viewReady", label: "Ready To Distribute" },
            { key: "viewReturns", label: "Returns" },
            { key: "viewReports", label: "Reports & Analytics" },
            { key: "viewSales", label: "Sales Report" },
            { key: "viewComplaints", label: "Order Complain" }
        ]
    },
    {
        title: "Orders",
        items: [
            { key: "addOrders", label: "Add / scan new orders" },
            { key: "receivePacking", label: "Receive orders in packing" },
            { key: "editOrders", label: "Edit order number" },
            { key: "deleteOrders", label: "Delete orders" },
            { key: "cancelOrders", label: "Cancel orders" },
            { key: "viewHistory", label: "View order history" },
            { key: "orderFilters", label: "Advanced order filters" },
            { key: "viewAllWarehouses", label: "See orders of all warehouses" },
            { key: "filterByWarehouse", label: "Warehouse filter dropdown" }
        ]
    },
    {
        title: "Distribution & Returns",
        items: [
            { key: "manageReady", label: "Add to Ready / mark Checked / edit" },
            { key: "distribute", label: "Distribute orders" },
            { key: "manageReturns", label: "Create & execute returns" },
            { key: "manageSettings", label: "Batch settings" }
        ]
    },
    {
        title: "Other",
        items: [
            { key: "manageComplaints", label: "Add / edit / delete complaints" },
            { key: "exportData", label: "Export to Excel / PDF" },
            { key: "switchWarehouse", label: "Switch to a warehouse view" },
            { key: "teamNotes", label: "Team notes" },
            { key: "manageUsers", label: "Manage users (this tab)" }
        ]
    }
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

function permissionSet(keys) {
    const out = {};
    keys.forEach(k => (out[k] = true));
    return out;
}

/** Presets are only a starting point — each user can be customised. */
const ROLE_PRESETS = {
    manager: {
        label: "Manager",
        permissions: permissionSet(ALL_PERMISSION_KEYS)
    },
    warehouse: {
        label: "Warehouse user",
        permissions: permissionSet(["viewOrders", "addOrders", "viewComplaints"])
    },
    packing: {
        label: "Packing station",
        permissions: permissionSet([
            "viewOrders", "viewAllWarehouses", "receivePacking", "orderFilters",
            "viewReady", "manageReady", "viewComplaints", "exportData"
        ])
    },
    distribution: {
        label: "Distribution",
        permissions: permissionSet([
            "viewOrders", "viewAllWarehouses", "viewReady", "distribute",
            "viewReturns", "manageReturns", "exportData"
        ])
    },
    viewer: {
        label: "Viewer (read only)",
        permissions: permissionSet(["viewOrders", "viewAllWarehouses", "viewDashboard"])
    },
    custom: {
        label: "Custom",
        permissions: {}
    }
};

/** Used once, to seed an empty database. Every seeded user must change the password. */
const DEFAULT_PASSWORD = "123456";

const DEFAULT_USERS = [
    { username: "manager",       displayName: "Manager",          warehouse: "Manager",         role: "manager" },
    { username: "pharmaUser",    displayName: "PHARMA",           warehouse: "PHARMA",          role: "warehouse" },
    { username: "retailUser",    displayName: "RETAIL",           warehouse: "RETAIL",          role: "warehouse" },
    { username: "pcUser",        displayName: "P&C",              warehouse: "P&C",             role: "warehouse" },
    { username: "lorealLuxUser", displayName: "LOREAL LUX",       warehouse: "LOREAL LUX",      role: "warehouse" },
    { username: "beeslineUser",  displayName: "BEESLINE",         warehouse: "BEESLINE",        role: "warehouse" },
    { username: "packingUser",   displayName: "Packing Station",  warehouse: "Packing Station", role: "packing" },
    { username: "myholdal",      displayName: "MyHoldal Team",    warehouse: "MYHOLDAL TEAM",   role: "viewer" }
];

const SESSION_HOURS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

/* ---------------------------------------------------------
   2) Hashing (SHA-256, with a pure-JS fallback for
      non-secure contexts where crypto.subtle is missing)
   --------------------------------------------------------- */

function sha256Fallback(message) {
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    const bytes = Array.from(new TextEncoder().encode(message));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);

    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    for (let off = 0; off < bytes.length; off += 64) {
        const w = new Array(64);
        for (let i = 0; i < 16; i++) {
            w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) |
                   (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
        }
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0;
            d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

async function sha256Hex(text) {
    if (window.crypto?.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256Fallback(text);
}

function randomSalt() {
    const arr = new Uint8Array(16);
    (window.crypto || {}).getRandomValues?.(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("")
        || String(Math.random()).slice(2);
}

async function hashPassword(password, salt) {
    return sha256Hex(`${salt}:${password}`);
}

/* ---------------------------------------------------------
   3) Permissions
   --------------------------------------------------------- */

let _permCache = null;

function loadPermissionsFromSession() {
    try {
        _permCache = JSON.parse(localStorage.getItem("userPermissions") || "{}");
    } catch {
        _permCache = {};
    }
    return _permCache;
}

/** can("distribute") — managers always pass, so new permissions never lock them out. */
function can(permission) {
    if (localStorage.getItem("userRole") === "manager") return true;
    if (!_permCache) loadPermissionsFromSession();
    return _permCache[permission] === true;
}

function canAny(...permissions) {
    return permissions.some(can);
}

/** Use at the top of any sensitive action:  if (!requirePermission("distribute")) return; */
function requirePermission(permission, message) {
    if (can(permission)) return true;
    showToast(message || "You do not have permission to do this", "error");
    return false;
}

/** Hides every element that declares  data-perm="x"  or  data-perm-any="x,y". */
function applyPermissionsToUI(root = document) {
    root.querySelectorAll("[data-perm]").forEach(el => {
        el.classList.toggle("perm-hidden", !can(el.dataset.perm));
    });
    root.querySelectorAll("[data-perm-any]").forEach(el => {
        const keys = el.dataset.permAny.split(",").map(s => s.trim());
        el.classList.toggle("perm-hidden", !canAny(...keys));
    });
}

/* ---------------------------------------------------------
   4) User store (Firebase)
   --------------------------------------------------------- */

const UserStore = {

    key(username) {
        return firebaseSafeKey(String(username || "").trim().toLowerCase());
    },

    async get(username) {
        const snap = await get(ref(db, `users/${this.key(username)}`));
        return snap.exists() ? snap.val() : null;
    },

    async list() {
        const snap = await get(ref(db, "users"));
        if (!snap.exists()) return [];
        return Object.values(snap.val())
            .sort((a, b) => a.username.localeCompare(b.username));
    },

    async exists() {
        const snap = await get(ref(db, "users"));
        return snap.exists();
    },

    async save(user) {
        await update(ref(db, `users/${this.key(user.username)}`), user);
    },

    async delete(username) {
        await remove(ref(db, `users/${this.key(username)}`));
    },

    /** Builds a complete record (hash included) from form data. */
    async build({ username, displayName, warehouse, role, permissions, active, password, mustChangePassword }, previous = null) {
        const record = {
            username: String(username).trim(),
            displayName: String(displayName || username).trim(),
            warehouse,
            role,
            permissions: role === "manager" ? permissionSet(ALL_PERMISSION_KEYS) : (permissions || {}),
            active: active !== false,
            updatedAt: new Date().toISOString()
        };

        if (password) {
            record.salt = randomSalt();
            record.passwordHash = await hashPassword(password, record.salt);
            record.mustChangePassword = mustChangePassword === true;
        }

        if (!previous) record.createdAt = new Date().toISOString();

        return record;
    },

    /** Seeds an empty database with the old hard-coded users (password must be changed on first login). */
    async seedDefaults() {
        for (const u of DEFAULT_USERS) {
            const record = await this.build({
                ...u,
                permissions: ROLE_PRESETS[u.role].permissions,
                active: true,
                password: DEFAULT_PASSWORD,
                mustChangePassword: true
            });
            record.createdBy = "system";
            await this.save(record);
        }
    },

    async activeManagerCount() {
        const users = await this.list();
        return users.filter(u => u.role === "manager" && u.active !== false).length;
    }
};

/* ---------------------------------------------------------
   5) Authentication / session
   --------------------------------------------------------- */

const Auth = {

    /* ---- brute force protection ---- */

    _lockState() {
        try {
            return JSON.parse(localStorage.getItem("loginLock") || "{}");
        } catch {
            return {};
        }
    },

    lockRemainingSeconds() {
        const s = this._lockState();
        if (!s.until) return 0;
        const left = Math.ceil((s.until - Date.now()) / 1000);
        return left > 0 ? left : 0;
    },

    _registerFailure() {
        const s = this._lockState();
        const attempts = (s.attempts || 0) + 1;
        const next = { attempts };
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            next.until = Date.now() + LOCKOUT_SECONDS * 1000;
            next.attempts = 0;
        }
        localStorage.setItem("loginLock", JSON.stringify(next));
    },

    _clearFailures() {
        localStorage.removeItem("loginLock");
    },

    /* ---- login ---- */

    async login(username, password) {
        const locked = this.lockRemainingSeconds();
        if (locked) {
            return { ok: false, error: `Too many attempts. Try again in ${locked}s.` };
        }

        try {
            if (!(await UserStore.exists())) {
                await UserStore.seedDefaults();
            }

            const user = await UserStore.get(username);

            if (!user || user.active === false) {
                this._registerFailure();
                return { ok: false, error: "Incorrect username or password" };
            }

            const hash = await hashPassword(password, user.salt || "");
            if (hash !== user.passwordHash) {
                this._registerFailure();
                return { ok: false, error: "Incorrect username or password" };
            }

            this._clearFailures();
            await update(ref(db, `users/${UserStore.key(user.username)}`), {
                lastLogin: new Date().toISOString()
            });

            this.startSession(user);
            return { ok: true, user };

        } catch (err) {
            console.error("Login error:", err);
            return { ok: false, error: "Could not reach the server. Check your connection." };
        }
    },

    /** Mirrors the user to the localStorage keys the old code already reads. */
    startSession(user) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", user.username);
        localStorage.setItem("currentUserName", user.displayName || user.username);
        localStorage.setItem("currentWarehouse", user.warehouse);
        localStorage.setItem("userWarehouse", user.warehouse);
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("userPermissions", JSON.stringify(user.permissions || {}));
        localStorage.setItem("sessionExpires", String(Date.now() + SESSION_HOURS * 3600 * 1000));
        _permCache = null;
    },

    isLoggedIn() {
        if (localStorage.getItem("isLoggedIn") !== "true") return false;
        const exp = Number(localStorage.getItem("sessionExpires") || 0);
        return !exp || Date.now() < exp;
    },

    /**
     * Re-reads the user from Firebase so that disabling a user or
     * changing permissions takes effect without waiting for logout.
     */
    async refresh() {
        const username = localStorage.getItem("currentUser");
        if (!username) return null;

        if (localStorage.getItem("impersonator")) return { impersonating: true };

        try {
            const user = await UserStore.get(username);
            if (!user || user.active === false) {
                this.logout(false);
                return null;
            }
            const expires = localStorage.getItem("sessionExpires");
            this.startSession(user);
            if (expires) localStorage.setItem("sessionExpires", expires);
            return user;
        } catch (err) {
            console.warn("Session refresh skipped:", err);
            return { offline: true };
        }
    },

    logout(reload = true) {
        [
            "isLoggedIn", "currentUser", "currentUserName", "currentWarehouse",
            "userWarehouse", "userRole", "userPermissions", "sessionExpires", "impersonator"
        ].forEach(k => localStorage.removeItem(k));
        _permCache = null;
        if (reload) location.reload();
    },

    async changePassword(username, oldPassword, newPassword) {
        const user = await UserStore.get(username);
        if (!user) return { ok: false, error: "User not found" };

        const oldHash = await hashPassword(oldPassword, user.salt || "");
        if (oldHash !== user.passwordHash) {
            return { ok: false, error: "Current password is incorrect" };
        }
        if (newPassword.length < 6) {
            return { ok: false, error: "New password must be at least 6 characters" };
        }
        if (newPassword === DEFAULT_PASSWORD) {
            return { ok: false, error: "Choose a password different from the default one" };
        }

        const salt = randomSalt();
        await update(ref(db, `users/${UserStore.key(username)}`), {
            salt,
            passwordHash: await hashPassword(newPassword, salt),
            mustChangePassword: false,
            updatedAt: new Date().toISOString()
        });
        return { ok: true };
    },

    /* ---- "view as warehouse" (replaces loginAsWarehouse without a password) ---- */

    async switchToWarehouse(warehouse) {
        if (!requirePermission("switchWarehouse")) return;

        const users = await UserStore.list();
        const target = users.find(u =>
            u.warehouse === warehouse && u.active !== false && u.role !== "manager"
        );

        if (!target) {
            showToast(`No active user is assigned to ${warehouse}`, "error");
            return;
        }

        if (!localStorage.getItem("impersonator")) {
            localStorage.setItem("impersonator", JSON.stringify({
                username: localStorage.getItem("currentUser"),
                name: localStorage.getItem("currentUserName")
            }));
        }

        const original = JSON.parse(localStorage.getItem("impersonator"));
        this.startSession(target);
        localStorage.setItem("impersonator", JSON.stringify(original));
        location.reload();
    },

    async stopImpersonation() {
        const raw = localStorage.getItem("impersonator");
        if (!raw) return;

        const { username } = JSON.parse(raw);
        localStorage.removeItem("impersonator");

        const user = await UserStore.get(username);
        if (!user) return this.logout();

        this.startSession(user);
        location.reload();
    }
};

function renderImpersonationBanner() {
    const raw = localStorage.getItem("impersonator");
    const existing = document.getElementById("impersonationBanner");
    if (!raw) {
        existing?.remove();
        return;
    }
    if (existing) return;

    const { name } = JSON.parse(raw);
    const banner = document.createElement("div");
    banner.id = "impersonationBanner";
    banner.className = "impersonation-banner";
    banner.innerHTML = `
        <span>Viewing as <b>${escapeHtml(localStorage.getItem("currentWarehouse"))}</b></span>
        <button type="button" onclick="Auth.stopImpersonation()">
            Return to ${escapeHtml(name || "manager")}
        </button>`;
    document.body.prepend(banner);
}

/** Backward compatible wrapper — the sidebar still calls this name. */
function loginAsWarehouse(warehouseName) {
    Auth.switchToWarehouse(warehouseName);
}