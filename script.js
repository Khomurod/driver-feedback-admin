// REPLACE WITH YOUR PANTRY ID
const PANTRY_ID = "42f7bc17-4c7d-4314-9a0d-19f876d39db6";
const PANTRY_URL = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/driver_data`;

let localData = { questions: [], groups: [], history: [], scheduled_queue: [] };

async function loadData() {
    const statusLabel = document.getElementById("statusLabel");
    if (statusLabel) statusLabel.innerText = "🔄 Loading...";
    try {
        const res = await fetch(PANTRY_URL);
        if (res.ok) {
            const data = await res.json();
            localData.questions = data.questions || [];
            localData.groups = data.groups || [];
            localData.history = data.history || [];
            localData.scheduled_queue = data.scheduled_queue || [];
            
            renderAll();
            if (statusLabel) statusLabel.innerText = "✅ Ready";
        }
    } catch (e) { console.error(e); }
}

async function saveData(loadingBtn = null) {
    let originalText = "Save";
    if (loadingBtn) {
        originalText = loadingBtn.innerText;
        loadingBtn.innerText = "⏳ Saving...";
        loadingBtn.disabled = true;
    }

    try {
        // Smart Sync: Get latest data first
        const res = await fetch(PANTRY_URL);
        const serverData = res.ok ? await res.json() : {};
        
        // Merge logic
        const serverGroups = serverData.groups || [];
        const mergedGroups = [...localData.groups];
        serverGroups.forEach(sg => {
            if (!mergedGroups.find(lg => lg.id === sg.id)) mergedGroups.push(sg);
        });

        // Preserve server's last_weekly_run
        const lastWeeklyRun = serverData.last_weekly_run || "";

        const payload = {
            questions: localData.questions,
            groups: mergedGroups,
            history: serverData.history || [],
            broadcast_queue: localData.broadcast_queue || serverData.broadcast_queue,
            scheduled_queue: localData.scheduled_queue,
            last_weekly_run: lastWeeklyRun
        };

        await fetch(PANTRY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        localData.groups = mergedGroups;
        localData.broadcast_queue = null; // clear local
        renderAll();

    } catch (e) { alert("Save failed!"); console.error(e); } 
    finally {
        if (loadingBtn) {
            loadingBtn.innerText = "✅ Saved";
            setTimeout(() => { loadingBtn.innerText = originalText; loadingBtn.disabled = false; }, 1500);
        }
    }
}

function renderAll() {
    renderQuestions();
    renderGroups();
    renderHistory();
    renderSchedule();
}

// --- QUESTIONS ---
function saveQuestion() {
    const text = document.getElementById("questionText").value;
    const type = document.getElementById("questionType").value;
    const options = document.getElementById("optionsInput").value.split(",").map(o => o.trim()).filter(o => o);
    const index = document.getElementById("editIndex").value;
    if (!text) return alert("Enter question text");

    const q = { text, type, options };
    if (index === "") localData.questions.push(q);
    else localData.questions[index] = q;

    clearForm();
    saveData(document.getElementById("btnSaveQuestion"));
}

function deleteQuestion(i) {
    if (confirm("Delete?")) {
        localData.questions.splice(i, 1);
        saveData();
    }
}

function editQuestion(i) {
    const q = localData.questions[i];
    document.getElementById("questionText").value = q.text;
    document.getElementById("questionType").value = q.type;
    document.getElementById("optionsInput").value = q.options ? q.options.join(", ") : "";
    document.getElementById("editIndex").value = i;
}

function clearForm() {
    document.getElementById("questionText").value = "";
    document.getElementById("optionsInput").value = "";
    document.getElementById("editIndex").value = "";
}

function renderQuestions() {
    const list = document.getElementById("questionsList");
    list.innerHTML = "";
    localData.questions.forEach((q, i) => {
        const li = document.createElement("li");
        li.className = "list-item";
        li.innerHTML = `<span><b>${i+1}.</b> ${q.text} <small>(${q.type})</small></span>
        <div><button class="btn-sm" onclick="editQuestion(${i})">✏️</button><button class="btn-sm btn-danger" onclick="deleteQuestion(${i})">🗑</button></div>`;
        list.appendChild(li);
    });
}

// --- GROUPS ---
function renderGroups() {
    const list = document.getElementById("groupsList");
    list.innerHTML = "";
    localData.groups.forEach((g, i) => {
        const li = document.createElement("li");
        li.className = "list-item";
        li.innerHTML = `
            <span>${g.name} <small>(${g.id})</small></span>
            <div>
                <button onclick="toggleRole(${i})" style="font-size:12px; background:${g.is_admin ? '#8e44ad' : '#27ae60'}; color:white;">${g.is_admin ? 'Admin' : 'Driver'}</button>
                <button onclick="toggleGroup(${i})" class="${g.enabled ? 'btn-enabled' : 'btn-disabled'}">${g.enabled ? 'ON' : 'OFF'}</button>
                <button class="btn-sm btn-danger" onclick="deleteGroup(${i})">🗑</button>
            </div>`;
        list.appendChild(li);
    });
}
function toggleGroup(i) { localData.groups[i].enabled = !localData.groups[i].enabled; saveData(); }
function toggleRole(i) { localData.groups[i].is_admin = !localData.groups[i].is_admin; saveData(); }
function deleteGroup(i) { if(confirm("Delete group?")) { localData.groups.splice(i, 1); saveData(); } }

// --- SCHEDULE & BROADCAST ---
async function sendBroadcast() {
    const text = document.getElementById("broadcastText").value;
    if (!text) return alert("Empty message");
    localData.broadcast_queue = text;
    await saveData(document.getElementById("btnBroadcast"));
    document.getElementById("broadcastText").value = "";
    alert("Sent!");
}

async function scheduleBroadcast() {
    const text = document.getElementById("schedText").value;
    const timeVal = document.getElementById("schedTime").value;
    
    if (!text || !timeVal) return alert("Enter text and time.");
    
    // Create new scheduled item
    const newItem = {
        id: Date.now(),
        text: text,
        time: new Date(timeVal).toISOString() // Save as UTC string
    };
    
    if (!localData.scheduled_queue) localData.scheduled_queue = [];
    localData.scheduled_queue.push(newItem);
    
    await saveData(document.getElementById("btnSchedule"));
    
    document.getElementById("schedText").value = "";
    document.getElementById("schedTime").value = "";
}

function renderSchedule() {
    const list = document.getElementById("scheduleList");
    list.innerHTML = "";
    if (!localData.scheduled_queue || localData.scheduled_queue.length === 0) {
        list.innerHTML = "<li>No upcoming messages.</li>";
        return;
    }
    
    localData.scheduled_queue.forEach((item, i) => {
        const date = new Date(item.time).toLocaleString();
        const li = document.createElement("li");
        li.className = "list-item";
        li.innerHTML = `
            <div><strong>${date}</strong>: ${item.text}</div>
            <button class="btn-sm btn-danger" onclick="deleteSchedule(${i})">Cancel</button>
        `;
        list.appendChild(li);
    });
}

function deleteSchedule(i) {
    if (confirm("Cancel this message?")) {
        localData.scheduled_queue.splice(i, 1);
        saveData();
    }
}

// --- HISTORY & DOWNLOADS ---
function renderHistory() {
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    const recent = [...localData.history].reverse().slice(0, 20);
    recent.forEach(h => {
        const answers = h.answers.map(a => `<b>${a.question}:</b> ${a.answer}`).join("<br>");
        const row = document.createElement("tr");
        row.innerHTML = `<td>${new Date(h.date).toLocaleString()}</td><td>${h.user}</td><td>${answers}</td>`;
        list.appendChild(row);
    });
}
function downloadCSV() { /* (Same as before) */ }
function downloadBackup() { /* (Same as before) */ }

loadData();
