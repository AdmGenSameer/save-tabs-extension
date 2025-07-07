// popup.js - Final Version with Smart Grouping, Export/Import, and Session Restore UI

// === SAVE ALL TABS (Grouped by Window ID) ===
document.getElementById("saveTabs").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({});
  const tabGroups = {};

  for (const tab of tabs) {
    const windowId = "Window " + tab.windowId;
    const tabData = {
      title: tab.title,
      url: tab.url
    };

    if (!tabGroups[windowId]) tabGroups[windowId] = [];
    tabGroups[windowId].push(tabData);
  }
    chrome.storage.local.get("savedTabs", (data) => {
      const previous = data.savedTabs || {};
      const merged = { ...previous, ...tabGroups };
      chrome.storage.local.set({ savedTabs: merged }, () => {
        displayTabs(merged, document.getElementById("searchBox").value);
      });
    });
  });
  
  

// === SEARCH HANDLER ===
document.getElementById("searchBox").addEventListener("input", () => {
  chrome.storage.local.get("savedTabs", (data) => {
    displayTabs(data.savedTabs, document.getElementById("searchBox").value);
  });
});

// === PREVIOUSLY SAVED ===
document.querySelector(".previouslysaved").addEventListener("click", () => {
  chrome.storage.local.get("savedTabs", (data) => {
    displayTabs(data.savedTabs || {}, document.getElementById("searchBox").value);
  });
});

// === SAVE CURRENT WINDOW ===
document.getElementById("saveCurrentWindow").addEventListener("click", async () => {
  const currentWindow = await chrome.windows.getCurrent({ populate: true });
  const now = new Date();
  const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  const windowKey = `Window ${currentWindow.id} - ${timestamp}`;
  const tabData = [];

  for (const tab of currentWindow.tabs) {
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) continue;
    tabData.push({ title: tab.title, url: tab.url });
  }

  const tabGroups = { [windowKey]: tabData }; // 💡 Define tabGroups properly

  chrome.storage.local.get("savedTabs", (data) => {
    const previous = data.savedTabs || {};
    const merged = { ...previous, ...tabGroups };
    chrome.storage.local.set({ savedTabs: merged }, () => {
      displayTabs(merged, document.getElementById("searchBox").value);
    });
  });
});

// === THEME SWITCH ===
const body = document.body;
const themeSwitch = document.getElementById("themeSwitch");
chrome.storage.local.get("theme", (data) => {
  if (data.theme === "light") {
    body.classList.add("light-theme");
    themeSwitch.checked = false;
  } else {
    body.classList.remove("light-theme");
    themeSwitch.checked = true;
  }
});
themeSwitch.addEventListener("change", () => {
  if (themeSwitch.checked) {
    body.classList.remove("light-theme");
    chrome.storage.local.set({ theme: "dark" });
  } else {
    body.classList.add("light-theme");
    chrome.storage.local.set({ theme: "light" });
  }
});

// === DISPLAY SAVED TABS ===
function displayTabs(data, search = "") {
  const container = document.getElementById("tabsContainer");
  container.innerHTML = "";
  if (!data) return;

  Object.entries(data).forEach(([windowId, tabs]) => {
    const windowDiv = document.createElement("div");
    windowDiv.className = "window-group";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.alignItems = "center";

    const windowTitle = document.createElement("input");
    windowTitle.className = "window-name";
    windowTitle.value = windowId;
    windowTitle.addEventListener("change", () => {
      const newName = windowTitle.value;
      if (newName !== windowId) {
        data[newName] = data[windowId];
        delete data[windowId];
        chrome.storage.local.set({ savedTabs: data }, () => displayTabs(data, search));
      }
    });

    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "🔁 Restore Window";
    restoreBtn.onclick = () => {
      for (const tab of tabs) {
        if (!tab.url.startsWith("chrome://")) {
          chrome.tabs.create({ url: tab.url });
        }
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = () => {
      delete data[windowId];
      chrome.storage.local.set({ savedTabs: data }, () => displayTabs(data, search));
    };

    titleRow.appendChild(windowTitle);
    titleRow.appendChild(restoreBtn);
    titleRow.appendChild(deleteBtn);
    windowDiv.appendChild(titleRow);

    const linkList = document.createElement("ul");
    tabs.forEach((tab, index) => {
      if (!tab.url.toLowerCase().includes(search.toLowerCase()) &&
          !tab.title.toLowerCase().includes(search.toLowerCase())) return;

      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = tab.url;
      a.textContent = tab.title || tab.url;
      a.target = "_blank";

      li.appendChild(a);
      li.addEventListener("click", (e) => {
     
        
      });
      li.addEventListener("contextmenu", (e) => {
        e.preventDefault(); // Prevent default browser right-click menu
        if (confirm("Delete this tab link?")) {
          tabs.splice(index, 1);
          chrome.storage.local.set({ savedTabs: data }, () => displayTabs(data, search));
        }
      });
      linkList.appendChild(li);
    });

    windowDiv.appendChild(linkList);
    container.appendChild(windowDiv);
  });
}


// === SMART GROUPING ===
document.getElementById("smartGroupTabs").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({});
  const smartGroups = {}; // ✅ THIS is what was missing before

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith("chrome://")) continue;

    const url = new URL(tab.url);
    const domain = url.hostname.replace(/^www\./, '');
    const groupKey = `🌐 ${domain}`;

    if (!smartGroups[groupKey]) smartGroups[groupKey] = [];

    smartGroups[groupKey].push({
      title: tab.title,
      url: tab.url
    });
  }

  chrome.storage.local.get("savedTabs", (data) => {
    const previous = data.savedTabs || {};
    const merged = { ...previous, ...smartGroups };
    chrome.storage.local.set({ savedTabs: merged }, () => {
      displayTabs(merged, document.getElementById("searchBox").value);
    });
  });
});


  
  

// === EXPORT ===
document.getElementById("exportBtn").addEventListener("click", () => {
  chrome.storage.local.get("savedTabs", (data) => {
    const blob = new Blob([JSON.stringify(data.savedTabs)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saved_tabs.json";
    a.click();
    URL.revokeObjectURL(url);
  });
});

// === IMPORT ===
document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      chrome.storage.local.set({ savedTabs: importedData }, () => {
        displayTabs(importedData, document.getElementById("searchBox").value);
      });
    } catch (err) {
      alert("Invalid file format");
    }
  };
  reader.readAsText(file);
});

// === SESSION RESTORE UI ===
document.getElementById("loadSessionsBtn").addEventListener("click", () => {
  chrome.storage.local.get("savedTabs", (data) => {
    const sessions = data.savedTabs || {};
    if (Object.keys(sessions).length === 0) {
      alert("No saved sessions found.");
      return;
    }
    displayTabs(sessions);
  });
});

document.getElementById("exportHTML").addEventListener("click", () => {
  chrome.storage.local.get("savedTabs", (data) => {
    const savedTabs = data.savedTabs || {};
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Saved Tabs</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h2 { margin-top: 30px; }
          ul { list-style: none; padding: 0; }
          li { margin: 5px 0; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Saved Tabs</h1>
    `;

    for (const [group, tabs] of Object.entries(savedTabs)) {
      htmlContent += `<h2>${group}</h2><ul>`;
      tabs.forEach(tab => {
        htmlContent += `<li><a href="${tab.url}" target="_blank">${tab.title || tab.url}</a></li>`;
      });
      htmlContent += `</ul>`;
    }

    htmlContent += `</body></html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "saved_tabs.html";
    a.click();

    URL.revokeObjectURL(url);
  });
});
