// REPLACE WITH YOUR ACTUAL PANTRY ID
const PANTRY_ID = "42f7bc17-4c7d-4314-9a0d-19f876d39db6";
const PANTRY_URL = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/driver_data`;

// Local state
let localData = {
    questions: [],
    groups: [],
    history: []
};

// --- CORE FUNCTIONS (The "Bulletproof" Logic) ---

async function loadData() {
    console.log("Fetching data from Pantry...");
    const statusLabel = document.getElementById("statusLabel");
    if (statusLabel) statusLabel.innerText = "🔄 Loading...";

    try {
        const res = await fetch(PANTRY_URL);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const serverData = await res.json();
        
        // Sanitize: Ensure arrays exist even if Pantry is empty
        localData.questions = Array.isArray(serverData.questions) ? serverData.questions : [];
        localData.groups = Array.isArray(serverData.groups) ? serverData.groups : [];
        localData.history = Array.isArray(serverData.history) ? serverData.history : [];

        renderAll();
        if (statusLabel) statusLabel.innerText = "✅ Ready";

    } catch (e) {
        console.error("Load Error:", e);
        if (statusLabel) statusLabel.innerText = "❌ Connection Failed";
        alert("Error loading data. Check your internet or Pantry ID.");
    }
}

/**
 * SMART SAVE: Fetches latest server data first to avoid overwriting bot activity.
 */
async function saveData(loadingBtn = null) {
    // 1. UI Feedback: Lock the button
    let originalText = "Save";
    if (loadingBtn) {
        originalText = loadingBtn.innerText;
        loadingBtn.innerText = "⏳ Saving...";
        loadingBtn.disabled = true;
    }

    try {
        // 2. Fetch Latest Server Data (Critical Step!)
        const res = await fetch(PANTRY_URL);
        const serverData = res.ok ? await res.json() : { groups: [], history: [] };

        // 3. INTELLIGENT MERGE
        // Rule A: Questions -> Admin is boss. We overwrite server questions with ours.
        // Rule B: History -> Server is boss. Bot adds history, we just view it.
        const mergedHistory = serverData.history || [];
        
        // Rule C: Groups -> MERGE. Keep server's new groups, update Admin's status changes.
        // We take our local groups, but check if the server has any NEW ones we missed.
        const serverGroups = serverData.groups || [];
        const mergedGroups = [...localData.groups];

        serverGroups.forEach(serverGroup => {
            // If this group is NOT in our local list, add it (Bot found a new group)
            const exists = mergedGroups.find(g => g.id === serverGroup.id);
            if (!exists) {
                mergedGroups.push(serverGroup);
            }
        });

        // 4. Prepare Payload
        const payload = {
            questions: localData.questions,
            groups: mergedGroups,
            history: mergedHistory,
            // If we have a pending broadcast, send it. If not, keep server's queue (safest).
            broadcast_queue: localData.broadcast_queue || serverData.broadcast_queue 
        };

        // 5. Send to Cloud
        await fetch(PANTRY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        // 6. Update Local State
        localData.groups = mergedGroups;
        localData.history = mergedHistory;
        
        // Clear broadcast queue locally after sending
        localData.broadcast_queue = null; 

        console.log("Save Successful!");
        renderAll(); // Re-render to show any new groups we just merged

    } catch (e) {
        console.error("Save Error:", e);
        alert("Failed to save! Please check your connection.");
    } finally {
        // 7. Unlock Button
        if (loadingBtn) {
            loadingBtn.innerText = "✅ Saved";
            setTimeout(() => {
                loadingBtn.innerText = originalText;
                loadingBtn.disabled = false;
            }, 1500);
        }
    }
}

function renderAll() {
    renderQuestions();
    renderGroups();
    renderHistory();
}

// --- QUESTIONS LOGIC ---

function saveQuestion() {
    const textInput = document.getElementById("questionText");
    const typeInput = document.getElementById("questionType");
    const optionsInput = document.getElementById("optionsInput");
    const indexInput = document.getElementById("editIndex");
    const saveBtn = document.getElementById("btnSaveQuestion");

    const text = textInput.value.trim();
    if (!text) return alert("Please enter a question.");

    const question = {
        text: text,
        type: typeInput.value,
        options: optionsInput.value.split(",").map(o => o.trim()).filter(o => o)
    };

    if (indexInput.value === "") {
        localData.questions.push(question);
    } else {
        localData.questions[indexInput.value] = question;
    }

    // Clear form immediately for UX
    clearForm();
    renderQuestions();
    
    // Trigger Sync
    saveData(saveBtn); 
}

function editQuestion(i) {
    const q = localData.questions[i];
    document.getElementById("questionText").value = q.text;
    document.getElementById("questionType").value = q.type || "text";
    document.getElementById("optionsInput").value = q.options ? q.options.join(", ") : "";
    document.getElementById("editIndex").value = i;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteQuestion(i) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    localData.questions.splice(i, 1);
    renderQuestions(); // Update UI immediately
    
    // We create a fake button element just to show loading state if needed, or pass null
    saveData(); 
}

function clearForm() {
    document.getElementById("questionText").value = "";
    document.getElementById("questionType").value = "text";
    document.getElementById("optionsInput").value = "";
    document.getElementById("editIndex").value = "";
}

function renderQuestions() {
    const list = document.getElementById("questionsList");
    list.innerHTML = "";
    localData.questions.forEach((q, i) => {
        const li = document.createElement("li");
        li.className = "list-item";
        li.innerHTML = `
            <div class="item-content">
                <strong>${i + 1}. ${q.text}</strong>
                <span class="badge">${q.type}</span>
                ${q.type === 'choice' ? `<div class="subtext">Options: ${q.options.join(', ')}</div>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-sm" onclick="editQuestion(${i})">✏️</button>
                <button class="btn-sm btn-danger" onclick="deleteQuestion(${i})">🗑</button>
            </div>`;
        list.appendChild(li);
    });
}

// --- GROUPS LOGIC ---

function renderGroups() {
    const list = document.getElementById("groupsList");
    list.innerHTML = "";

    if (localData.groups.length === 0) {
        list.innerHTML = "<li class='empty-state'>Waiting for bot to find groups...</li>";
        return;
    }

    localData.groups.forEach((g, i) => {
        const li = document.createElement("li");
        li.className = "list-item";
        
        const isAdmin = g.is_admin === true;
        const roleBadge = isAdmin ? "👮 Admin" : "🚚 Driver";
        const roleColor = isAdmin ? "#8e44ad" : "#27ae60";

        li.innerHTML = `
            <div class="item-content">
                <strong>${g.name || "Unknown Group"}</strong>
                <div class="subtext">ID: ${g.id}</div>
            </div>
            <div class="item-actions">
                <button onclick="toggleRole(${i})" style="background:${roleColor}; color:white; font-size:12px;">${roleBadge}</button>
                <button onclick="toggleGroup(${i})" class="${g.enabled ? 'btn-enabled' : 'btn-disabled'}">
                    ${g.enabled ? "ACTIVE" : "PAUSED"}
                </button>
                <button class="btn-sm btn-danger" onclick="deleteGroup(${i})">🗑</button>
            </div>`;
        list.appendChild(li);
    });
}

function toggleGroup(i) {
    localData.groups[i].enabled = !localData.groups[i].enabled;
    renderGroups(); // Optimistic UI update
    saveData();     // Sync in background
}

function toggleRole(i) {
    localData.groups[i].is_admin = !localData.groups[i].is_admin;
    renderGroups();
    saveData();
}

function deleteGroup(i) {
    if (!confirm("Delete this group? It will reappear if the bot receives a message there.")) return;
    localData.groups.splice(i, 1);
    renderGroups();
    saveData();
}

// --- BROADCAST & EXTRAS ---

async function sendBroadcast() {
    const input = document.getElementById("broadcastText");
    const btn = document.getElementById("btnBroadcast");
    const text = input.value.trim();
    
    if (!text) return alert("Message cannot be empty.");

    // Queue the message locally
    localData.broadcast_queue = text;
    
    // Save with Sync
    await saveData(btn);
    
    alert("📢 Broadcast Queued! The bot will send it within 60 seconds.");
    input.value = "";
}

function renderHistory() {
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    
    // Sort: Newest First
    const recent = [...localData.history].reverse().slice(0, 30);

    recent.forEach(h => {
        const date = new Date(h.date).toLocaleDateString() + " " + new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let qaHtml = "";
        if (h.answers && Array.isArray(h.answers)) {
            qaHtml = h.answers.map(a => `<div class="qa-pair"><span class="q">${a.question}:</span> <span class="a">${a.answer}</span></div>`).join("");
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${date}</td>
            <td><strong>${h.user || 'Unknown'}</strong></td>
            <td>${qaHtml}</td>
        `;
        list.appendChild(tr);
    });
}

function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "driver_feedback_backup_" + new Date().toISOString().slice(0,10) + ".json");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function downloadCSV() {
    if (!localData.history.length) return alert("No history to download.");

    let csv = "Date,Driver,Question,Answer\n";
    localData.history.forEach(h => {
        const date = new Date(h.date).toISOString();
        const driver = (h.user || "Unknown").replace(/,/g, ""); // Remove commas to prevent CSV break
        
        h.answers.forEach(a => {
            const q = (a.question || "").replace(/,/g, " ").replace(/"/g, "'");
            const ans = (a.answer || "").replace(/,/g, " ").replace(/"/g, "'");
            csv += `${date},${driver},"${q}","${ans}"\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "feedback_report.csv";
    link.click();
}

// Start
loadData();
