bot.on("message", (ctx) => {
  console.log("CHAT ID:", ctx.chat.id);
});
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
  const input = document.getElementById("question");
  if (!input.value) return;

  const res = await fetch(QUESTIONS_URL);
  let data = {};
  try {
    data = await res.json();
  } catch {}

  const questions = data.questions || [];
  questions.push(input.value);

  await fetch(QUESTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions })
  });

  input.value = "";
  loadQuestions();
}

function render(questions) {
  const list = document.getElementById("questions");
  list.innerHTML = "";
  questions.forEach(q => {
    const li = document.createElement("li");
    li.textContent = q;
    list.appendChild(li);
  });
}

loadQuestions();