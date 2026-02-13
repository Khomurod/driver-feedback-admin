// --- 1. CONFIGURATION ---
// Notice the API URL is now pointing to your live Koyeb server!
const API_URL = "https://rapid-calypso-wenzeinvestmentsllc-99df8b6e.koyeb.app/api/data";

let localData = { questions: [], groups: [], history: [], scheduled_queue: [] };

// --- 2. DATA LOADING & SAVING ---
async function loadData() {
    const statusLabel = document.getElementById("statusLabel");
    if (statusLabel) statusLabel.innerText = "🔄 Loading...";
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            const data = await res.json();
            localData.questions = data.questions || [];
            localData.groups = data.groups || [];
            localData.history = data.history || [];
            localData.scheduled_queue = data.scheduled_queue || [];
            
            renderAll();
            if (statusLabel) statusLabel.innerText = "✅ Connected to Bot";
        }
    } catch (e) { 
        console.error("Failed to connect to API:", e); 
        if (statusLabel) statusLabel.innerText = "❌ Connection Failed";
    }
}

async function saveData(loadingBtn = null) {
    let originalText = "Save";
    if (loadingBtn) {
        originalText = loadingBtn.innerText;
        loadingBtn.innerText = "⏳ Saving...";
        loadingBtn.disabled = true;
    }

    try {
        const res = await fetch(API_URL);
        const serverData = res.ok ? await res.json() : {};
        
        const serverGroups = serverData.groups || [];
        const mergedGroups = [...localData.groups];
        serverGroups.forEach(sg => {
            if (!mergedGroups.find(lg => lg.id === sg.id)) mergedGroups.push(sg);
        });

        const payload = {
            questions: localData.questions,
            groups: mergedGroups,
            broadcast_queue: localData.broadcast_queue || serverData.broadcast_queue,
            scheduled_queue: localData.scheduled_queue,
        };

        await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        localData.groups = mergedGroups;
        localData.broadcast_queue = null;
        renderAll();

    } catch (e) { 
        alert("Save failed! Make sure your bot is running."); 
        console.error(e); 
    } finally {
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

// --- 3. QUESTIONS ---
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
    if (confirm("Delete this question?")) {
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

// --- 4. GROUPS (Now with the Admin Toggle!) ---
function renderGroups() {
    const list = document.getElementById("groupsList");
    list.innerHTML = "";
    localData.groups.forEach((g, i) => {
        const li = document.createElement("li");
        li.className = "list-item";
        
        // Dynamic styles for the role button
        const roleText = g.is_admin ? '👑 Admin' : '🚚 Driver';
        const roleBg = g.is_admin ? '#8e44ad' : '#27ae60';

        li.innerHTML = `
            <span>${g.name} <small>(${g.id})</small></span>
            <div>
                <button onclick="toggleRole(${i})" style="font-size:12px; background:${roleBg}; color:white; border:none; padding:4px 8px; border-radius:4px; margin-right:5px; cursor:pointer;">
                    ${roleText}
                </button>
                <button onclick="toggleGroup(${i})" class="${g.enabled ? 'btn-enabled' : 'btn-disabled'}">${g.enabled ? 'ON' : 'OFF'}</button>
                <button class="btn-sm btn-danger" onclick="deleteGroup(${i})">🗑</button>
            </div>`;
        list.appendChild(li);
    });
}

function toggleGroup(i) { 
    localData.groups[i].enabled = !localData.groups[i].enabled; 
    saveData(); 
}

function toggleRole(i) { 
    localData.groups[i].is_admin = !localData.groups[i].is_admin; 
    saveData(); 
}

function deleteGroup(i) { 
    if(confirm("Delete group?")) { 
        localData.groups.splice(i, 1); 
        saveData(); 
    } 
}

// --- 5. SCHEDULE & BROADCAST ---
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
    
    const newItem = {
        id: Date.now(),
        text: text,
        time: new Date(timeVal).toISOString() 
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

// --- 6. HISTORY & DOWNLOADS ---
function renderHistory() {
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    const recent = [...localData.history].reverse().slice(0, 20);
    recent.forEach(h => {
        const row = document.createElement("tr");
        
        const dateCell = document.createElement("td");
        dateCell.textContent = new Date(h.date).toLocaleString();
        
        const userCell = document.createElement("td");
        userCell.textContent = h.user;

        const answersCell = document.createElement("td");
        h.answers.forEach(a => {
            const p = document.createElement("p");
            p.style.margin = "0 0 5px 0";
            p.innerHTML = `<b>${a.question}:</b> `;
            const textSpan = document.createElement("span");
            textSpan.textContent = a.answer; 
            p.appendChild(textSpan);
            answersCell.appendChild(p);
        });

        row.appendChild(dateCell);
        row.appendChild(userCell);
        row.appendChild(answersCell);
        list.appendChild(row);
    });
}

function downloadCSV() {
    if (!localData.history || localData.history.length === 0) {
        return alert("No feedback data to download.");
    }

    let csvContent = "Date,Driver,Question,Answer\n";
    
    localData.history.forEach(h => {
        const dateStr = new Date(h.date).toLocaleString().replace(/,/g, '');
        const userStr = h.user.replace(/,/g, '');
        
        h.answers.forEach(a => {
            const qStr = a.question.replace(/,/g, '');
            const aStr = a.answer.replace(/,/g, '');
            csvContent += `${dateStr},${userStr},${qStr},${aStr}\n`;
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "driver_feedback.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadBackup() {
    if (!localData) return alert("No data to backup.");
    
    const dataStr = JSON.stringify(localData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `database_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Start up
loadData();
