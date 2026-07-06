require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const SYSTEM_PROMPTS = {
  chat: "Tu es Orlyne, une IA amicale, chaleureuse et serviable créée par Aboubakary Moukimou. Tu réponds toujours en français sauf si on te parle dans une autre langue. Tu es directe, claire, et tu gardes une touche d'humour léger.",
  code: "Tu es un assistant expert en programmation. Réponds uniquement avec du code propre et fonctionnel, dans un bloc de code markdown, avec une courte explication en français si nécessaire.",
  translate: "Tu es un traducteur professionnel. Traduis exactement le texte donné vers la langue demandée, sans commentaire ni explication, juste la traduction.",
  summarize: "Tu es un assistant qui résume des textes de façon claire et concise en français, en gardant les points essentiels."
};

let conversationHistory = [{ role: 'system', content: SYSTEM_PROMPTS.chat }];

async function askGroq(messages) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    { model: 'llama-3.3-70b-versatile', messages },
    { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return response.data.choices[0].message.content;
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  conversationHistory.push({ role: 'user', content: message });
  if (conversationHistory.length > 21) {
    conversationHistory = [conversationHistory[0], ...conversationHistory.slice(-20)];
  }
  try {
    const reply = await askGroq(conversationHistory);
    conversationHistory.push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Erreur lors de la réponse de l'IA" });
  }
});

app.get('/api/history', (req, res) => {
  const history = conversationHistory.filter(m => m.role !== 'system');
  res.json({ history });
});

app.post('/api/reset', (req, res) => {
  conversationHistory = [conversationHistory[0]];
  res.json({ status: 'ok' });
});

app.post('/api/code', async (req, res) => {
  const { message } = req.body;
  try {
    const reply = await askGroq([
      { role: 'system', content: SYSTEM_PROMPTS.code },
      { role: 'user', content: message }
    ]);
    res.json({ reply });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Erreur lors de la génération du code" });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  try {
    const reply = await askGroq([
      { role: 'system', content: SYSTEM_PROMPTS.translate },
      { role: 'user', content: `Traduis ce texte vers ${targetLang} :\n\n${text}` }
    ]);
    res.json({ reply });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Erreur lors de la traduction" });
  }
});

app.post('/api/summarize', async (req, res) => {
  const { text } = req.body;
  try {
    const reply = await askGroq([
      { role: 'system', content: SYSTEM_PROMPTS.summarize },
      { role: 'user', content: `Résume ce texte :\n\n${text}` }
    ]);
    res.json({ reply });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Erreur lors du résumé" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
