let questions = [];

function addQuestion() {
  const input = document.getElementById("question");
  if (!input.value) return;

  questions.push(input.value);
  input.value = "";
  render();
}

function render() {
  const list = document.getElementById("questions");
  list.innerHTML = "";

  questions.forEach(q => {
    const li = document.createElement("li");
    li.innerText = q;
    list.appendChild(li);
  });
}