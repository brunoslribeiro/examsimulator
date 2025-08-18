document.getElementById('gpt-config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = document.getElementById('openai-key').value.trim();
  try {
    const res = await fetch('/api/gpt/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    document.getElementById('openai-key').value = '';
    updateStatus(data.hasKey);
    toast('Configurações salvas');
  } catch (e) {
    console.error(e);
    toast('Falha ao salvar');
  }
});

async function loadStatus() {
  try {
    const res = await fetch('/api/gpt/key');
    const data = await res.json();
    updateStatus(data.hasKey);
  } catch (e) {
    console.error(e);
  }
}

function updateStatus(hasKey) {
  const el = document.getElementById('gpt-status');
  el.textContent = hasKey ? 'API key configurada' : 'API key não configurada';
}

loadStatus();
