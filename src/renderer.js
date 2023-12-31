const showElement = (id) => {
    //document.getElementById(id).style.display = 'block';
    document.getElementById(id).classList.remove('hidden');
};
const hideElement = (id) => {
    document.getElementById(id).classList.add('hidden');
};

const disableElement = (id) => {
    document.getElementById(id).disabled = true;
};
const enableElement = (id) => {
    document.getElementById(id).disabled = false;
};

const settingsWindow = document.getElementById('settings-window');
const mainWindow = document.getElementById('main-window');
const localChatHistory = {};

document
    .getElementById('text-form')
    .addEventListener('submit', async (event) => {
        event.preventDefault();

        // reset DOM
        document.getElementById('error').innerText = '';

        // Disable button
        disableElement('submit');
        showElement('loading-spinner');
        hideElement('beautify-button-text');

        // Get the text from textarea
        const text = document.getElementById('text-input').value;
        try {
            const response = await window.electronAPI.beautify(text);
            document.getElementById('output-text').innerText = response;
            showElement('beautify-button-text');
            showElement('output');
            enableElement('submit');
            hideElement('loading-spinner');
            // add to history
            addItemToLocalHistory(
                text,
                response,
                document.getElementById('aiModels').value,
                document.getElementById('promptInstructions').value
            );
        } catch (error) {
            document.getElementById('error').innerHTML =
                'Error when processing your request. ' + error;
            showElement('beautify-button-text');
            enableElement('submit');
            hideElement('loading-spinner');
        }
    });

// Settings interactions
const setSettings = (settings) => {
    document.getElementById('openai-apiKey').value = settings['openAIAPIKey'];
    document.getElementById('mistralai-apiKey').value =
        settings['mistralAIAPIKey'];
    document.getElementById('promptInstructions').value =
        settings['promptInstructions'];
    document.getElementById('aiModels').value = settings['aiModel'];
};
window.electronAPI.viewSettings((settings, showWelcomeMessage) => {
    setSettings(settings);
    settingsWindow.classList.remove('hidden');
    if (showWelcomeMessage) {
        showElement('welcome');
        hideElement('advanced-settings');
    } else {
        hideElement('welcome');
        showElement('advanced-settings');
    }
});
settingsWindow.addEventListener('click', function (event) {
    if (event.target === settingsWindow) {
        settingsWindow.classList.add('hidden');
    }
});
document
    .getElementById('cancel-view-settings')
    .addEventListener('click', (event) => {
        settingsWindow.classList.add('hidden');
    });

document
    .getElementById('settings')
    .addEventListener('submit', async (event) => {
        event.preventDefault();

        // Save settings
        const newSettings = {
            openAIAPIKey: document.getElementById('openai-apiKey').value,
            mistralAIAPIKey: document.getElementById('mistralai-apiKey').value,
            promptInstructions:
                document.getElementById('promptInstructions').value,
            aiModel: document.getElementById('aiModels').value
        };
        window.electronAPI.setSettings(newSettings);

        // Close settings window
        settingsWindow.classList.add('hidden');
    });

document.addEventListener('DOMContentLoaded', () => {
    const copyButton = document.getElementById('copy-to-clipboard');
    const outputText = document.getElementById('output-text');

    copyButton.addEventListener('click', function () {
        // Create a range and selection object
        const range = document.createRange();
        const selection = window.getSelection();

        // Select the text content of the output-text div
        range.selectNodeContents(outputText);
        selection.removeAllRanges();
        selection.addRange(range);

        // Execute the copy command
        document.execCommand('copy');

        // Deselect the text after copying
        selection.removeAllRanges();
        showElement('copy-to-clipboard-success');
        hideElement('copy-to-clipboard-text');
        disableElement('copy-to-clipboard');
        setTimeout(() => {
            hideElement('copy-to-clipboard-success');
            showElement('copy-to-clipboard-text');
            enableElement('copy-to-clipboard');
        }, 1000);
    });
});
// Sidebar
let historyAlreadyLoaded = false;
const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const mainContainer = document.getElementById('main-container');
    const appTitle = document.getElementById('app-title');
    // Toggle sidebar width and main content margin
    if (sidebar.style.width === '' || sidebar.style.width === '0px') {
        sidebar.style.width = '200px';
        mainContainer.style.marginLeft = '200px';
        appTitle.style.marginLeft = '-200px';
    } else {
        sidebar.style.width = '0';
        mainContainer.style.marginLeft = '0';
        appTitle.style.marginLeft = '0';
    }
};
document.getElementById('toggle-sidebar').addEventListener('click', () => {
    toggleSidebar();
});

// Chat history
const addItemToLocalHistory = (
    user_content,
    response,
    aiModel,
    promptInstructions
) => {
    const chatItemNum = Object.keys(localChatHistory).length + 1;
    const chatItemId = `chat-${chatItemNum}`;
    localChatHistory[chatItemId] = {
        user_content: user_content,
        response: response,
        aiModel: aiModel,
        promptInstructions: promptInstructions
    };
    addRow(processString(user_content, 40), user_content, response);
};
window.electronAPI.viewHistory((chatHistory, toggle) => {
    if (!historyAlreadyLoaded) {
        for (let i = chatHistory.length - 1; i > -1; i--) {
            const chatItem = chatHistory[i];
            addItemToLocalHistory(
                chatItem['user_content'],
                chatItem['response'],
                chatItem['model'],
                chatItem['prompt_instructions']
            );
        }
        historyAlreadyLoaded = true;
    }
    if (toggle) {
        toggleSidebar();
    }
});

function addRow(snippet, content, response) {
    // Get the table body
    const tableBody = document.getElementById('chat-history-table');

    // Create a new row
    // var newRow = tableBody.insertRow(tableBody.rows.length);
    const newRow = tableBody.insertRow(0);

    // Set the background color based on the row index
    newRow.className = 'mb-2';

    // Add a cell to the row
    var cell = newRow.insertCell(0);
    cell.className = `cursor-pointer p-1 border-b border-gray-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-600`;
    cell.textContent = snippet;
    cell.addEventListener('click', () => {
        document.getElementById('text-input').value = content;
        showElement('output');
        document.getElementById('output-text').innerText = response;
    });
}

const processString = (inputString, maxLength) => {
    // Replace non-visible characters
    var sanitizedString = inputString.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');

    // Shorten the string if it exceeds the maximum length
    if (sanitizedString.length > maxLength) {
        sanitizedString = sanitizedString.substring(0, maxLength - 3) + '...';
    }

    return sanitizedString;
};

const taskbar = document.getElementById('taskbar');
document.addEventListener('scroll', () => {
    // Check if the user has scrolled down
    if (window.scrollY > 0) {
        // If scrolled down, add a class to the taskbar
        taskbar.classList.add('border-b');
    } else {
        // If at the top, remove the class
        taskbar.classList.remove('border-b');
    }
});

let nbChatHistoryItems = 15;
document
    .getElementById('history-load-more')
    .addEventListener('click', async () => {
        nbChatHistoryItems += 10;
        const chatHistory =
            await window.electronAPI.viewMoreHistory(nbChatHistoryItems);
        console.log('history', chatHistory);
        const tableBody = document.getElementById('chat-history-table');
        tableBody.innerHTML = '';
        for (let i = chatHistory.length - 1; i > -1; i--) {
            const chatItem = chatHistory[i];
            addItemToLocalHistory(
                chatItem['user_content'],
                chatItem['response'],
                chatItem['model'],
                chatItem['prompt_instructions']
            );
        }
    });
