const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3001;
const MAX_LINES = 6000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const GITHUB_OWNER = 'jejsnabhsdj';
const GITHUB_REPO = 'database';
const GITHUB_TOKEN = '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';

let database = [];
let lastEtag = '';

async function loadDatabase() {
  try {
    console.log('Fetching database...');
    const response = await axios.get(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/database.json`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'If-None-Match': lastEtag
      }
    });

    if (response.status === 304) {
      console.log('Database is up to date');
      return;
    }

    lastEtag = response.headers.etag;
    const jsonData = response.data;

    if (Array.isArray(jsonData)) {
      database = jsonData;
    } else if (typeof jsonData === 'object' && jsonData !== null) {
      if (jsonData.accounts && Array.isArray(jsonData.accounts)) {
        database = jsonData.accounts;
      } else {
        const arrayProperties = Object.entries(jsonData)
          .filter(([key, value]) => Array.isArray(value));
        
        if (arrayProperties.length > 0) {
          database = arrayProperties.flatMap(([key, value]) => value);
        } else {
          throw new Error('No suitable array found in the data');
        }
      }
    } else {
      throw new Error('Unexpected data format');
    }

    console.log('Database loaded successfully');
  } catch (error) {
    console.error('Error loading database:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

loadDatabase();
setInterval(loadDatabase, 5 * 60 * 1000);

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

app.get('/api/search', (req, res) => {
  const { keyword, ignoreGmail, keepUserPass, limit } = req.query;
  const searchLimit = Math.min(parseInt(limit) || MAX_LINES, MAX_LINES);
  
  let results = database.filter(item => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    return (item.url && item.url.toLowerCase().includes(keyword.toLowerCase())) ||
           (item.username && item.username.toLowerCase().includes(keyword.toLowerCase())) ||
           (item.password && item.password.toLowerCase().includes(keyword.toLowerCase()));
  });

  if (ignoreGmail === 'true') {
    results = results.filter(item => item.username && !item.username.toLowerCase().endsWith('@gmail.com'));
  }

  shuffleArray(results);
  results = results.slice(0, searchLimit);

  if (keepUserPass === 'true') {
    results = results.map(item => ({
      username: item.username || '',
      password: item.password || ''
    }));
  } else {
    results = results.map(item => ({
      url: item.url || '',
      username: item.username || '',
      password: item.password || ''
    }));
  }

  res.json(results);
});

app.get('/api/download', (req, res) => {
  const { data } = req.query;
  const decodedData = JSON.parse(decodeURIComponent(data));
  
  let content = '';
  decodedData.forEach(item => {
    content += Object.values(item).join(' | ') + '\n';
  });

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename=search_results.txt');
  res.send(content);
});

app.get('/api/reload-database', async (req, res) => {
  try {
    await loadDatabase();
    res.json({ message: 'Database reloaded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reload database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
