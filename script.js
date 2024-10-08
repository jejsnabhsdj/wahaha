document.addEventListener('DOMContentLoaded', function () {
    const themeSwitch = document.getElementById('themeSwitch');

    // Initialize theme based on local storage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeSwitch) themeSwitch.checked = true;
    }

    if (themeSwitch) {
        themeSwitch.addEventListener('change', function () {
            toggleTheme(this.checked);
        });
    }
});

function toggleTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
}

async function search() {
    const keyword = document.getElementById('keyword').value.toLowerCase();
    const ignoreGmail = document.getElementById('ignoreGmail').checked;
    const keepUserPass = document.getElementById('keepUserPass').checked;
    const limit = parseInt(document.getElementById('limit').value, 10);

    try {
        const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&ignoreGmail=${ignoreGmail}&keepUserPass=${keepUserPass}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const searchResults = await response.json();

        const resultsDiv = document.getElementById('results');
        if (searchResults.length === 0) {
            resultsDiv.innerHTML = '<p>No results found.</p>';
            document.getElementById('downloadBtn').style.display = 'none';
            return;
        }

        let table = '<table><thead><tr>';
        for (const key in searchResults[0]) {
            table += `<th>${key}</th>`;
        }
        table += '</tr></thead><tbody>';

        for (const item of searchResults) {
            table += '<tr>';
            for (const key in item) {
                table += `<td>${item[key]}</td>`;
            }
            table += '</tr>';
        }
        table += '</tbody></table>';

        resultsDiv.innerHTML = table;
        document.getElementById('downloadBtn').style.display = 'block';
    } catch (error) {
        console.error('Search error:', error);
    }
}

function downloadResults() {
    const resultsTable = document.getElementById('results').querySelector('table');
    if (!resultsTable) return;

    const rows = Array.from(resultsTable.rows);
    const data = rows.map(row => {
        return Array.from(row.cells).map(cell => cell.textContent).join(' | ');
    }).join('\n');

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.txt';
    a.click();
    URL.revokeObjectURL(url);
}
