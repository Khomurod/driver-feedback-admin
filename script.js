const PANTRY_ID = "42f7bc17-4c7d-4314-9a0d-19f876d39db6";
const QUESTIONS_URL = `https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/questions`;

async function loadQuestions() {
  try {
    const res = await fetch(QUESTIONS_URL);
    const data = await res.json();
    render(data.questions || []);
  } catch {
    render([]);
  }
}

async function addQuestion() {
  const text = document.getElementById("question").value.trim();
  const type = document.getElementById("type").value;
  const rawOptions = document.getElementById("options").value;

  if (!text) return alert("Question text required");

  const options =
    type === "text"
      ? []
      : rawOptions.split(",").map(o => o.trim()).filter(Boolean);

  const question = { text, type, options };

  let data = {};
  try {
    const res = await fetch(QUESTIONS_URL);
    data = await res.json();
  } catch {}

  const questions = data.questions || [];
  questions.push(question);

  await fetch(QUESTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions })
  });

  document.getElementById("question").value = "";
  document.getElementById("options").value = "";

  loadQuestions();
}

function render(questions) {
  const list = document.getElementById("questions");
  list.innerHTML = "";

  questions.forEach(q => {
    const li = document.createElement("li");
    let text = `${q.text} (${q.type})`;
    if (q.options.length) text += ` → [${q.options.join(", ")}]`;
    li.textContent = text;
    list.appendChild(li);
  });
}

loadQuestions();