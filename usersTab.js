/* =========================================================
   usersTab.js  —  "Users & Permissions" screen
   Requires: users.js, utils.js
   ========================================================= */

let usersCache = [];
let editingUsername = null; // null = creating a new user

/* ---------------------------------------------------------
   Navigation
   --------------------------------------------------------- */

function openUsersTab() {
    if (!requirePermission("manageUsers")) return;

    showOnlyTab("usersTab");
    renderUsersTab();
}

/* ---------------------------------------------------------
   List
   --------------------------------------------------------- */

async function renderUsersTab() {
    const host = document.getElementById("usersTab");
    if (!host) return;

    host.innerHTML = `<div class="users-loading">Loading users…</div>`;

    try {
        usersCache = await UserStore.list();
    } catch (err) {
        console.error(err);
        host.innerHTML = `<div class="users-loading">Could not load users.</div>`;
        return;
    }

    const me = localStorage.getItem("currentUser");

    host.innerHTML = `
    <div class="users-page">

        <div class="users-header">
            <div>
                <div class="users-eyebrow">Administration</div>
                <h2>Users &amp; Permissions</h2>
            </div>
            <div class="users-actions">
                <button class="btn btn-primary" onclick="openUserModal()">
                    <i class="fa-solid fa-user-plus"></i> Add user
                </button>
            </div>
        </div>

        <div class="users-table-wrap">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Warehouse</th>
                        <th>Role</th>
                        <th>Access</th>
                        <th>Status</th>
                        <th>Last login</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${usersCache.map(u => renderUserRow(u, me)).join("")}
                </tbody>
            </table>
        </div>
    </div>`;
}

function renderUserRow(u, me) {
    const isMe = u.username.toLowerCase() === (me || "").toLowerCase();
    const roleLabel = ROLE_PRESETS[u.role]?.label || u.role;
    const granted = u.role === "manager"
        ? ALL_PERMISSION_KEYS.length
        : Object.values(u.permissions || {}).filter(Boolean).length;
    const active = u.active !== false;
    const lastLogin = u.lastLogin ? formatLebanonDateTime(u.lastLogin) : "—";
    const name = escapeJsAttr(u.username);

    return `
    <tr class="${active ? "" : "user-row-disabled"}">
        <td><b>${escapeHtml(u.username)}</b>${isMe ? ` <span class="pill pill-info">you</span>` : ""}
            ${u.mustChangePassword ? ` <span class="pill pill-warn" title="Must change password on next login">temp password</span>` : ""}
        </td>
        <td>${escapeHtml(u.displayName || "")}</td>
        <td>${escapeHtml(u.warehouse || "")}</td>
        <td><span class="pill pill-role role-${escapeHtml(u.role)}">${escapeHtml(roleLabel)}</span></td>
        <td>${granted} / ${ALL_PERMISSION_KEYS.length}</td>
        <td><span class="pill ${active ? "pill-ok" : "pill-off"}">${active ? "Active" : "Disabled"}</span></td>
        <td class="muted">${escapeHtml(lastLogin)}</td>
        <td class="users-row-actions">
            <button class="btn btn-ghost" onclick="openUserModal('${name}')" title="Edit">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-ghost" onclick="resetUserPassword('${name}')" title="Reset password">
                <i class="fa-solid fa-key"></i>
            </button>
            <button class="btn btn-ghost" onclick="toggleUserActive('${name}')" title="${active ? "Disable" : "Enable"}" ${isMe ? "disabled" : ""}>
                <i class="fa-solid ${active ? "fa-user-slash" : "fa-user-check"}"></i>
            </button>
            <button class="btn btn-danger" onclick="deleteUser('${name}')" title="Delete" ${isMe ? "disabled" : ""}>
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    </tr>`;
}

/* ---------------------------------------------------------
   Add / edit modal
   --------------------------------------------------------- */

function getModalHost() {
    let host = document.getElementById("userModalHost");
    if (!host) {
        host = document.createElement("div");
        host.id = "userModalHost";
        document.body.appendChild(host);
    }
    return host;
}

function closeUserModal() {
    getModalHost().innerHTML = "";
    editingUsername = null;
}

async function openUserModal(username = null) {
    if (!requirePermission("manageUsers")) return;

    editingUsername = username;
    const existing = username
        ? usersCache.find(u => u.username.toLowerCase() === username.toLowerCase())
        : null;

    const role = existing?.role || "warehouse";
    const permissions = existing
        ? (existing.role === "manager" ? ROLE_PRESETS.manager.permissions : existing.permissions || {})
        : ROLE_PRESETS[role].permissions;

    const warehouseOptions = [...WAREHOUSES, ...SPECIAL_WAREHOUSES]
        .map(w => `<option value="${escapeHtml(w)}" ${existing?.warehouse === w ? "selected" : ""}>${escapeHtml(w)}</option>`)
        .join("");

    const roleOptions = Object.entries(ROLE_PRESETS)
        .map(([key, r]) => `<option value="${key}" ${role === key ? "selected" : ""}>${escapeHtml(r.label)}</option>`)
        .join("");

    const permissionHtml = PERMISSION_GROUPS.map(group => `
        <fieldset class="perm-group">
            <legend>${escapeHtml(group.title)}</legend>
            ${group.items.map(item => `
                <label class="perm-item">
                    <input type="checkbox" class="perm-check" value="${item.key}" ${permissions[item.key] ? "checked" : ""}>
                    <span>${escapeHtml(item.label)}</span>
                </label>`).join("")}
        </fieldset>`).join("");

    getModalHost().innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this)closeUserModal()">
        <div class="modal-card modal-wide">

            <div class="modal-title">
                <h3>${existing ? "Edit user" : "Add user"}</h3>
                <button class="btn btn-ghost" onclick="closeUserModal()">✕</button>
            </div>

            <div class="form-grid">
                <label>Username
                    <input id="uUsername" value="${escapeHtml(existing?.username || "")}"
                        ${existing ? "disabled" : ""} autocomplete="off" placeholder="e.g. pharmaUser2">
                </label>

                <label>Display name
                    <input id="uDisplay" value="${escapeHtml(existing?.displayName || "")}" autocomplete="off">
                </label>

                <label>Warehouse
                    <select id="uWarehouse">${warehouseOptions}</select>
                </label>

                <label>Role (preset)
                    <select id="uRole" onchange="onUserRoleChange(this.value)">${roleOptions}</select>
                </label>

                <label>${existing ? "New password (leave empty to keep)" : "Password"}
                    <input id="uPassword" type="password" autocomplete="new-password" placeholder="min. 6 characters">
                </label>

                <div class="form-checks">
                    <label class="perm-item">
                        <input type="checkbox" id="uMustChange" ${!existing ? "checked" : ""}>
                        <span>Must change password at next login</span>
                    </label>
                    <label class="perm-item">
                        <input type="checkbox" id="uActive" ${existing?.active === false ? "" : "checked"}>
                        <span>Account active</span>
                    </label>
                </div>
            </div>

            <div class="perm-head">
                <h4>Permissions</h4>
                <span class="muted">Pick a role to fill the defaults, then adjust freely. Managers always have everything.</span>
            </div>

            <div class="perm-grid">${permissionHtml}</div>

            <p id="uError" class="form-error hidden"></p>

            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeUserModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveUserFromModal()">Save</button>
            </div>
        </div>
    </div>`;

    syncPermissionLock();
}

function onUserRoleChange(role) {
    if (role !== "custom") {
        const preset = ROLE_PRESETS[role].permissions;
        document.querySelectorAll(".perm-check").forEach(cb => {
            cb.checked = preset[cb.value] === true;
        });
    }
    syncPermissionLock();
}

/** A manager always has every permission, so the boxes are locked. */
function syncPermissionLock() {
    const isManager = document.getElementById("uRole")?.value === "manager";
    document.querySelectorAll(".perm-check").forEach(cb => {
        if (isManager) cb.checked = true;
        cb.disabled = isManager;
    });
}

function showUserError(message) {
    const el = document.getElementById("uError");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("hidden", !message);
}

async function saveUserFromModal() {
    if (!requirePermission("manageUsers")) return;

    const isNew = !editingUsername;
    const username = (isNew
        ? document.getElementById("uUsername").value
        : editingUsername).trim();
    const displayName = document.getElementById("uDisplay").value.trim();
    const warehouse = document.getElementById("uWarehouse").value;
    const role = document.getElementById("uRole").value;
    const password = document.getElementById("uPassword").value;
    const mustChange = document.getElementById("uMustChange").checked;
    const active = document.getElementById("uActive").checked;

    const permissions = {};
    document.querySelectorAll(".perm-check").forEach(cb => {
        if (cb.checked) permissions[cb.value] = true;
    });

    /* ---- validation ---- */
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) {
        return showUserError("Username: 3–32 characters, letters, numbers, _ or - only");
    }
    if (isNew && password.length < 6) {
        return showUserError("Password must be at least 6 characters");
    }
    if (!isNew && password && password.length < 6) {
        return showUserError("New password must be at least 6 characters");
    }
    if (isNew && (await UserStore.get(username))) {
        return showUserError("This username already exists");
    }
    if (!Object.keys(permissions).length && role !== "manager") {
        return showUserError("Select at least one permission");
    }

    const previous = isNew ? null : await UserStore.get(username);

    /* ---- never lock everybody out ---- */
    if (previous && previous.role === "manager" && (role !== "manager" || !active)) {
        if ((await UserStore.activeManagerCount()) <= 1) {
            return showUserError("At least one active manager is required");
        }
    }
    if (!isNew && username.toLowerCase() === (localStorage.getItem("currentUser") || "").toLowerCase()) {
        if (role !== "manager" && localStorage.getItem("userRole") === "manager") {
            return showUserError("You cannot remove your own manager role");
        }
        if (!active) {
            return showUserError("You cannot disable your own account");
        }
    }

    try {
        const record = await UserStore.build(
            { username, displayName, warehouse, role, permissions, active, password, mustChangePassword: mustChange },
            previous
        );

        if (isNew) record.createdBy = localStorage.getItem("currentUser") || "unknown";
        // password untouched: the existing hash stays, only the flag follows the checkbox
        if (!password && previous) record.mustChangePassword = mustChange;

        await UserStore.save(record);

        showToast(isNew ? "User created" : "User updated", "success");
        closeUserModal();
        renderUsersTab();

    } catch (err) {
        console.error(err);
        showUserError("Could not save the user. Try again.");
    }
}

/* ---------------------------------------------------------
   Row actions
   --------------------------------------------------------- */

async function toggleUserActive(username) {
    if (!requirePermission("manageUsers")) return;

    const user = await UserStore.get(username);
    if (!user) return;

    const nowActive = user.active !== false;

    if (nowActive && user.role === "manager" && (await UserStore.activeManagerCount()) <= 1) {
        showToast("At least one active manager is required", "error");
        return;
    }

    await UserStore.save({ username: user.username, active: !nowActive, updatedAt: new Date().toISOString() });
    showToast(nowActive ? "User disabled" : "User enabled", "success");
    renderUsersTab();
}

async function deleteUser(username) {
    if (!requirePermission("manageUsers")) return;

    const user = await UserStore.get(username);
    if (!user) return;

    if (user.role === "manager" && user.active !== false && (await UserStore.activeManagerCount()) <= 1) {
        showToast("At least one active manager is required", "error");
        return;
    }
    if (!(await confirmDialog(`Delete user "${user.username}" permanently?`, { title: "Delete user", okText: "Delete", danger: true }))) return;

    await UserStore.delete(username);
    showToast("User deleted", "success");
    renderUsersTab();
}

async function resetUserPassword(username) {
    if (!requirePermission("manageUsers")) return;

    const temp = await promptDialog(
        `Temporary password for "${username}" (min. 6 characters). The user will be asked to change it at next login.`,
        { title: "Reset password", type: "password", okText: "Reset" }
    );
    if (temp === null) return;
    if (temp.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }

    const salt = randomSalt();
    await UserStore.save({
        username,
        salt,
        passwordHash: await hashPassword(temp, salt),
        mustChangePassword: true,
        updatedAt: new Date().toISOString()
    });

    showToast("Password reset", "success");
    renderUsersTab();
}

/* ---------------------------------------------------------
   Change my own password (also forced after first login)
   --------------------------------------------------------- */

function showChangePasswordModal(force = false) {
    getModalHost().innerHTML = `
    <div class="modal-backdrop" ${force ? "data-force" : `onclick="if(event.target===this)closeUserModal()"`}>
        <div class="modal-card">

            <div class="modal-title">
                <h3>${force ? "Set a new password" : "Change password"}</h3>
                ${force ? "" : `<button class="btn btn-ghost" onclick="closeUserModal()">✕</button>`}
            </div>

            ${force ? `<p class="muted">You are using a temporary password. Choose a new one to continue.</p>` : ""}

            <div class="form-stack">
                <label>Current password
                    <input id="cpOld" type="password" autocomplete="current-password">
                </label>
                <label>New password
                    <input id="cpNew" type="password" autocomplete="new-password">
                </label>
                <label>Repeat new password
                    <input id="cpNew2" type="password" autocomplete="new-password">
                </label>
            </div>

            <p id="uError" class="form-error hidden"></p>

            <div class="modal-footer">
                ${force
                    ? `<button class="btn btn-ghost" onclick="Auth.logout()">Logout</button>`
                    : `<button class="btn btn-ghost" onclick="closeUserModal()">Cancel</button>`}
                <button class="btn btn-primary" onclick="submitChangePassword(${force})">Save</button>
            </div>
        </div>
    </div>`;

    setTimeout(() => document.getElementById("cpOld")?.focus(), 50);
}

async function submitChangePassword(force) {
    const oldPass = document.getElementById("cpOld").value;
    const newPass = document.getElementById("cpNew").value;
    const newPass2 = document.getElementById("cpNew2").value;

    if (newPass !== newPass2) return showUserError("Passwords do not match");

    const result = await Auth.changePassword(localStorage.getItem("currentUser"), oldPass, newPass);
    if (!result.ok) return showUserError(result.error);

    localStorage.setItem("mustChangePassword", "false");
    showToast("Password changed", "success");
    closeUserModal();
}
