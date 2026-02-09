// REPLACE 'YOUR_PANTRY_ID' WITH YOUR ACTUAL ID BELOW
const PANTRY_ID = "42f7bc17-4c7d-4314-9a0d-19f876d39db6"; 
const PANTRY_URL = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/driver_data`;

let data = {
  questions: [],
  groups: []
};

// LOAD DATA
async function loadData() {
  console.log("Fetching data from:", PANTRY_URL);
  try {
    const res = await fetch(PANTRY_URL);
    if (res.ok) {
      data = await res.json();
      if (!data.questions) data.questions = [];
      if (!data.groups) data.groups = [];
    } else {
        console.log("No existing data found, starting fresh.");
    }
  } catch (e) {
      console.error("Error loading data:", e);
  }
  renderQuestions();
  renderGroups();
}

// SAVE DATA
async function saveData() {
  const saveBtn = document.querySelector('button[onclick="saveQuestion()"]');
  const originalText = saveBtn ? saveBtn.innerText : "Save";
  if (saveBtn) saveBtn.innerText = "Saving...";
  
  await fetch(PANTRY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  
  if (saveBtn) saveBtn.innerText = originalText;
}

// QUESTIONS
function saveQuestion() {
  const text = document.getElementById("questionText").value;
  const type = document.getElementById("questionType").value;
  const options = document.getElementById("optionsInput").value
    .split(",")
    .map(o => o.trim())
    .filter(o => o);

  const index = document.getElementById("editIndex").value;

  if (!text) return alert("Please enter question text");

  const question = { text, type, options };

  if (index === "") {
    data.questions.push(question);
  } else {
    data.questions[index] = question;
  }

  clearForm();
  saveData();
  renderQuestions();
}

function editQuestion(i) {
  const q = data.questions[i];
  document.getElementById("questionText").value = q.text;
  document.getElementById("questionType").value = q.type || "text";
  document.getElementById("optionsInput").value = q.options ? q.options.join(", ") : "";
  document.getElementById("editIndex").value = i;
}

function deleteQuestion(i) {
  if (!confirm("Delete this question?")) return;
  data.questions.splice(i, 1);
  saveData();
  renderQuestions();
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

  data.questions.forEach((q, i) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `
      <div>
          <strong>${i + 1}. ${q.text}</strong> 
          <span class="badge">${q.type}</span>
          ${q.type === 'choice' ? `<br><small>Options: ${q.options.join(', ')}</small>` : ''}
      </div>
      <div>
          <button onclick="editQuestion(${i})">Edit</button>
          <button onclick="deleteQuestion(${i})" style="background:#ff4444; color:white;">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });
}

// GROUPS
function renderGroups() {
  const list = document.getElementById("groupsList");
  list.innerHTML = "";

  if (data.groups.length === 0) {
      list.innerHTML = "<li>No groups registered yet. Add the bot to a Telegram group to see it here.</li>";
      return;
  }

  data.groups.forEach((g, i) => {
    const li = document.createElement("li");
    li.className = "list-item";
    
    // Determine Role
    const isAdmin = g.is_admin === true;
    const roleColor = isAdmin ? "#8e44ad" : "#27ae60"; // Purple for Admin, Green for Driver
    const roleText = isAdmin ? "👮 Admin Group" : "🚚 Driver Group";

    li.innerHTML = `
      <div>
        <strong>${g.name || "Unknown Group"}</strong> <br>
        <small>ID: ${g.id}</small>
      </div>
      <div>
        <button onclick="toggleRole(${i})" style="background:${roleColor}; color:white;">
            ${roleText}
        </button>
        <button onclick="toggleGroup(${i})" class="${g.enabled ? 'btn-enabled' : 'btn-disabled'}">
            ${g.enabled ? "✅ On" : "❌ Off"}
        </button>
      </div>
    `;
    list.appendChild(li);
  });
}

function toggleGroup(i) {
  data.groups[i].enabled = !data.groups[i].enabled;
  saveData();
  renderGroups();
}

function toggleRole(i) {
    // Toggle between true and false
    data.groups[i].is_admin = !data.groups[i].is_admin;
    saveData();
    renderGroups();
}

// BROADCAST
async function sendBroadcast() {
  const text = document.getElementById("broadcastText").value;
  if (!text) return alert("Message is empty");
  
  data.broadcast_queue = text; 

  await saveData();
  
  alert("Broadcast queued! Sending to all DRIVER groups.");
  document.getElementById("broadcastText").value = "";
}

// Initialize
loadData();