const PANTRY_URL = "https://getpantry.cloud/apiv1/pantry/42f7bc17-4c7d-4314-9a0d-19f876d39db6/basket/admin";

let data = {
  questions: [],
  groups: []
};

// LOAD DATA
async function loadData() {
  const res = await fetch(PANTRY_URL);
  if (res.ok) {
    data = await res.json();
  }
  renderQuestions();
  renderGroups();
}

// SAVE DATA
async function saveData() {
  await fetch(PANTRY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
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

  const question = { text, type, options };

  if (index === "") {
    data.questions.push(question);
  } else {
    data.questions[index] = question;
  }

  document.getElementById("questionText").value = "";
  document.getElementById("optionsInput").value = "";
  document.getElementById("editIndex").value = "";

  saveData();
  renderQuestions();
}

function editQuestion(i) {
  const q = data.questions[i];
  document.getElementById("questionText").value = q.text;
  document.getElementById("questionType").value = q.type;
  document.getElementById("optionsInput").value = q.options.join(", ");
  document.getElementById("editIndex").value = i;
}

function deleteQuestion(i) {
  if (!confirm("Delete this question?")) return;
  data.questions.splice(i, 1);
  saveData();
  renderQuestions();
}

function renderQuestions() {
  const list = document.getElementById("questionsList");
  list.innerHTML = "";

  data.questions.forEach((q, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${q.text} (${q.type})
      <button onclick="editQuestion(${i})">Edit</button>
      <button onclick="deleteQuestion(${i})">Delete</button>
    `;
    list.appendChild(li);
  });
}

// GROUPS
function renderGroups() {
  const list = document.getElementById("groupsList");
  list.innerHTML = "";

  data.groups.forEach((g, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${g.name} (${g.enabled ? "Enabled" : "Disabled"})
      <button onclick="toggleGroup(${i})">Toggle</button>
    `;
    list.appendChild(li);
  });
}

function toggleGroup(i) {
  data.groups[i].enabled = !data.groups[i].enabled;
  saveData();
  renderGroups();
}

// BROADCAST
async function sendBroadcast() {
  const text = document.getElementById("broadcastText").value;
  if (!text) return alert("Message is empty");

  await fetch(PANTRY_URL + "/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  alert("Broadcast saved. Bot will send it.");
}

loadData();