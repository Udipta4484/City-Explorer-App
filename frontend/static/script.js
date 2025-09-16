const API_BASE = "https://city-explorer-api.onrender.com";
const $ = sel => document.querySelector(sel);

// --- State to hold current city info ---
let currentCityInfo = null;

// --- API Client (Unchanged) ---
async function apiSearchCity(q) { const resp = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`); if (!resp.ok) throw await resp.json(); return resp.json(); }
async function apiRegister(email, password) { const resp = await fetch(`${API_BASE}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), }); if (!resp.ok) throw await resp.json(); return resp.json(); }
async function apiLogin(email, password) { const formData = new URLSearchParams(); formData.append('username', email); formData.append('password', password); const resp = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formData, }); if (!resp.ok) throw await resp.json(); return resp.json(); }
async function apiSaveFavorite(token, favoriteData) { const resp = await fetch(`${API_BASE}/api/favorites`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify(favoriteData), }); if (!resp.ok) throw await resp.json(); return resp.json(); }
async function apiListFavorites(token) { const resp = await fetch(`${API_BASE}/api/favorites`, { headers: { "Authorization": `Bearer ${token}` } }); if (!resp.ok) throw await resp.json(); return resp.json(); }
async function apiDeleteFavorite(token, favoriteId) { const resp = await fetch(`${API_BASE}/api/favorites/${favoriteId}`, { method: 'DELETE', headers: { "Authorization": `Bearer ${token}` } }); if (!resp.ok) { try { throw await resp.json(); } catch(e) { throw new Error('Failed to delete'); } } return resp; }

// --- Auth Helpers (Unchanged) ---
function saveToken(token) { localStorage.setItem("authToken", token); }
function getToken() { return localStorage.getItem("authToken"); }
function clearToken() { localStorage.removeItem("authToken"); currentCityInfo = null; }

// --- UI Rendering ---
function updateAuthUI() { /* ... unchanged ... */
    const token = getToken();
    const authControls = $("#auth-controls");
    if (token) {
        authControls.innerHTML = `<button id="logoutBtn" class="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg text-sm hover:bg-slate-300">Logout</button>`;
        $("#logoutBtn").addEventListener("click", () => { clearToken(); updateAuthUI(); renderFavoritesList(); showToast("You have been logged out."); });
    } else {
        authControls.innerHTML = `<button id="loginBtn" class="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm shadow-sm hover:bg-indigo-700">Login / Register</button>`;
        $("#loginBtn").addEventListener("click", showAuthModal);
    }
}

// UPDATED: Displays city name and handles delete
async function renderFavoritesList() {
    const favoritesContainer = $("#favorites-container");
    if (!favoritesContainer) return;
    const token = getToken();
    if (!token) { favoritesContainer.innerHTML = '<p class="text-slate-500 text-sm">Please log in to see your favorites.</p>'; return; }
    try {
        const favorites = await apiListFavorites(token);
        if (favorites.length === 0) { favoritesContainer.innerHTML = '<p class="text-slate-500 text-sm">You haven\'t saved any favorites yet.</p>'; return; }
        
        favoritesContainer.innerHTML = favorites.map(fav => `
            <div class="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-md border">
                <div class="flex items-start gap-3 overflow-hidden">
                    <i data-lucide="star" class="w-5 h-5 text-amber-500 flex-shrink-0 mt-1"></i>
                    <div class="overflow-hidden">
                        <p class="font-semibold text-sm truncate" title="${escapeHtml(fav.name)}, ${escapeHtml(fav.city)}">${escapeHtml(fav.name)}</p>
                        <p class="text-xs text-slate-500 truncate">${escapeHtml(fav.city)}</p>
                    </div>
                </div>
                <button class="delete-btn p-1 rounded-full hover:bg-slate-200 flex-shrink-0" data-favorite-id="${fav.id}">
                    <i data-lucide="trash-2" class="w-4 h-4 text-red-500"></i>
                </button>
            </div>
        `).join('');

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const favoriteId = e.currentTarget.dataset.favoriteId;
                e.currentTarget.disabled = true; // Prevent double clicks
                try {
                    await apiDeleteFavorite(token, favoriteId);
                    showToast("Favorite removed!", "success");
                    await renderFavoritesList();
                    // Also refresh the main attraction view if it's visible
                    if (currentCityInfo) {
                        const favorites = await apiListFavorites(token);
                        renderResult(currentCityInfo, favorites);
                    }
                } catch (error) {
                    showToast("Failed to remove favorite.", "error");
                    e.currentTarget.disabled = false;
                }
            });
        });
        lucide.createIcons();
    } catch (error) {
        favoritesContainer.innerHTML = '<p class="text-red-500 text-sm">Could not load favorites.</p>';
    }
}

// UPDATED: Now passes the full list of favorites to renderAttractionCard
function renderResult(data, favorites = []) {
  currentCityInfo = data; // Store current city data globally
  const { city, weather, local_time, attractions } = data;
  const favoritePlaceIds = new Set(favorites.map(f => f.place_id));

  $("#result").innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2">
        <div class="bg-white p-6 rounded-xl card-shadow">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm text-slate-500">Location</p>
              <h2 class="text-3xl font-bold tracking-tight">${city.name}, ${city.country}</h2>
              <p class="text-slate-600 mt-1">${new Date(local_time.local_time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} <span class="text-slate-400">(${local_time.timezone})</span></p>
            </div>
            <div class="text-right">
              <div class="flex items-center gap-3"><i data-lucide="${getWeatherIcon(weather.icon)}" class="w-12 h-12 text-indigo-500"></i><p class="text-5xl font-extrabold">${Math.round(weather.temp ?? 0)}°C</p></div>
              <p class="text-slate-600 capitalize mt-1">${weather.description || ''}</p>
            </div>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl card-shadow mt-8">
            <h3 class="text-xl font-bold mb-4">Top Attractions</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${attractions.length > 0 ? attractions.map(attraction => renderAttractionCard(attraction, favoritePlaceIds)).join('') : '<p class="text-slate-500 text-sm col-span-2">No attractions found.</p>'}
            </div>
        </div>
      </div>
      <div class="lg:col-span-1 bg-white p-6 rounded-xl card-shadow">
        <h3 class="text-xl font-bold mb-4">My Favorites</h3>
        <div id="favorites-container" class="space-y-3 max-h-[30rem] overflow-y-auto pr-2"></div>
      </div>
    </div>
  `;
  attachSaveButtonListeners();
  renderFavoritesList();
  lucide.createIcons();
}

// UPDATED: Renders button state based on whether it's a favorite
function renderAttractionCard(attraction, favoritePlaceIds) {
  const isSaved = favoritePlaceIds.has(attraction.xid);
  const dataAttrs = `data-place-id="${escapeHtml(attraction.xid)}" data-name="${escapeHtml(attraction.name)}" data-lat="${attraction.point?.lat || ''}" data-lon="${attraction.point?.lon || ''}"`;
  
  return `
    <div class="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div class="flex-shrink-0 w-10 h-10 bg-white rounded-md flex items-center justify-center"><i data-lucide="map-pin" class="text-indigo-500"></i></div>
      <div class="flex-1"><p class="font-semibold text-slate-800">${escapeHtml(attraction.name)}</p><p class="text-xs text-slate-500 mt-1">${escapeHtml(attraction.description)}</p></div>
      <button class="save-btn p-2 rounded-full hover:bg-slate-200 transition-colors ${isSaved ? 'saved' : ''}" ${dataAttrs} ${isSaved ? 'disabled' : ''}>
        <i data-lucide="heart" class="w-5 h-5 ${isSaved ? 'text-red-500' : 'text-slate-500'}" style="fill: ${isSaved ? 'currentColor' : 'none'}"></i>
      </button>
    </div>
  `;
}

// --- UI Interaction Logic ---
// UPDATED: Immediately disables button to prevent double toasts/clicks
function attachSaveButtonListeners() {
    document.querySelectorAll('.save-btn:not([disabled])').forEach(button => {
        button.addEventListener('click', async (e) => {
            const token = getToken();
            if (!token) { showAuthModal(); return; }
            const btn = e.currentTarget;
            btn.disabled = true; // Disable button immediately
            const favoriteData = {
                place_id: btn.dataset.placeId,
                name: btn.dataset.name,
                city: currentCityInfo.city.name, // Add current city name
                country: currentCityInfo.city.country, // Add current country
                lat: btn.dataset.lat ? parseFloat(btn.dataset.lat) : null,
                lon: btn.dataset.lon ? parseFloat(btn.dataset.lon) : null,
            };
            try {
                await apiSaveFavorite(token, favoriteData);
                showToast("Saved to favorites!", "success");
                const icon = btn.querySelector("i");
                icon.classList.remove("text-slate-500"); icon.classList.add("text-red-500"); icon.style.fill = "currentColor";
                await renderFavoritesList(); // Refresh the list
            } catch (error) {
                // showToast(error.detail || "Failed to save", "error");
                // btn.disabled = false; // Re-enable button ONLY on failure
            }
        });
    });
}

// --- Main Search Logic ---
// UPDATED: Fetches favorites and search results at the same time
async function doSearch() {
  const q = $("#q").value.trim();
  if (!q) return showToast("Please enter a city name.", "error");

  $("#placeholder")?.remove();
  $("#result").innerHTML = `<div class="text-center p-10"><i data-lucide="loader-circle" class="mx-auto w-12 h-12 text-slate-400 animate-spin"></i><p class="mt-4 text-slate-500">Fetching data...</p></div>`;
  lucide.createIcons();

  try {
    const token = getToken();
    const [searchData, favoritesData] = await Promise.all([
        apiSearchCity(q),
        token ? apiListFavorites(token) : Promise.resolve([])
    ]);
    renderResult(searchData, favoritesData);
  } catch (err) {
    $("#result").innerHTML = `<div class="p-6 bg-red-50 text-red-700 rounded-lg text-center"><i data-lucide="alert-triangle" class="mx-auto w-10 h-10"></i><h3 class="font-semibold mt-2">Search Failed</h3><p class="text-sm">${err.detail || err.message}</p></div>`;
    lucide.createIcons();
  }
}

// --- Other Functions (Unchanged or minor tweaks) ---
function showAuthModal() { /* ... unchanged ... */ const modalContainer = $("#modal-container"); modalContainer.innerHTML = `<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-40" id="modal-backdrop"><div class="bg-white rounded-xl p-8 w-full max-w-sm card-shadow"><div class="flex justify-between items-center"><h2 class="text-2xl font-bold">Welcome</h2><button id="closeModalBtn" class="p-1 rounded-full hover:bg-slate-200"><i data-lucide="x"></i></button></div><p class="text-slate-500 mt-1">Log in or create an account.</p><div class="mt-6 space-y-4"><input id="email-input" type="email" placeholder="Email address" class="w-full p-3 border rounded-lg"><input id="password-input" type="password" placeholder="Password" class="w-full p-3 border rounded-lg"><div class="flex gap-3"><button id="loginActionBtn" class="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-lg">Login</button><button id="registerActionBtn" class="flex-1 py-3 bg-slate-200 font-semibold rounded-lg">Register</button></div><p id="modal-error" class="text-red-500 text-sm text-center"></p></div></div></div>`; lucide.createIcons(); const closeModal = () => modalContainer.innerHTML = ''; $("#closeModalBtn").addEventListener("click", closeModal); $("#modal-backdrop").addEventListener("click", (e) => { if (e.target === $("#modal-backdrop")) closeModal(); }); $("#loginActionBtn").addEventListener("click", async () => { const email = $("#email-input").value; const password = $("#password-input").value; $("#modal-error").textContent = ""; try { const data = await apiLogin(email, password); saveToken(data.access_token); updateAuthUI(); renderFavoritesList(); closeModal(); showToast("Successfully logged in!", "success"); } catch (error) { $("#modal-error").textContent = error.detail || "Login failed."; } }); $("#registerActionBtn").addEventListener("click", async () => { const email = $("#email-input").value; const password = $("#password-input").value; $("#modal-error").textContent = ""; try { await apiRegister(email, password); const data = await apiLogin(email, password); saveToken(data.access_token); updateAuthUI(); renderFavoritesList(); closeModal(); showToast("Account created!", "success"); } catch (error) { $("#modal-error").textContent = error.detail || "Registration failed."; } });}
function showToast(message, type = "info") { /* ... unchanged ... */ const colors = { info: 'bg-sky-600', success: 'bg-green-600', error: 'bg-red-600' }; const toastContainer = $("#toast-container"); const toast = document.createElement("div"); toast.className = `px-4 py-3 rounded-lg text-white font-semibold shadow-lg ${colors[type]}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => { toast.remove(); }, 3000); }
function getWeatherIcon(iconCode) { /* ... unchanged ... */ const iconMap = {'01d':'sun','01n':'moon','02d':'cloud-sun','02n':'cloud-moon','03d':'cloud','03n':'cloud','04d':'cloudy','04n':'cloudy','09d':'cloud-rain','09n':'cloud-rain','10d':'cloud-drizzle','10n':'cloud-drizzle','11d':'cloud-lightning','11n':'cloud-lightning','13d':'cloud-snow','13n':'cloud-snow','50d':'wind','50n':'wind'}; return iconMap[iconCode] || 'sun';}
function escapeHtml(s) { /* ... unchanged ... */ if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function init() { $("#searchBtn").addEventListener("click", doSearch); $("#q").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); }); updateAuthUI(); }

document.addEventListener("DOMContentLoaded", init);
