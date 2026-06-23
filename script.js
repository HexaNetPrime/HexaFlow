// ============================================
// HEXAFLOW PRO - ADVANCED SCRIPT
// With Device ID, Browser Detection, Admin Folder Upload
// Version: 5.0
// ============================================

// ============================================
// STATE & CONSTANTS
// ============================================
const ADMIN_PASS = 'youcan';
const WEBSITE_NAME = 'HexaFlow Pro';
const WEBSITE_VERSION = '5.0';
const DB_NAME = 'hexaflow_db';
const DB_VERSION = 2;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TOTAL_SIZE = 3 * 1024 * 1024 * 1024;

const FOLDERS = [
    { id: 'f1', name: 'User Folder 1', icon: '👤' },
    { id: 'f2', name: 'User Folder 2', icon: '👥' },
    { id: 'f3', name: 'User Folder 3', icon: '📁' },
    { id: 'f4', name: 'User Folder 4', icon: '📂' }
];

let db = null;
let session = null;
let activeSection = null;
let activeAdminFolder = null;
let viewMode = 'grid';
let shFolderId = null;
let shUserName = null;
let bulkMode = false;
let selectedFiles = new Set();

// ============================================
// ADVANCED DEVICE & BROWSER DETECTION
// ============================================
function getRealDeviceId() {
    let storedId = localStorage.getItem('hexaflow_device_id');
    if (storedId) return storedId;
    
    const ua = navigator.userAgent;
    let deviceModel = '';
    
    const androidMatch = ua.match(/; (?:[^;]+; )?([^;)]+)(?:\)|;)/);
    if (androidMatch) deviceModel = androidMatch[1].trim();
    
    const samsungMatch = ua.match(/SM-[A-Z0-9]+/i);
    if (samsungMatch) deviceModel = samsungMatch[0];
    
    const oppoMatch = ua.match(/CPH[0-9]+/i);
    if (oppoMatch) deviceModel = oppoMatch[0];
    
    const xiaomiMatch = ua.match(/M[0-9]{4}[A-Z]?/i);
    if (xiaomiMatch) deviceModel = xiaomiMatch[0];
    
    const oneplusMatch = ua.match(/OnePlus [A-Z0-9]+/i);
    if (oneplusMatch) deviceModel = oneplusMatch[0];
    
    const vivoMatch = ua.match(/V[0-9]{4}[A-Z]?/i);
    if (vivoMatch) deviceModel = vivoMatch[0];
    
    const realmeMatch = ua.match(/RMX[0-9]+/i);
    if (realmeMatch) deviceModel = realmeMatch[0];
    
    if (!deviceModel) {
        const screenRes = `${screen.width}x${screen.height}`;
        const platform = navigator.platform;
        const language = navigator.language;
        let hash = 0;
        const fingerprint = `${platform}|${screenRes}|${language}|${ua.substring(0, 100)}`;
        for (let i = 0; i < fingerprint.length; i++) {
            hash = ((hash << 5) - hash) + fingerprint.charCodeAt(i);
            hash |= 0;
        }
        deviceModel = `DEVICE_${Math.abs(hash).toString(16).toUpperCase()}`;
    }
    
    const finalId = deviceModel;
    localStorage.setItem('hexaflow_device_id', finalId);
    return finalId;
}

function getDeviceBrand() {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'Apple iPhone';
    if (ua.includes('iPad')) return 'Apple iPad';
    if (ua.includes('Samsung')) return 'Samsung';
    if (ua.includes('OPPO')) return 'OPPO';
    if (ua.includes('CPH')) return 'OPPO/Realme';
    if (ua.includes('Xiaomi')) return 'Xiaomi';
    if (ua.includes('Redmi')) return 'Redmi';
    if (ua.includes('POCO')) return 'POCO';
    if (ua.includes('OnePlus')) return 'OnePlus';
    if (ua.includes('Pixel')) return 'Google Pixel';
    if (ua.includes('vivo')) return 'vivo';
    if (ua.includes('RMX')) return 'Realme';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Apple Mac';
    if (ua.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
}

function getDeviceOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone')) return 'iOS';
    if (ua.includes('iPad')) return 'iPadOS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
}

function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Google Chrome';
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Apple Safari';
    if (ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    if (ua.includes('Brave')) return 'Brave';
    return 'Unknown Browser';
}

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function getFileFormat(filename) {
    const ext = getFileExtension(filename);
    const formats = {
        'jpg': 'JPEG Image', 'jpeg': 'JPEG Image', 'png': 'PNG Image',
        'gif': 'GIF Image', 'webp': 'WebP Image', 'svg': 'SVG Image',
        'pdf': 'PDF Document', 'doc': 'Word Document', 'docx': 'Word Document',
        'xls': 'Excel Sheet', 'xlsx': 'Excel Sheet', 'ppt': 'PowerPoint',
        'pptx': 'PowerPoint', 'mp4': 'MP4 Video', 'mp3': 'MP3 Audio',
        'zip': 'ZIP Archive', 'rar': 'RAR Archive', 'txt': 'Text File'
    };
    return formats[ext] || `${ext.toUpperCase()} File`;
}

// ============================================
// INDEXEDDB INITIALIZATION
// ============================================
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'name' });
            }
            
            if (!db.objectStoreNames.contains('files')) {
                const fileStore = db.createObjectStore('files', { keyPath: 'id' });
                fileStore.createIndex('owner', 'owner');
                fileStore.createIndex('folderId', 'folderId');
                fileStore.createIndex('uploadTime', 'uploadTime');
            }
            
            if (!db.objectStoreNames.contains('logs')) {
                const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                logStore.createIndex('time', 'time');
                logStore.createIndex('user', 'user');
            }
            
            console.log('Database upgrade complete');
        };
    });
}

// ============================================
// DATABASE OPERATIONS
// ============================================
async function getUserFiles(owner, folderId = null) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const index = store.index('owner');
        const request = index.getAll(owner);
        
        request.onsuccess = () => {
            let files = request.result || [];
            if (folderId) {
                files = files.filter(f => f.folderId === folderId);
            }
            resolve(files);
        };
        request.onerror = () => reject(request.error);
    });
}

async function getAllFiles() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function getFilesByFolder(folderId) {
    const allFiles = await getAllFiles();
    return allFiles.filter(f => f.folderId === folderId);
}

async function addFile(fileData) {
    const allFiles = await getAllFiles();
    const totalSize = allFiles.filter(f => f.owner === fileData.owner).reduce((s, f) => s + f.size, 0);
    
    if (totalSize + fileData.size > MAX_TOTAL_SIZE) {
        throw new Error('Storage limit reached (3GB)');
    }
    if (fileData.size > MAX_FILE_SIZE) {
        throw new Error('File too large (max 50MB)');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.add(fileData);
        request.onsuccess = () => resolve(fileData);
        request.onerror = () => reject(request.error);
    });
}

async function deleteFile(fileId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.delete(fileId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function addLog(type, name, folderId, user, ip, deviceModel, deviceId, deviceBrand, deviceOS, browser, details = {}) {
    const log = {
        type, name, folderId, user, ip, deviceModel, deviceId, deviceBrand, deviceOS, browser,
        time: Date.now(),
        ...details
    };
    
    return new Promise((resolve) => {
        const transaction = db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        store.add(log);
        resolve();
    });
}

async function getLogs(limit = 1000) {
    return new Promise((resolve) => {
        const transaction = db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('time');
        const request = index.openCursor(null, 'prev');
        const logs = [];
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && logs.length < limit) {
                logs.push(cursor.value);
                cursor.continue();
            } else {
                resolve(logs);
            }
        };
        request.onerror = () => resolve([]);
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getIP() {
    return '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getCategory(mime, name) {
    if (mime && mime.startsWith('image/')) return 'image';
    if (mime && mime.startsWith('video/')) return 'video';
    if (mime && mime.startsWith('audio/')) return 'audio';
    const ext = name.split('.').pop().toLowerCase();
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    return 'other';
}

function getFileIcon(cat) {
    const icons = { image: '🖼️', video: '🎬', audio: '🎵', archive: '🗜️', other: '📄' };
    return icons[cat] || '📄';
}

function getPreviewBg(cat) {
    const colors = {
        image: 'rgba(59,130,246,0.1)', video: 'rgba(236,72,153,0.1)',
        audio: 'rgba(16,185,129,0.1)', archive: 'rgba(239,68,68,0.08)',
        other: 'rgba(100,116,139,0.1)'
    };
    return colors[cat] || 'rgba(100,116,139,0.1)';
}

function canDeleteFile() {
    return session && (session.type === 'filesadmin' || session.type === 'monitor');
}

function canSeeSensitiveInfo() {
    return session && (session.type === 'filesadmin' || session.type === 'monitor');
}

// ============================================
// PAGE MANAGEMENT
// ============================================
function showOnlyPage(pageId) {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('appPage').classList.remove('active');
    document.getElementById('sharedPage').classList.remove('active');
    document.getElementById(pageId).classList.add('active');
}

function toggleMobileMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('menuOverlay').classList.toggle('open');
}

function closeMobileMenu() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('menuOverlay')?.classList.remove('open');
}

// ============================================
// LOGIN FUNCTIONS
// ============================================
function switchTab(t) {
    const userTab = document.getElementById('tabUserBtn');
    const adminTab = document.getElementById('tabAdminBtn');
    const userForm = document.getElementById('userForm');
    const adminForm = document.getElementById('adminForm');
    
    if (t === 'user') {
        userTab.classList.add('active');
        adminTab.classList.remove('active');
        userForm.style.display = 'block';
        adminForm.style.display = 'none';
    } else {
        userTab.classList.remove('active');
        adminTab.classList.add('active');
        userForm.style.display = 'none';
        adminForm.style.display = 'block';
    }
    document.getElementById('userErr').style.display = 'none';
    document.getElementById('adminErr').style.display = 'none';
}

async function userLogin() {
    const name = document.getElementById('userName').value.trim();
    if (!name) {
        document.getElementById('userErr').style.display = 'block';
        return;
    }
    
    let userFolder = localStorage.getItem(`user_${name}_folder`);
    if (!userFolder) {
        const usedFolders = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('user_') && key.endsWith('_folder')) {
                usedFolders.add(localStorage.getItem(key));
            }
        }
        for (const folder of FOLDERS) {
            if (!usedFolders.has(folder.id)) {
                userFolder = folder.id;
                break;
            }
        }
        if (!userFolder) userFolder = 'f1';
        localStorage.setItem(`user_${name}_folder`, userFolder);
    }
    
    const folder = FOLDERS.find(f => f.id === userFolder);
    session = { type: 'user', name: name, folderId: userFolder, folderName: folder ? folder.name : 'My Folder' };
    showOnlyPage('appPage');
    await renderUserDashboard();
    renderSidebar();
    updateNavbar();
    closeMobileMenu();
    
    const deviceId = getRealDeviceId();
    const deviceBrand = getDeviceBrand();
    const deviceOS = getDeviceOS();
    const browser = getBrowserName();
    await addLog('login', name, userFolder, name, getIP(), `${deviceBrand} ${deviceId}`, deviceId, deviceBrand, deviceOS, browser);
    showToast(`Welcome ${name}! Your folder: ${session.folderName}`, '👋');
}

async function adminLogin() {
    const pass = document.getElementById('adminPass').value;
    const type = document.getElementById('adminType').value;
    if (pass !== ADMIN_PASS) {
        document.getElementById('adminErr').style.display = 'block';
        return;
    }
    session = { type, name: type === 'monitor' ? 'System Monitor' : 'Files Admin', isAdmin: true };
    showOnlyPage('appPage');
    updateNavbar();
    if (type === 'monitor') await renderMonitor();
    else await renderAdminDashboard();
    renderSidebar();
    closeMobileMenu();
    
    const deviceId = getRealDeviceId();
    const deviceBrand = getDeviceBrand();
    const deviceOS = getDeviceOS();
    const browser = getBrowserName();
    await addLog('login', session.name, 'admin', session.name, getIP(), `${deviceBrand} ${deviceId}`, deviceId, deviceBrand, deviceOS, browser);
    showToast(`Welcome ${session.name}!`, '👋');
}

function logout() {
    session = null;
    activeSection = null;
    activeAdminFolder = null;
    viewMode = 'grid';
    shUserName = null;
    selectedFiles.clear();
    bulkMode = false;
    showOnlyPage('loginPage');
    document.getElementById('userName').value = '';
    document.getElementById('adminPass').value = '';
    closeMobileMenu();
}

function updateNavbar() {
    if (!session) return;
    document.getElementById('navName').textContent = session.name;
    document.getElementById('navAvatar').textContent = session.name[0].toUpperCase();
    const badge = document.getElementById('navBadge');
    if (session.type === 'monitor') {
        badge.textContent = '🔍 Monitor';
        badge.classList.add('admin');
    } else if (session.type === 'filesadmin') {
        badge.textContent = '📁 Files Admin';
        badge.classList.add('admin');
    } else {
        badge.textContent = `📁 ${session.folderName || 'User'}`;
        badge.classList.remove('admin');
    }
}

// ============================================
// USER DASHBOARD
// ============================================
async function renderUserDashboard() {
    activeSection = 'user';
    renderSidebar();
    
    const folder = FOLDERS.find(f => f.id === session.folderId);
    const files = await getUserFiles(session.name, session.folderId);
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    const percentUsed = (totalSize / MAX_TOTAL_SIZE) * 100;
    
    document.getElementById('mainContent').innerHTML = `
        <div class="folder-hdr">
            <div class="fhdr-left">
                <div class="fhdr-icon" style="background:rgba(59,130,246,0.15)">${folder.icon}</div>
                <div>
                    <div class="fhdr-title">${escapeHtml(folder.name)}</div>
                    <div class="fhdr-sub">${escapeHtml(session.name)}'s personal workspace</div>
                </div>
            </div>
            <div class="hdr-btns">
                <button class="btn-s" onclick="shareUserFolder()">🔗 Share My Folder</button>
                <button class="btn-p" onclick="document.getElementById('fileInput').click()">📄 Upload Files</button>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-c"><div class="stat-v">${files.length}</div><div class="stat-l">Files</div></div>
            <div class="stat-c"><div class="stat-v">${formatBytes(totalSize)}</div><div class="stat-l">Used</div></div>
            <div class="stat-c"><div class="stat-v">${formatBytes(MAX_TOTAL_SIZE - totalSize)}</div><div class="stat-l">Free</div></div>
            <div class="stat-c"><div class="stat-v">${percentUsed.toFixed(1)}%</div><div class="stat-l">Storage Used</div></div>
        </div>
        <div class="drop-zone" id="dropZone">
            <span class="dz-icon">☁️</span>
            <h3>Drop files anywhere</h3>
            <p>Max file size: 50MB | Total: 3GB</p>
            <button class="btn-p" onclick="document.getElementById('fileInput').click()">📄 Select Files</button>
        </div>
        <div id="progWrap" style="display:none"><div class="prog-hd"><span id="progName">Uploading...</span><span id="progPct">0%</span></div><div class="prog-track"><div class="prog-fill" id="progFill"></div></div></div>
        <div class="toolbar">
            <div class="search-w"><span class="search-ic">🔍</span><input type="text" placeholder="Search files..." id="searchIn" oninput="refreshUserFiles()"></div>
            <div class="view-tog"><button class="vbtn ${viewMode === 'grid' ? 'active' : ''}" onclick="setView('grid')">⊞</button><button class="vbtn ${viewMode === 'list' ? 'active' : ''}" onclick="setView('list')">☰</button></div>
        </div>
        <div id="filesArea"></div>
        <div class="empty-st" id="emptyState" style="display:none"><div class="ei">📂</div><p>No files yet. Upload your first file!</p></div>
    `;
    
    document.getElementById('fileInput').onchange = e => handleUpload([...e.target.files], session.name, session.folderId);
    
    const dz = document.getElementById('dropZone');
    if (dz) {
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('over'));
        dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); handleUpload([...e.dataTransfer.files], session.name, session.folderId); });
    }
    
    await refreshUserFiles();
}

async function refreshUserFiles() {
    const q = (document.getElementById('searchIn') || {}).value || '';
    let files = await getUserFiles(session.name, session.folderId);
    if (q) files = files.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    
    const area = document.getElementById('filesArea');
    const empty = document.getElementById('emptyState');
    
    if (!files.length) {
        if (area) area.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    
    if (viewMode === 'grid') {
        area.className = 'files-grid';
        area.innerHTML = files.map(f => userFileCard(f)).join('');
    } else {
        area.className = 'files-list';
        area.innerHTML = files.map(f => userFileListRow(f)).join('');
    }
}

function userFileCard(file) {
    return `<div class="fc">
        <div class="fc-prev" style="background:${getPreviewBg(file.cat)}">
            ${file.cat === 'image' ? `<img src="${file.dataUrl}" onerror="this.style.display='none'">` : `<span>${getFileIcon(file.cat)}</span>`}
        </div>
        <div class="fc-name" title="${file.name}">${escapeHtml(file.name)}</div>
        <div class="fc-meta">${formatBytes(file.size)} · ${file.cat}</div>
        <div class="fc-acts">
            <button class="fa-btn" onclick="downloadFile('${file.id}')">⬇ Download</button>
            <button class="fa-btn info" onclick="showFileInfo('${file.id}')">ℹ️ Info</button>
        </div>
    </div>`;
}

function userFileListRow(file) {
    const date = new Date(file.uploadTime).toLocaleString();
    return `<div class="flr">
        <div class="flr-icon">${getFileIcon(file.cat)}</div>
        <div class="flr-info">
            <div class="flr-name">${escapeHtml(file.name)}</div>
            <div class="flr-meta">${formatBytes(file.size)} · ${date}</div>
        </div>
        <div class="flr-acts">
            <button class="la-btn" onclick="downloadFile('${file.id}')">Download</button>
            <button class="la-btn info" onclick="showFileInfo('${file.id}')">Info</button>
        </div>
    </div>`;
}

function setView(v) {
    viewMode = v;
    refreshUserFiles();
}

function shareUserFolder() {
    const link = `${location.href.split('#')[0]}#shared:${session.name}|${session.folderId}`;
    document.getElementById('linkInput').value = link;
    document.getElementById('shareModal').classList.add('on');
    addLog('share', session.folderName, session.folderId, session.name, getIP(), '', '', '', '', '');
}

// ============================================
// FILE UPLOAD HANDLERS
// ============================================
async function handleUpload(files, owner, folderId) {
    if (!files.length) return;
    
    const allFiles = await getAllFiles();
    const currentSize = allFiles.filter(f => f.owner === owner).reduce((s, f) => s + f.size, 0);
    let totalNewSize = 0;
    for (const f of files) {
        if (f.size <= MAX_FILE_SIZE) totalNewSize += f.size;
    }
    
    if (currentSize + totalNewSize > MAX_TOTAL_SIZE) {
        showToast('Storage limit reached! Cannot upload.', '⚠️');
        return;
    }
    
    const pw = document.getElementById('progWrap');
    if (pw) pw.style.display = 'block';
    let completed = 0;
    const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE);
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length) showToast(`${oversized.length} file(s) exceed 50MB limit`, '⚠️');
    
    const deviceId = getRealDeviceId();
    const deviceBrand = getDeviceBrand();
    const deviceOS = getDeviceOS();
    const browser = getBrowserName();
    
    for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        const reader = new FileReader();
        const fileData = await new Promise((resolve) => {
            reader.onload = (ev) => {
                resolve({
                    id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: file.size,
                    mime: file.type,
                    uploadTime: Date.now(),
                    dataUrl: ev.target.result,
                    format: getFileFormat(file.name),
                    extension: getFileExtension(file.name),
                    cat: getCategory(file.type, file.name),
                    uploadedBy: owner,
                    owner: owner,
                    folderId: folderId,
                    deviceModel: `${deviceBrand} ${deviceId}`,
                    deviceId: deviceId,
                    deviceBrand: deviceBrand,
                    deviceOS: deviceOS,
                    browser: browser,
                    ip: getIP()
                });
            };
            reader.readAsDataURL(file);
        });
        
        try {
            await addFile(fileData);
            await addLog('upload', file.name, folderId, owner, getIP(), `${deviceBrand} ${deviceId}`, deviceId, deviceBrand, deviceOS, browser);
            completed++;
            
            const pct = (completed / validFiles.length) * 100;
            const pf = document.getElementById('progFill');
            if (pf) pf.style.width = pct + '%';
            const pp = document.getElementById('progPct');
            if (pp) pp.textContent = Math.floor(pct) + '%';
            const pn = document.getElementById('progName');
            if (pn) pn.textContent = `Uploading ${completed}/${validFiles.length}: ${file.name}`;
        } catch (err) {
            showToast(err.message, '⚠️');
        }
    }
    
    setTimeout(() => {
        if (pw) pw.style.display = 'none';
        if (session.type === 'user') {
            refreshUserFiles();
        } else if (activeAdminFolder) {
            refreshAdminFolder(activeAdminFolder);
        }
        showToast(`✨ ${completed} file(s) uploaded!`);
        document.getElementById('fileInput').value = '';
        document.getElementById('adminFileInput').value = '';
    }, 500);
}

async function downloadFile(id) {
    const allFiles = await getAllFiles();
    const file = allFiles.find(f => f.id === id);
    if (file) {
        const a = document.createElement('a');
        a.href = file.dataUrl;
        a.download = file.name;
        a.click();
        const deviceId = getRealDeviceId();
        const deviceBrand = getDeviceBrand();
        const deviceOS = getDeviceOS();
        const browser = getBrowserName();
        await addLog('download', file.name, file.folderId, session.name, getIP(), `${deviceBrand} ${deviceId}`, deviceId, deviceBrand, deviceOS, browser);
        showToast('Download started!', '📥');
    }
}

async function showFileInfo(id) {
    const allFiles = await getAllFiles();
    const file = allFiles.find(f => f.id === id);
    if (!file) return;
    
    const date = new Date(file.uploadTime).toLocaleString();
    const canSeeSensitive = canSeeSensitiveInfo();
    
    let infoHtml = `
        <div class="info-row"><div class="info-label">📄 Name</div><div class="info-value">${escapeHtml(file.name)}</div></div>
        <div class="info-row"><div class="info-label">📦 Size</div><div class="info-value">${formatBytes(file.size)}</div></div>
        <div class="info-row"><div class="info-label">🎨 Format</div><div class="info-value">${file.format || file.extension || 'Unknown'}</div></div>
        <div class="info-row"><div class="info-label">🏷️ Type</div><div class="info-value">${file.cat.toUpperCase()}</div></div>
        <div class="info-row"><div class="info-label">👤 Uploader</div><div class="info-value">${escapeHtml(file.uploadedBy || 'Unknown')}</div></div>
        <div class="info-row"><div class="info-label">📅 Date</div><div class="info-value">${date}</div></div>`;
    
    if (canSeeSensitive) {
        infoHtml += `
            <div class="info-row"><div class="info-label">🌐 IP Address</div><div class="info-value"><code>${file.ip || 'Unknown'}</code></div></div>
            <div class="info-row"><div class="info-label">📱 Device Model</div><div class="info-value"><strong>${file.deviceModel || 'Unknown'}</strong></div></div>
            <div class="info-row"><div class="info-label">🆔 Device ID</div><div class="info-value"><code style="color:#60a5fa;font-weight:bold;">${file.deviceId || 'Unknown'}</code></div></div>
            <div class="info-row"><div class="info-label">🏭 Brand</div><div class="info-value">${file.deviceBrand || 'Unknown'}</div></div>
            <div class="info-row"><div class="info-label">💿 OS</div><div class="info-value">${file.deviceOS || 'Unknown'}</div></div>
            <div class="info-row"><div class="info-label">🌐 Browser</div><div class="info-value">${file.browser || 'Unknown'}</div></div>`;
    } else {
        infoHtml += `<div class="info-row"><div class="info-label">🔒 Privacy</div><div class="info-value">Full device info only for admins</div></div>`;
    }
    
    document.getElementById('fileInfoContent').innerHTML = infoHtml;
    document.getElementById('infoModal').classList.add('on');
}

// ============================================
// ADMIN DASHBOARD - 4 Folders in Sidebar
// ============================================
async function renderAdminDashboard() {
    activeSection = 'admin';
    renderSidebar();
    
    document.getElementById('mainContent').innerHTML = `
        <h2 style="font-size:1.2rem;margin-bottom:1rem;">📁 Admin - All Folders</h2>
        <div class="admin-users-list">
            ${FOLDERS.map(folder => `
                <div class="admin-user-card" style="background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:0.8rem;cursor:pointer;transition:all0.2s;" onclick="viewAdminFolder('${folder.id}')">
                    <div style="display:flex;align-items:center;gap:1rem;">
                        <div style="font-size:2rem;">${folder.icon}</div>
                        <div>
                            <div style="font-weight:600;">${escapeHtml(folder.name)}</div>
                            <div style="font-size:0.7rem;color:var(--text-secondary);">Folder ID: ${folder.id}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="drop-zone" id="adminDropZone" style="margin-top:1rem;">
            <span class="dz-icon">☁️</span>
            <h3>Select a folder first to upload files</h3>
            <p>Click any folder above then upload files to it</p>
        </div>
    `;
}

async function viewAdminFolder(folderId) {
    activeAdminFolder = folderId;
    const folder = FOLDERS.find(f => f.id === folderId);
    const files = await getFilesByFolder(folderId);
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    
    renderSidebar();
    
    document.getElementById('mainContent').innerHTML = `
        <div class="folder-hdr">
            <div class="fhdr-left">
                <div class="fhdr-icon" style="background:rgba(139,92,246,0.15)">${folder.icon}</div>
                <div>
                    <div class="fhdr-title">${escapeHtml(folder.name)}</div>
                    <div class="fhdr-sub">Admin View · ${files.length} files · ${formatBytes(totalSize)}</div>
                </div>
            </div>
            <div class="hdr-btns">
                <button class="btn-s" onclick="renderAdminDashboard()">← Back to All Folders</button>
                <button class="btn-p" onclick="document.getElementById('adminFileInput').click()">📄 Upload to ${folder.name}</button>
            </div>
        </div>
        <div class="drop-zone" id="adminFolderDropZone">
            <span class="dz-icon">☁️</span>
            <h3>Drop files to upload to ${escapeHtml(folder.name)}</h3>
            <p>Max file size: 50MB | Total: 3GB</p>
            <button class="btn-p" onclick="document.getElementById('adminFileInput').click()">📄 Select Files</button>
        </div>
        <div id="progWrap" style="display:none"><div class="prog-hd"><span id="progName">Uploading...</span><span id="progPct">0%</span></div><div class="prog-track"><div class="prog-fill" id="progFill"></div></div></div>
        <div class="toolbar">
            <div class="search-w"><span class="search-ic">🔍</span><input type="text" placeholder="Search files..." id="searchIn" oninput="refreshAdminFolder('${folderId}')"></div>
        </div>
        <div id="adminFilesArea"></div>
    `;
    
    document.getElementById('adminFileInput').onchange = e => handleUpload([...e.target.files], session.name, folderId);
    
    const dz = document.getElementById('adminFolderDropZone');
    if (dz) {
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('over'));
        dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); handleUpload([...e.dataTransfer.files], session.name, folderId); });
    }
    
    await refreshAdminFolder(folderId);
}

async function refreshAdminFolder(folderId) {
    const q = (document.getElementById('searchIn') || {}).value || '';
    let files = await getFilesByFolder(folderId);
    if (q) files = files.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
    
    const area = document.getElementById('adminFilesArea');
    if (!area) return;
    
    area.innerHTML = `
        <div class="files-list">
            ${files.map(file => adminFileRow(file)).join('')}
        </div>
        ${files.length === 0 ? '<div class="empty-st"><div class="ei">📂</div><p>No files in this folder</p></div>' : ''}
    `;
}

function adminFileRow(file) {
    const date = new Date(file.uploadTime).toLocaleString();
    return `<div class="flr">
        <div class="flr-icon">${getFileIcon(file.cat)}</div>
        <div class="flr-info">
            <div class="flr-name">${escapeHtml(file.name)}</div>
            <div class="flr-meta">${formatBytes(file.size)} · ${file.format || file.extension} · ${date}<br>
            <span style="font-size:0.6rem;">👤 ${escapeHtml(file.owner)} | 📱 ${file.deviceModel || 'Unknown'} | 🆔 ${file.deviceId || 'Unknown'}</span></div>
        </div>
        <div class="flr-acts">
            <button class="la-btn" onclick="adminDownloadFile('${file.id}')">Download</button>
            <button class="la-btn info" onclick="adminFileInfo('${file.id}')">Full Info</button>
            <button class="la-btn del" onclick="adminDeleteFile('${file.id}','${escapeHtml(file.name)}')">Delete</button>
        </div>
    </div>`;
}

async function adminDownloadFile(fileId) {
    const allFiles = await getAllFiles();
    const file = allFiles.find(f => f.id === fileId);
    if (file) {
        const a = document.createElement('a');
        a.href = file.dataUrl;
        a.download = file.name;
        a.click();
        const deviceId = getRealDeviceId();
        const deviceBrand = getDeviceBrand();
        const deviceOS = getDeviceOS();
        const browser = getBrowserName();
        await addLog('download', file.name, file.folderId, session.name, getIP(), `${deviceBrand} ${deviceId}`, deviceId, deviceBrand, deviceOS, browser);
        showToast('Download started!');
    }
}

async function adminFileInfo(fileId) {
    const allFiles = await getAllFiles();
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return;
    
    const date = new Date(file.uploadTime).toLocaleString();
    document.getElementById('fileInfoContent').innerHTML = `
        <div class="info-row"><div class="info-label">📄 Name</div><div class="info-value">${escapeHtml(file.name)}</div></div>
        <div class="info-row"><div class="info-label">📦 Size</div><div class="info-value">${formatBytes(file.size)}</div></div>
        <div class="info-row"><div class="info-label">🎨 Format</div><div class="info-value">${file.format || file.extension || 'Unknown'}</div></div>
        <div class="info-row"><div class="info-label">🏷️ Type</div><div class="info-value">${file.cat.toUpperCase()}</div></div>
        <div class="info-row"><div class="info-label">👤 Uploader</div><div class="info-value">${escapeHtml(file.uploadedBy)}</div></div>
        <div class="info-row"><div class="info-label">👥 Owner</div><div class="info-value">${escapeHtml(file.owner)}</div></div>
        <div class="info-row"><div class="info-label">📁 Folder</div><div class="info-value">${file.folderId}</div></div>
        <div class="info-row"><div class="info-label">📅 Date</div><div class="info-value">${date}</div></div>
        <div class="info-row"><div class="info-label">🌐 IP Address</div><div class="info-value"><code>${file.ip || 'Unknown'}</code></div></div>
        <div class="info-row"><div class="info-label">📱 Device Model</div><div class="info-value"><strong>${file.deviceModel || 'Unknown'}</strong></div></div>
        <div class="info-row"><div class="info-label">🆔 Device ID</div><div class="info-value"><code style="color:#60a5fa;font-weight:bold;font-size:1rem;">${file.deviceId || 'Unknown'}</code></div></div>
        <div class="info-row"><div class="info-label">🏭 Brand</div><div class="info-value">${file.deviceBrand || 'Unknown'}</div></div>
        <div class="info-row"><div class="info-label">💿 OS</div><div class="info-value">${file.deviceOS || 'Unknown'}</div></div>
        <div class="info-row"><div class="info-label">🌐 Browser</div><div class="info-value">${file.browser || 'Unknown'}</div></div>
    `;
    document.getElementById('infoModal').classList.add('on');
}

async function adminDeleteFile(fileId, fileName) {
    if (confirm(`Delete "${fileName}"? This cannot be undone!`)) {
        await deleteFile(fileId);
        const deviceId = getRealDeviceId();
        const deviceBrand = getDeviceBrand();
        const deviceOS = getDeviceOS();
        const browser = getBrowserName();
        await addLog('delete', fileName, activeAdminFolder || 'admin', session.name, getIP(), `${deviceBrand} ${deviceId}`, deviceId, deviceBrand, deviceOS, browser);
        if (activeAdminFolder) {
            await refreshAdminFolder(activeAdminFolder);
        } else {
            await renderAdminDashboard();
        }
        showToast(`"${fileName}" deleted!`, '🗑');
    }
}

// ============================================
// MONITOR DASHBOARD - ADVANCED
// ============================================
async function renderMonitor() {
    activeSection = 'monitor';
    renderSidebar();
    
    const allFiles = await getAllFiles();
    const logs = await getLogs(1000);
    const totalSize = allFiles.reduce((s, f) => s + f.size, 0);
    const today = allFiles.filter(f => new Date(f.uploadTime).toDateString() === new Date().toDateString()).length;
    
    const folderStats = {};
    FOLDERS.forEach(folder => {
        folderStats[folder.id] = allFiles.filter(f => f.folderId === folder.id).length;
    });
    
    const uniqueDevices = new Set(allFiles.map(f => f.deviceId).filter(Boolean));
    const uniqueIPs = new Set(allFiles.map(f => f.ip).filter(Boolean));
    
    document.getElementById('mainContent').innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
            <h2 style="font-size:1.2rem;">📊 ${WEBSITE_NAME} - Advanced Monitor</h2>
            <button class="download-logs-btn" onclick="exportLogsAsHTML()">📥 Export Complete Report</button>
        </div>
        <div class="monitor-grid">
            <div class="mon-card"><div class="mon-v" style="color:#60a5fa">${allFiles.length}</div><div class="mon-l">Total Files</div><div class="mon-trend">↑ +${today} today</div></div>
            <div class="mon-card"><div class="mon-v" style="color:#34d399">${today}</div><div class="mon-l">Today's Uploads</div></div>
            <div class="mon-card"><div class="mon-v" style="color:#fbbf24">${formatBytes(totalSize)}</div><div class="mon-l">Storage Used</div></div>
            <div class="mon-card"><div class="mon-v" style="color:#c084fc">${uniqueIPs.size}</div><div class="mon-l">Unique IPs</div></div>
        </div>
        <div class="monitor-grid" style="margin-bottom:1rem;">
            <div class="mon-card"><div class="mon-v" style="color:#f472b6">${uniqueDevices.size}</div><div class="mon-l">Unique Devices</div></div>
            <div class="mon-card"><div class="mon-v" style="color:#a78bfa">${FOLDERS.length}</div><div class="mon-l">Total Folders</div></div>
        </div>
        <div class="top-users"><div class="heatmap-title">📁 Files per Folder</div>
            ${FOLDERS.map(folder => `<div class="top-user-item"><span class="top-user-name">${folder.name} (${folder.id})</span><span class="top-user-count">${folderStats[folder.id] || 0} files</span></div>`).join('')}
        </div>
        <div class="log-wrap"><table class="log-table"><thead><tr><th>Action</th><th>Item</th><th>Folder</th><th>User</th><th>Device Model</th><th>Device ID</th><th>IP</th><th>Browser</th><th>Time</th></tr></thead><tbody>
            ${logs.map(l => `<tr>
                <td><span class="badge ${l.type}">${l.type.toUpperCase()}</span></td>
                <td>${escapeHtml(l.name)}</td>
                <td>${l.folderId || '—'}</td>
                <td>${l.user || '—'}</td>
                <td><strong>${l.deviceModel || '—'}</strong></td>
                <td><code style="color:#60a5fa;">${l.deviceId || '—'}</code></td>
                <td><code>${l.ip || '—'}</code></td>
                <td>${l.browser || '—'}</td>
                <td>${new Date(l.time).toLocaleString()}</td>
            </tr>`).join('') || '<tr><td colspan="9">No activity</td></tr>'}</tbody></table></div>
    `;
}

async function exportLogsAsHTML() {
    const logs = await getLogs(10000);
    const allFiles = await getAllFiles();
    const totalSize = allFiles.reduce((s, f) => s + f.size, 0);
    
    let html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>HexaFlow Pro - Complete Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:monospace;background:#0a0a0f;color:#f1f5f9;padding:2rem;}
h1{color:#3b82f6;}
table{width:100%;border-collapse:collapse;margin-top:1rem;}
th,td{border:1px solid #3b82f6;padding:8px;text-align:left;font-size:0.75rem;}
th{background:#3b82f6;}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.7rem;}
.badge.upload{background:#10b981;}
.badge.download{background:#3b82f6;}
.badge.delete{background:#ef4444;}
.badge.login{background:#f59e0b;}
.badge.share{background:#8b5cf6;}
</style>
</head>
<body>
<h1>HexaFlow Pro - Complete System Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<h2>Stats</h2>
<p>Total Files: ${allFiles.length} | Storage: ${formatBytes(totalSize)} | Total Events: ${logs.length}</p>
<h2>Activity Logs</h2>
<table><thead><tr><th>Action</th><th>Item</th><th>User</th><th>Device Model</th><th>Device ID</th><th>IP</th><th>Browser</th><th>Time</th></tr></thead><tbody>
${logs.map(l => `<tr><td><span class="badge ${l.type}">${l.type}</span></td><td>${escapeHtml(l.name)}</td><td>${l.user}</td><td>${l.deviceModel}</td><td>${l.deviceId}</td><td>${l.ip}</td><td>${l.browser}</td><td>${new Date(l.time).toLocaleString()}</td></tr>`).join('')}
</tbody></table>
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hexaflow_report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('HTML Report exported!', '📥');
}

// ============================================
// SIDEBAR - 4 Folders for Admin
// ============================================
function renderSidebar() {
    const sb = document.getElementById('sidebar');
    if (!session) {
        sb.innerHTML = '';
        return;
    }
    
    if (session.type === 'user') {
        const folder = FOLDERS.find(f => f.id === session.folderId);
        sb.innerHTML = `
            <div class="sb-label">My Workspace</div>
            <div class="sb-item active" onclick="renderUserDashboard();closeMobileMenu();">
                <div class="sb-dot" style="background:rgba(59,130,246,0.15)">${folder.icon}</div>
                <div class="sb-info"><div class="sb-name">${folder.name}</div><div class="sb-sub">Your personal folder</div></div>
            </div>
        `;
    } else if (session.type === 'monitor') {
        sb.innerHTML = `
            <div class="sb-label">Monitor Console</div>
            <div class="sb-item ${activeSection === 'monitor' ? 'active' : ''}" onclick="renderMonitor();closeMobileMenu();">
                <div class="sb-dot" style="background:rgba(59,130,246,0.15)">📊</div>
                <div class="sb-info"><div class="sb-name">Dashboard</div><div class="sb-sub">Analytics & Reports</div></div>
            </div>
        `;
    } else {
        sb.innerHTML = `
            <div class="sb-label">📁 All Folders (Admin)</div>
            ${FOLDERS.map(folder => `
                <div class="sb-item ${activeAdminFolder === folder.id ? 'active' : ''}" onclick="viewAdminFolder('${folder.id}');closeMobileMenu();">
                    <div class="sb-dot" style="background:rgba(59,130,246,0.15)">${folder.icon}</div>
                    <div class="sb-info"><div class="sb-name">${folder.name}</div><div class="sb-sub">${folder.id}</div></div>
                </div>
            `).join('')}
            <div class="sb-divider"></div>
            <div class="sb-item ${activeSection === 'admin' ? 'active' : ''}" onclick="renderAdminDashboard();closeMobileMenu();">
                <div class="sb-dot" style="background:rgba(139,92,246,0.15)">🏠</div>
                <div class="sb-info"><div class="sb-name">All Folders View</div><div class="sb-sub">Back to folder list</div></div>
            </div>
        `;
    }
}

// ============================================
// SHARED PAGE
// ============================================
async function showSharedPage(hashData) {
    const parts = hashData.split('|');
    const userName = parts[0];
    const folderId = parts[1] || 'f1';
    shFolderId = folderId;
    
    const folder = FOLDERS.find(f => f.id === folderId);
    showOnlyPage('sharedPage');
    document.getElementById('shFName').textContent = folder ? folder.name : 'Shared Workspace';
    
    if (!shUserName) {
        document.getElementById('shLoginPrompt').style.display = 'block';
        document.getElementById('shFilesArea').style.display = 'none';
    } else {
        document.getElementById('shLoginPrompt').style.display = 'none';
        document.getElementById('shFilesArea').style.display = 'block';
        await renderSharedFiles();
    }
}

function shLogin() {
    const name = document.getElementById('shUserName').value.trim();
    if (!name) {
        showToast('Enter your name!', '⚠️');
        return;
    }
    shUserName = name;
    document.getElementById('shLoginPrompt').style.display = 'none';
    document.getElementById('shFilesArea').style.display = 'block';
    renderSharedFiles();
}

async function renderSharedFiles() {
    const files = await getFilesByFolder(shFolderId);
    const folder = FOLDERS.find(f => f.id === shFolderId);
    document.getElementById('shFSub').textContent = `${files.length} files · Welcome ${escapeHtml(shUserName)}`;
    const grid = document.getElementById('shGrid');
    const empty = document.getElementById('shEmpty');
    
    if (!files.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
        grid.innerHTML = files.map(f => `
            <div class="shfc">
                <div class="shfc-prev" style="background:${getPreviewBg(f.cat)}">${f.cat === 'image' ? `<img src="${f.dataUrl}">` : `<span>${getFileIcon(f.cat)}</span>`}</div>
                <div class="shfc-name">${escapeHtml(f.name)}</div>
                <div class="shfc-meta">${formatBytes(f.size)}</div>
                <button class="btn-dl" onclick="shDownload('${f.id}')">⬇ Download</button>
            </div>
        `).join('');
    }
}

async function shDownload(fileId) {
    const allFiles = await getAllFiles();
    const file = allFiles.find(f => f.id === fileId);
    if (file) {
        const a = document.createElement('a');
        a.href = file.dataUrl;
        a.download = file.name;
        a.click();
        await addLog('download', file.name, file.folderId, shUserName, getIP(), '', '', '', '', '');
        showToast('Download started!');
    }
}

function shShareFolder() {
    const link = `${location.href.split('#')[0]}#shared:${shFolderId}`;
    document.getElementById('linkInput').value = link;
    document.getElementById('shareModal').classList.add('on');
}

// ============================================
// TOAST & UTILITIES
// ============================================
function showToast(msg, icon = '✓') {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    document.getElementById('toastIc').textContent = icon;
    toast.classList.add('on');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('on'), 3000);
}

function closeModal(id) {
    document.getElementById(id).classList.remove('on');
}

function checkHash() {
    const h = location.hash;
    if (h.startsWith('#shared:')) {
        const data = h.replace('#shared:', '');
        showSharedPage(data);
        return true;
    }
    return false;
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    await initDB();
    
    document.getElementById('tabUserBtn')?.addEventListener('click', () => switchTab('user'));
    document.getElementById('tabAdminBtn')?.addEventListener('click', () => switchTab('admin'));
    document.getElementById('userLoginBtn')?.addEventListener('click', userLogin);
    document.getElementById('adminLoginBtn')?.addEventListener('click', adminLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('hamburgerBtn')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('menuOverlay')?.addEventListener('click', closeMobileMenu);
    document.getElementById('closeModalBtn')?.addEventListener('click', () => closeModal('shareModal'));
    document.getElementById('closeInfoModalBtn')?.addEventListener('click', () => closeModal('infoModal'));
    document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
        const input = document.getElementById('linkInput');
        navigator.clipboard.writeText(input.value);
        showToast('Link copied!');
        closeModal('shareModal');
    });
    document.getElementById('shLoginBtn')?.addEventListener('click', shLogin);
    document.getElementById('shShareFolderBtn')?.addEventListener('click', shShareFolder);
    
    window.renderUserDashboard = renderUserDashboard;
    window.refreshUserFiles = refreshUserFiles;
    window.setView = setView;
    window.downloadFile = downloadFile;
    window.showFileInfo = showFileInfo;
    window.shareUserFolder = shareUserFolder;
    window.renderAdminDashboard = renderAdminDashboard;
    window.viewAdminFolder = viewAdminFolder;
    window.refreshAdminFolder = refreshAdminFolder;
    window.adminDownloadFile = adminDownloadFile;
    window.adminFileInfo = adminFileInfo;
    window.adminDeleteFile = adminDeleteFile;
    window.renderMonitor = renderMonitor;
    window.shDownload = shDownload;
    window.exportLogsAsHTML = exportLogsAsHTML;
    window.closeModal = closeModal;
    window.handleUpload = handleUpload;
    
    if (!checkHash() && !session) {
        showOnlyPage('loginPage');
    }
}

init();