const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(frequency = 440, duration = 0.1, volume = 0.5) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log("Audio error: ", e);
    }
}

let wakeLock = null;
async function requestWakeLock() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    } catch (err) {
        console.log("WakeLock error:", err);
    }
}
function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => { wakeLock = null; });
    }
}

function speakText(text) {
    if (typeof state !== "undefined" && !state.voiceCoachEnabled) return;
    if (!("speechSynthesis" in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "vi-VN";
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang && v.lang.includes("vi"));
        if (viVoice) utterance.voice = viVoice;

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.log("Speech synthesis error:", e);
    }
}

function calculateCalories(reps, weightKg = 65) {
    const kcalPerRep = (weightKg / 70) * 0.45;
    return Math.round(reps * kcalPerRep * 10) / 10;
}

function calculateStreak(workouts, targetUsername) {
    if (!workouts || !targetUsername) return { currentStreak: 0, longestStreak: 0 };
    const userWorkouts = workouts.filter(w => w.username && w.username.toLowerCase() === targetUsername.toLowerCase());
    if (userWorkouts.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const dateSet = new Set();
    userWorkouts.forEach(w => {
        if (w.date) {
            const dateStr = w.date.split("T")[0];
            dateSet.add(dateStr);
        }
    });

    const sortedDates = Array.from(dateSet).sort();
    if (sortedDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prevDate = new Date(sortedDates[i - 1]);
            const currDate = new Date(sortedDates[i]);
            const diffDays = Math.round((currDate - prevDate) / (1000 * 3600 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else if (diffDays > 1) {
                tempStreak = 1;
            }
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let checkDateStr = dateSet.has(todayStr) ? todayStr : (dateSet.has(yesterdayStr) ? yesterdayStr : null);

    if (checkDateStr) {
        let curr = new Date(checkDateStr);
        while (dateSet.has(curr.toISOString().split("T")[0])) {
            currentStreak++;
            curr.setDate(curr.getDate() - 1);
        }
    }

    return { currentStreak, longestStreak };
}

const state = {
    currentUser: null,
    apiUrl: "https://script.google.com/macros/s/AKfycbwzcgrJGP8beeRmfppSf9m5_eUwA-WM_5bSR3YrYZcA4n0rQ9VJfSTGbHXfhkmZcbzW/exec",
    authMode: "login",
    leaderboardPeriod: "all",
    minReps: 5,
    step: 2,
    maxReps: 15,
    weight: 65,
    voiceCoachEnabled: true,
    currentReps: 5,
    direction: 1,
    setCount: 1,
    totalReps: 0,
    totalTimeSeconds: 0,
    sessionCalories: 0,
    isPaused: false,
    workoutSecondsElapsed: 0,
    restSecondsLeft: 0,
    timerInterval: null,
    chartInstance: null,
    compareChartInstance: null
};

const screens = {
    auth: document.getElementById("auth-screen"),
    main: document.getElementById("main-screen"),
    setup: document.getElementById("setup-screen"),
    workout: document.getElementById("workout-screen"),
    rest: document.getElementById("rest-screen"),
    finished: document.getElementById("finished-screen")
};

async function callApi(payload) {
    if (!state.apiUrl) return { offline: true };
    try {
        const response = await fetch(state.apiUrl, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        return await response.json();
    } catch (e) {
        console.warn("API Call Failed, fallback to local:", e);
        return { offline: true, error: e };
    }
}

function getLocalData() {
    const data = localStorage.getItem("pushup_master_data");
    return data ? JSON.parse(data) : { users: {}, workouts: [] };
}
function saveLocalData(data) {
    localStorage.setItem("pushup_master_data", JSON.stringify(data));
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[screenName].classList.add("active");
}
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwzcgrJGP8beeRmfppSf9m5_eUwA-WM_5bSR3YrYZcA4n0rQ9VJfSTGbHXfhkmZcbzW/exec";

const VARIATIONS_INFO = {
    standard: {
        name: "Standard Push-up",
        icon: "🏋️",
        target: "🎯 Tác động: Ngực giữa, vai trước & tay sau (Triceps)",
        form: "<strong>Kỹ thuật chuẩn:</strong> Hai tay mở rộng bằng vai, giữ lưng thẳng từ đầu đến gót. Hạ ngực xuống sát sàn 2s rồi đẩy dứt khoát lên.",
        repsGoal: "💡 Mục tiêu gợi ý: Min 5 - Max 20 reps / set"
    },
    incline: {
        name: "Incline Push-up",
        icon: "📐",
        target: "🎯 Tác động: Cơ ngực dưới & hỗ trợ khởi động nhẹ nhàng",
        form: "<strong>Kỹ thuật chuẩn:</strong> Đặt hai tay lên vị trí cao hơn chân (ghế, bậc thang). Giữ thẳng cột sống và hạ ngực chạm mép ghế.",
        repsGoal: "💡 Mục tiêu gợi ý: Min 10 - Max 25 reps / set"
    },
    decline: {
        name: "Decline Push-up",
        icon: "📉",
        target: "🎯 Tác động: Chuyên sâu Cơ ngực trên (Upper Chest) & Vai",
        form: "<strong>Kỹ thuật chuẩn:</strong> Đặt hai chân lên ghế cao hơn tay. Dồn trọng lượng lên thân trên, hạ trán sát sàn rồi gồng ngực đẩy lên.",
        repsGoal: "💡 Mục tiêu gợi ý: Min 5 - Max 15 reps / set"
    },
    diamond: {
        name: "Diamond Push-up",
        icon: "💎",
        target: "🎯 Tác động: Tay sau (Triceps) & Khe ngực trong (Inner Chest)",
        form: "<strong>Kỹ thuật chuẩn:</strong> Hai bàn tay chắp hình kim cương (ngón trỏ và ngón cái chạm nhau). Hạ ngực chạm vào giữa hai bàn tay.",
        repsGoal: "💡 Mục tiêu gợi ý: Min 5 - Max 12 reps / set"
    },
    wide: {
        name: "Wide Push-up",
        icon: "👐",
        target: "🎯 Tác động: Mở rộng Biên độ Ngực ngoài (Outer Chest)",
        form: "<strong>Kỹ thuật chuẩn:</strong> Đặt hai tay rộng gấp 1.5 lần vai. Ép mạnh cơ ngực ngoài để đẩy người lên.",
        repsGoal: "💡 Mục tiêu gợi ý: Min 8 - Max 18 reps / set"
    },
    knee: {
        name: "Knee Push-up",
        icon: "🧎",
        target: "🎯 Tác động: Ngực & Vai (Dành cho khởi động hoặc trợ lực)",
        form: "<strong>Kỹ thuật chuẩn:</strong> Chống hai gối xuống sàn, bắt chéo chân phía sau. Giữ từ đầu gối tới đầu thành đường thẳng.",
        repsGoal: "💡 Mục tiêu gợi ý: Min 10 - Max 30 reps / set"
    },
    pike: {
        name: "Pike Push-up",
        icon: "💥",
        target: "🎯 Tác động: Cơ Vai (Shoulders) & Cơ Tay Sau",
        form: "<strong>Kỹ thuật chuẩn:</strong> Đẩy mông cao tạo hình chữ V ngược. Hạ đỉnh đầu hướng xuống sàn giữa hai tay rồi đẩy mạnh vai lên.",
        repsGoal: "💡 Mục tiêu gợi ý: Min 5 - Max 15 reps / set"
    }
};

function updateSetupVariationGuide() {
    const select = document.getElementById("setup-variation");
    if (!select) return;
    const key = select.value || "standard";
    const info = VARIATIONS_INFO[key] || VARIATIONS_INFO.standard;

    const targetEl = document.getElementById("var-guide-target");
    const formEl = document.getElementById("var-guide-form");
    const repsEl = document.getElementById("var-guide-reps");

    if (targetEl) targetEl.innerText = info.target;
    if (formEl) formEl.innerHTML = info.form;
    if (repsEl) repsEl.innerText = info.repsGoal;
}

document.addEventListener("DOMContentLoaded", () => {
    const savedApiUrl = localStorage.getItem("pushup_api_url");
    if (savedApiUrl) {
        state.apiUrl = savedApiUrl;
    }
    initEvents();
    checkSavedLogin();
});

function computeWorkoutPlan() {
    const modeSelect = document.getElementById("workout-mode-select");
    const mode = modeSelect ? modeSelect.value : "pyramid_auto";

    if (mode === "fixed") {
        const reps = parseInt(document.getElementById("fixed-reps").value, 10) || 20;
        const sets = parseInt(document.getElementById("fixed-sets").value, 10) || 5;
        const plan = [];
        for (let i = 0; i < sets; i++) {
            plan.push(reps);
        }
        return { mode, plan, summary: `Tổng: ${reps * sets} reps (${sets} sets cố định x ${reps} reps)` };
    } else if (mode === "pyramid_manual") {
        const min = parseInt(document.getElementById("min-reps").value, 10) || 5;
        const step = parseInt(document.getElementById("step").value, 10) || 2;
        const max = parseInt(document.getElementById("max-reps").value, 10) || 15;

        const plan = [];
        let curr = min;
        let dir = 1;
        while (true) {
            plan.push(curr);
            if (dir === 1 && curr >= max) {
                dir = -1;
            }
            curr += step * dir;
            if (dir === -1 && curr < min) {
                break;
            }
        }
        const total = plan.reduce((a, b) => a + b, 0);
        return { mode, plan, summary: `Tổng: ${total} reps (${plan.length} sets, Min: ${min}, Step: ${step}, Max: ${max})` };
    } else {
        const targetReps = parseInt(document.getElementById("pyramid-target-reps").value, 10) || 100;
        let targetSets = parseInt(document.getElementById("pyramid-target-sets").value, 10) || 5;
        if (targetSets % 2 === 0) targetSets += 1;

        const k = Math.ceil(targetSets / 2);
        let bestMin = 10;
        let bestStep = 4;
        let bestDiff = Infinity;

        for (let stepVal = 1; stepVal <= 20; stepVal++) {
            for (let minVal = 1; minVal <= 100; minVal++) {
                const tempPlan = [];
                for (let i = 1; i <= targetSets; i++) {
                    const stepCount = i <= k ? (i - 1) : (targetSets - i);
                    tempPlan.push(minVal + stepCount * stepVal);
                }
                const sum = tempPlan.reduce((a, b) => a + b, 0);
                const diff = Math.abs(sum - targetReps);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestMin = minVal;
                    bestStep = stepVal;
                }
            }
        }

        const bestPlan = [];
        for (let i = 1; i <= targetSets; i++) {
            const stepCount = i <= k ? (i - 1) : (targetSets - i);
            bestPlan.push(bestMin + stepCount * bestStep);
        }

        const actualSum = bestPlan.reduce((a, b) => a + b, 0);
        const maxRep = Math.max(...bestPlan);

        return {
            mode,
            plan: bestPlan,
            summary: `Mục tiêu: ${targetReps} reps • Tính toán thực tế: ${actualSum} reps (${targetSets} sets, Max: ${maxRep} reps/set)`
        };
    }
}

function updateWorkoutPlanPreview() {
    const modeSelect = document.getElementById("workout-mode-select");
    const mode = modeSelect ? modeSelect.value : "pyramid_auto";

    const boxAuto = document.getElementById("mode-pyramid-auto-box");
    const boxManual = document.getElementById("mode-pyramid-manual-box");
    const boxFixed = document.getElementById("mode-fixed-box");

    if (boxAuto) boxAuto.style.display = mode === "pyramid_auto" ? "flex" : "none";
    if (boxManual) boxManual.style.display = mode === "pyramid_manual" ? "flex" : "none";
    if (boxFixed) boxFixed.style.display = mode === "fixed" ? "flex" : "none";

    const result = computeWorkoutPlan();
    const seqEl = document.getElementById("preview-sequence");
    const sumEl = document.getElementById("preview-summary");

    if (seqEl) {
        seqEl.innerText = result.plan.map((r, i) => `Set ${i + 1} (${r})`).join(" ➔ ");
    }
    if (sumEl) {
        sumEl.innerText = result.summary;
    }
}

function initEvents() {
    const varSelect = document.getElementById("setup-variation");
    if (varSelect) {
        varSelect.addEventListener("change", updateSetupVariationGuide);
    }

    const modeSelect = document.getElementById("workout-mode-select");
    if (modeSelect) {
        modeSelect.addEventListener("change", updateWorkoutPlanPreview);
    }

    ["pyramid-target-reps", "pyramid-target-sets", "min-reps", "step", "max-reps", "fixed-reps", "fixed-sets"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateWorkoutPlanPreview);
    });
    document.getElementById("tab-btn-login").addEventListener("click", () => setAuthMode("login"));
    document.getElementById("tab-btn-register").addEventListener("click", () => setAuthMode("register"));
    document.getElementById("btn-auth-submit").addEventListener("click", handleAuthSubmit);


    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            const tabId = btn.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
            if (tabId === "tab-leaderboard") loadLeaderboard();
        });
    });

    document.querySelectorAll("#rank-filter-pills .filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll("#rank-filter-pills .filter-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            state.leaderboardPeriod = pill.getAttribute("data-period");
            loadLeaderboard();
        });
    });

    document.getElementById("btn-logout").addEventListener("click", handleLogout);
    document.getElementById("btn-go-workout").addEventListener("click", openSetupScreen);
    document.getElementById("btn-cancel-setup").addEventListener("click", () => showScreen("main"));
    document.getElementById("btn-start-workout").addEventListener("click", startWorkoutSession);
    document.getElementById("btn-refresh-rank").addEventListener("click", loadLeaderboard);
    document.getElementById("btn-save-settings").addEventListener("click", handleSaveSettings);

    document.getElementById("btn-google-login").addEventListener("click", handleGoogleSignIn);
    document.getElementById("btn-gen-pass").addEventListener("click", generateStrongPassword);
    document.getElementById("auth-pin").addEventListener("input", () => updatePasswordStrengthMeter());

    document.getElementById("btn-forgot-pass").addEventListener("click", openForgotPasswordModal);
    document.getElementById("btn-close-forgot").addEventListener("click", closeForgotPasswordModal);
    document.getElementById("btn-send-otp").addEventListener("click", handleSendOtp);
    document.getElementById("btn-reset-pass-submit").addEventListener("click", handleResetPasswordSubmit);

    document.getElementById("btn-toggle-admin").addEventListener("click", handleToggleAdminMode);
    document.getElementById("btn-save-api").addEventListener("click", handleSaveApiUrl);
    document.getElementById("btn-reset-api").addEventListener("click", handleResetApiUrl);
    document.getElementById("btn-test-api").addEventListener("click", handleTestApiConnection);

    document.getElementById("btn-pause-workout").addEventListener("click", togglePauseWorkout);
    document.getElementById("btn-done-workout").addEventListener("click", finishWorkoutSet);

    document.getElementById("btn-pause-rest").addEventListener("click", togglePauseRest);
    document.getElementById("btn-skip-rest").addEventListener("click", skipRest);

    document.getElementById("btn-cancel-workout").addEventListener("click", cancelWorkoutSession);
    document.getElementById("btn-cancel-rest").addEventListener("click", cancelWorkoutSession);

    document.getElementById("btn-save-finish").addEventListener("click", saveAndReturnToLeaderboard);
    document.getElementById("btn-close-compare").addEventListener("click", closeCompareModal);
}

function setAuthMode(mode) {
    state.authMode = mode;
    document.getElementById("tab-btn-login").classList.toggle("active", mode === "login");
    document.getElementById("tab-btn-register").classList.toggle("active", mode === "register");
    document.getElementById("auth-title").innerText = mode === "login" ? "Đăng Nhập" : "Đăng Ký Mới";
    document.getElementById("auth-desc").innerText = mode === "login" ? "Nhập tài khoản để lưu lịch sử và xếp hạng" : "Tạo tài khoản mới để bắt đầu tập luyện";
    
    const emailGroup = document.getElementById("group-auth-email");
    const genPassBtn = document.getElementById("btn-gen-pass");
    const strengthContainer = document.getElementById("password-strength-container");
    const labelPin = document.getElementById("label-auth-pin");

    if (mode === "register") {
        if (emailGroup) emailGroup.style.display = "flex";
        if (genPassBtn) genPassBtn.style.display = "inline-block";
        if (strengthContainer) strengthContainer.style.display = "flex";
        if (labelPin) labelPin.innerText = "Mật khẩu mới";
    } else {
        if (emailGroup) emailGroup.style.display = "none";
        if (genPassBtn) genPassBtn.style.display = "none";
        if (strengthContainer) strengthContainer.style.display = "none";
        if (labelPin) labelPin.innerText = "Mật khẩu (hoặc PIN)";
    }
}

function generateStrongPassword() {
    const charsUpper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const charsLower = "abcdefghijkmnpqrstuvwxyz";
    const charsNum = "23456789";
    const charsSym = "!@#$%^&*";
    const allChars = charsUpper + charsLower + charsNum + charsSym;

    let pass = "";
    pass += charsUpper[Math.floor(Math.random() * charsUpper.length)];
    pass += charsLower[Math.floor(Math.random() * charsLower.length)];
    pass += charsNum[Math.floor(Math.random() * charsNum.length)];
    pass += charsSym[Math.floor(Math.random() * charsSym.length)];

    for (let i = 4; i < 12; i++) {
        pass += allChars[Math.floor(Math.random() * allChars.length)];
    }

    pass = pass.split("").sort(() => Math.random() - 0.5).join("");

    const pinInput = document.getElementById("auth-pin");
    pinInput.type = "text";
    pinInput.value = pass;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(pass);
    }
    
    updatePasswordStrengthMeter(pass);
    alert(`🔑 Đã tạo mật khẩu mạnh: ${pass}\n(Mật khẩu đã được tự động chép vào Khay nhớ tạm!)`);
}

function updatePasswordStrengthMeter(passOverride) {
    const pass = passOverride !== undefined ? passOverride : (document.getElementById("auth-pin") ? document.getElementById("auth-pin").value : "");
    const bar = document.getElementById("strength-bar");
    const text = document.getElementById("strength-text");
    if (!bar || !text) return;

    if (!pass) {
        bar.className = "strength-bar-fill";
        bar.style.width = "0%";
        text.innerText = "Độ mạnh: Chưa nhập";
        return;
    }

    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1;

    if (score <= 2) {
        bar.className = "strength-bar-fill weak";
        text.innerText = "Độ mạnh: Yếu (Hãy thêm chữ hoa, số & ký tự)";
        text.style.color = "var(--danger)";
    } else if (score <= 4) {
        bar.className = "strength-bar-fill medium";
        text.innerText = "Độ mạnh: Trung Bình 👍";
        text.style.color = "var(--warning)";
    } else {
        bar.className = "strength-bar-fill strong";
        text.innerText = "Độ mạnh: Rất Mạnh 💪 (An Toàn)";
        text.style.color = "var(--accent)";
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function handleGoogleCredentialResponse(response) {
    if (response && response.credential) {
        const payload = parseJwt(response.credential);
        if (payload) {
            const username = payload.name || payload.email.split("@")[0];
            const email = payload.email;
            const picture = payload.picture;

            const userObj = {
                username,
                email,
                picture,
                isGoogleUser: true,
                defaultMin: 5,
                defaultStep: 2,
                defaultMax: 15,
                weight: 65,
                voiceCoachEnabled: true
            };

            saveUserSession(userObj);
            callApi({
                action: "googleAuth",
                username,
                email,
                picture
            });

            alert(`🎉 Xin chào ${username}! Đăng nhập Google thành công.`);
        }
    }
}

window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

function handleGoogleSignIn() {
    const customClientId = localStorage.getItem("pushup_google_client_id") || state.googleClientId;
    if (customClientId && window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
            client_id: customClientId,
            callback: handleGoogleCredentialResponse
        });
        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                promptGoogleLoginFallback();
            }
        });
    } else {
        promptGoogleLoginFallback();
    }
}

function promptGoogleLoginFallback() {
    const email = prompt("Vui lòng nhập Email Google của bạn để Đăng Nhập Nhanh:");
    if (!email) return;
    const nameStr = email.split("@")[0];
    const username = prompt("Nhập Tên Hiển Thị của bạn:", nameStr) || nameStr;

    const userObj = {
        username: username,
        email: email,
        isGoogleUser: true,
        defaultMin: 5,
        defaultStep: 2,
        defaultMax: 15,
        weight: 65,
        voiceCoachEnabled: true
    };

    saveUserSession(userObj);
    callApi({
        action: "googleAuth",
        username,
        email
    });
    alert(`🎉 Đăng nhập Google tài khoản ${email} thành công!`);
}

function openForgotPasswordModal() {
    document.getElementById("forgot-modal").style.display = "flex";
    document.getElementById("forgot-step-2").style.display = "none";
    document.getElementById("forgot-status-msg").style.display = "none";
}

function closeForgotPasswordModal() {
    document.getElementById("forgot-modal").style.display = "none";
}

async function handleSendOtp() {
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) return alert("Vui lòng nhập Địa chỉ Email!");

    const statusEl = document.getElementById("forgot-status-msg");
    statusEl.style.display = "block";
    statusEl.className = "api-status-msg";
    statusEl.innerText = "⏳ Đang gửi mã OTP đến Email của bạn...";

    const res = await callApi({ action: "sendResetOtp", email });

    if (res.success || res.offline) {
        statusEl.className = "api-status-msg success";
        statusEl.innerText = "✅ Mã OTP xác nhận đã được gửi thành công! Hãy kiểm tra Hộp thư Email.";
        document.getElementById("forgot-step-2").style.display = "block";
    } else {
        statusEl.className = "api-status-msg error";
        statusEl.innerText = `❌ Gửi mã OTP thất bại: ${res.message || "Email không tìm thấy"}`;
    }
}

async function handleResetPasswordSubmit() {
    const email = document.getElementById("forgot-email").value.trim();
    const otp = document.getElementById("forgot-otp").value.trim();
    const newPassword = document.getElementById("forgot-new-pass").value.trim();

    if (!email || !otp || !newPassword) {
        return alert("Vui lòng nhập đầy đủ Email, Mã OTP và Mật khẩu mới!");
    }

    const statusEl = document.getElementById("forgot-status-msg");
    statusEl.style.display = "block";
    statusEl.className = "api-status-msg";
    statusEl.innerText = "⏳ Đang xác nhận OTP và đổi mật khẩu...";

    const res = await callApi({
        action: "resetPasswordWithOtp",
        email,
        otp,
        newPassword
    });

    if (res.success || res.offline) {
        statusEl.className = "api-status-msg success";
        statusEl.innerText = "🎉 Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay.";
        setTimeout(() => {
            closeForgotPasswordModal();
            setAuthMode("login");
            document.getElementById("auth-pin").value = newPassword;
        }, 2000);
    } else {
        statusEl.className = "api-status-msg error";
        statusEl.innerText = `❌ Đổi mật khẩu thất bại: ${res.message || "Mã OTP không đúng hoặc hết hạn!"}`;
    }
}

async function handleAuthSubmit() {
    const username = document.getElementById("auth-username").value.trim();
    const pin = document.getElementById("auth-pin").value.trim();
    const email = document.getElementById("auth-email") ? document.getElementById("auth-email").value.trim() : "";

    if (!username || !pin) return alert("Vui lòng điền đầy đủ tên và mật khẩu!");

    if (state.authMode === "register") {
        if (!email) return alert("Vui lòng nhập địa chỉ Email để bảo mật và khôi phục mật khẩu khi cần!");

        const defaultMin = 5;
        const defaultStep = 2;
        const defaultMax = 15;
        const weight = 65;

        const res = await callApi({
            action: "register",
            username,
            pin,
            email,
            defaultMin,
            defaultStep,
            defaultMax,
            weight
        });

        if (res.success || res.offline) {
            const userObj = { username, pin, email, defaultMin, defaultStep, defaultMax, weight, voiceCoachEnabled: true };
            saveUserSession(userObj);
        } else {
            alert(res.message || "Đăng ký thất bại!");
        }
    } else {
        const res = await callApi({ action: "login", username, pin });
        if (res.success) {
            saveUserSession(res.user);
        } else if (res.offline) {
            const localData = getLocalData();
            if (localData.users[username]) {
                saveUserSession(localData.users[username]);
            } else {
                saveUserSession({ username, pin, email, defaultMin: 5, defaultStep: 2, defaultMax: 15, weight: 65, voiceCoachEnabled: true });
            }
        } else {
            alert(res.message || "Đăng nhập thất bại!");
        }
    }
}

function saveUserSession(user) {
    state.currentUser = user;
    localStorage.setItem("pushup_current_user", JSON.stringify(user));
    const data = getLocalData();
    data.users[user.username] = user;
    saveLocalData(data);
    openMainScreen();
}

function checkSavedLogin() {
    const saved = localStorage.getItem("pushup_current_user");
    if (saved) {
        state.currentUser = JSON.parse(saved);
        openMainScreen();
    }
}

function handleLogout() {
    state.currentUser = null;
    localStorage.removeItem("pushup_current_user");
    showScreen("auth");
}

function openMainScreen() {
    showScreen("main");
    document.getElementById("display-username").innerText = state.currentUser.username;
    
    state.weight = state.currentUser.weight || 65;
    state.voiceCoachEnabled = state.currentUser.voiceCoachEnabled !== undefined ? state.currentUser.voiceCoachEnabled : true;

    document.getElementById("setting-min").value = state.currentUser.defaultMin || 5;
    document.getElementById("setting-step").value = state.currentUser.defaultStep || 2;
    document.getElementById("setting-max").value = state.currentUser.defaultMax || 15;
    document.getElementById("setting-weight").value = state.weight;
    document.getElementById("setting-voice-enable").checked = state.voiceCoachEnabled;
    document.getElementById("setting-api-url").value = state.apiUrl;

    updateAdminCardVisibility();
    renderDashboardStats();
}

function isCurrentUserAdmin() {
    if (!state.currentUser) return false;
    const uname = (state.currentUser.username || "").toLowerCase();
    const adminNames = ["admin", "h2o86", "ha19"];
    return !!(state.currentUser.isAdmin || adminNames.includes(uname));
}

function updateAdminCardVisibility() {
    const card = document.getElementById("admin-api-card");
    if (card) {
        card.style.display = isCurrentUserAdmin() ? "flex" : "none";
    }
}

function handleToggleAdminMode() {
    const card = document.getElementById("admin-api-card");
    if (isCurrentUserAdmin()) {
        if (card) {
            const isShown = card.style.display !== "none";
            card.style.display = isShown ? "none" : "flex";
        }
    } else {
        const pin = prompt("🔑 Nhập Mật Khẩu / PIN Quản Trị (Admin):");
        if (pin === "admin" || pin === "1234" || (state.currentUser && pin === state.currentUser.pin)) {
            state.currentUser.isAdmin = true;
            localStorage.setItem("pushup_current_user", JSON.stringify(state.currentUser));
            updateAdminCardVisibility();
            alert("🎉 Đã xác minh thành công! Đã bật Chế độ Quản Trị (Admin Mode).");
        } else if (pin !== null) {
            alert("❌ Mật khẩu Quản trị không chính xác!");
        }
    }
}

function handleSaveApiUrl() {
    const urlInput = document.getElementById("setting-api-url").value.trim();
    if (!urlInput) {
        return alert("Vui lòng nhập URL Google Apps Script Web App hợp lệ!");
    }
    state.apiUrl = urlInput;
    localStorage.setItem("pushup_api_url", urlInput);
    
    const statusEl = document.getElementById("api-test-status");
    statusEl.style.display = "block";
    statusEl.className = "api-status-msg success";
    statusEl.innerText = "✅ Đã lưu URL Google Apps Script mới!";
    setTimeout(() => { statusEl.style.display = "none"; }, 3500);
}

function handleResetApiUrl() {
    if (confirm("Bạn có chắc chắn muốn khôi phục URL Google Apps Script về mặc định không?")) {
        state.apiUrl = DEFAULT_API_URL;
        localStorage.removeItem("pushup_api_url");
        document.getElementById("setting-api-url").value = DEFAULT_API_URL;

        const statusEl = document.getElementById("api-test-status");
        statusEl.style.display = "block";
        statusEl.className = "api-status-msg success";
        statusEl.innerText = "🔄 Đã khôi phục URL Server về mặc định!";
        setTimeout(() => { statusEl.style.display = "none"; }, 3500);
    }
}

async function handleTestApiConnection() {
    const statusEl = document.getElementById("api-test-status");
    const testUrl = document.getElementById("setting-api-url").value.trim();
    if (!testUrl) return alert("Vui lòng nhập URL cần test!");

    statusEl.style.display = "block";
    statusEl.className = "api-status-msg";
    statusEl.innerText = "⏳ Đang kết nối thử tới Google Apps Script...";

    try {
        const response = await fetch(testUrl, {
            method: "POST",
            body: JSON.stringify({ action: "getLeaderboard", period: "all" }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const res = await response.json();
        if (res.success || res.leaderboard) {
            statusEl.className = "api-status-msg success";
            statusEl.innerText = "🎉 Kết nối Server thành công! Google Apps Script hoạt động tốt.";
        } else {
            statusEl.className = "api-status-msg error";
            statusEl.innerText = `⚠️ Phản hồi từ Server: ${res.message || "Không có lỗi nhưng dữ liệu trả về khác chuẩn"}`;
        }
    } catch (err) {
        statusEl.className = "api-status-msg error";
        statusEl.innerText = `❌ Không thể kết nối tới Server. Vui lòng kiểm tra lại URL Web App!`;
    }
}

async function handleSaveSettings() {
    const min = parseInt(document.getElementById("setting-min").value, 10) || 5;
    const step = parseInt(document.getElementById("setting-step").value, 10) || 2;
    const max = parseInt(document.getElementById("setting-max").value, 10) || 15;
    const weight = parseFloat(document.getElementById("setting-weight").value) || 65;
    const voiceCoachEnabled = document.getElementById("setting-voice-enable").checked;

    state.currentUser.defaultMin = min;
    state.currentUser.defaultStep = step;
    state.currentUser.defaultMax = max;
    state.currentUser.weight = weight;
    state.currentUser.voiceCoachEnabled = voiceCoachEnabled;

    state.weight = weight;
    state.voiceCoachEnabled = voiceCoachEnabled;

    localStorage.setItem("pushup_current_user", JSON.stringify(state.currentUser));

    const localData = getLocalData();
    if (localData.users[state.currentUser.username]) {
        localData.users[state.currentUser.username] = state.currentUser;
        saveLocalData(localData);
    }

    callApi({
        action: "updateSettings",
        username: state.currentUser.username,
        defaultMin: min,
        defaultStep: step,
        defaultMax: max,
        weight: weight,
        voiceCoachEnabled: voiceCoachEnabled
    });

    alert("Đã lưu các cài đặt thành công!");
}

function openSetupScreen() {
    showScreen("setup");
    document.getElementById("min-reps").value = state.currentUser.defaultMin || 5;
    document.getElementById("step").value = state.currentUser.defaultStep || 2;
    document.getElementById("max-reps").value = state.currentUser.defaultMax || 15;
    updateSetupVariationGuide();
    updateWorkoutPlanPreview();
}

function renderDashboardStats() {
    const localData = getLocalData();
    const myWorkouts = localData.workouts.filter(w => w.username === state.currentUser.username);

    let totalReps = 0;
    let totalCalories = 0;

    myWorkouts.forEach(w => {
        totalReps += (w.reps || 0);
        if (w.calories) {
            totalCalories += w.calories;
        } else {
            totalCalories += calculateCalories(w.reps || 0, state.weight);
        }
    });

    const streakData = calculateStreak(localData.workouts, state.currentUser.username);

    document.getElementById("dash-total-reps").innerText = totalReps;
    document.getElementById("dash-total-workouts").innerText = myWorkouts.length;
    document.getElementById("dash-total-calories").innerText = Math.round(totalCalories);
    document.getElementById("dash-current-streak").innerText = streakData.currentStreak;

    const streakBadge = document.getElementById("header-streak-badge");
    if (streakBadge) {
        streakBadge.innerText = `🔥 ${streakData.currentStreak} ngày`;
    }

    renderDashboardTop10AndMyRank(localData);
    renderVariationDistribution(myWorkouts);
}

function renderVariationDistribution(myWorkouts) {
    const listEl = document.getElementById("var-distribution-list");
    const totalCountEl = document.getElementById("var-total-count");
    const advisorEl = document.getElementById("var-advisor-box");
    if (!listEl) return;

    const counts = {
        standard: 0,
        incline: 0,
        decline: 0,
        diamond: 0,
        wide: 0,
        knee: 0,
        pike: 0
    };

    let grandTotal = 0;
    myWorkouts.forEach(w => {
        const vKey = w.variation || "standard";
        const reps = w.reps || 0;
        if (counts[vKey] !== undefined) {
            counts[vKey] += reps;
        } else {
            counts.standard += reps;
        }
        grandTotal += reps;
    });

    if (totalCountEl) totalCountEl.innerText = `${grandTotal} reps`;

    if (grandTotal === 0) {
        listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Chưa có dữ liệu bài tập nào!</div>';
        if (advisorEl) advisorEl.innerHTML = "💡 <em>Hãy tập đa dạng các kiểu push-up để cơ ngực, vai và tay sau phát triển toàn diện!</em>";
        return;
    }

    listEl.innerHTML = "";
    const activeVariations = Object.keys(counts)
        .map(k => ({ key: k, reps: counts[k], pct: Math.round((counts[k] / grandTotal) * 100) }))
        .sort((a, b) => b.reps - a.reps);

    activeVariations.forEach(item => {
        if (item.reps > 0) {
            const info = VARIATIONS_INFO[item.key] || { name: item.key, icon: "🏋️" };
            const row = document.createElement("div");
            row.className = "var-item-row";
            row.innerHTML = `
                <div class="var-item-meta">
                    <span>${info.icon} ${info.name}: ${item.reps} reps</span>
                    <span class="var-item-pct">${item.pct}%</span>
                </div>
                <div class="var-progress-bar">
                    <div class="var-progress-fill" style="width: ${item.pct}%;"></div>
                </div>
            `;
            listEl.appendChild(row);
        }
    });

    const topVar = activeVariations[0];
    let adviceText = "";

    if (topVar && topVar.pct >= 70) {
        const info = VARIATIONS_INFO[topVar.key] || { name: topVar.key };
        adviceText = `💡 <strong>Lời khuyên cân bằng:</strong> Bạn đang dành đến ${topVar.pct}% bài tập cho <strong>${info.name}</strong>. Để tránh lệch nhóm cơ, hãy thử kết hợp thêm <strong>Decline Push-up (ngực trên)</strong> hoặc <strong>Pike Push-up (cơ vai)</strong> nhé!`;
    } else if (activeVariations.filter(v => v.reps > 0).length >= 3) {
        adviceText = `🌟 <strong>Tuyệt vời!</strong> Bạn đang phân phối rất đều giữa các kiểu push-up. Toàn bộ cơ ngực trên, ngực dưới, vai và tay sau đều được kích hoạt toàn diện!`;
    } else {
        adviceText = `💡 <strong>Mẹo luyện tập:</strong> Hãy thử thách bản thân với <strong>Diamond Push-up</strong> (tăng cơ tay sau) hoặc <strong>Decline Push-up</strong> (tập trung ngực trên) trong buổi tập tới!`;
    }

    if (advisorEl) advisorEl.innerHTML = adviceText;
}

async function renderDashboardTop10AndMyRank(localData) {
    const top10Container = document.getElementById("dash-top10-container");
    if (!top10Container) return;

    let ranking = [];
    const res = await callApi({ action: "getLeaderboard", period: "all" });

    if (res && res.success && res.leaderboard && res.leaderboard.length > 0) {
        ranking = res.leaderboard;
    } else {
        const userStats = {};
        (localData.workouts || []).forEach(w => {
            if (!userStats[w.username]) {
                userStats[w.username] = { username: w.username, totalReps: 0, totalWorkouts: 0 };
            }
            userStats[w.username].totalReps += (w.reps || 0);
            userStats[w.username].totalWorkouts += 1;
        });

        Object.values(userStats).forEach(u => {
            const st = calculateStreak(localData.workouts, u.username);
            u.streak = st.currentStreak;
            u.score = u.totalReps + (u.streak * 20);
        });

        ranking = Object.values(userStats).sort((a, b) => (b.score || b.totalReps) - (a.score || a.totalReps));
    }

    const myUsername = state.currentUser ? state.currentUser.username : "";
    const myIndex = ranking.findIndex(u => u.username && u.username.toLowerCase() === myUsername.toLowerCase());
    
    const myRankBadge = document.getElementById("my-rank-badge");
    const myRankSub = document.getElementById("my-rank-sub");
    const myRankReps = document.getElementById("my-rank-reps");

    if (myIndex !== -1) {
        const myItem = ranking[myIndex];
        const rankNo = myIndex + 1;
        let badgeText = `#${rankNo}`;
        if (rankNo === 1) badgeText = "🥇 #1";
        else if (rankNo === 2) badgeText = "🥈 #2";
        else if (rankNo === 3) badgeText = "🥉 #3";

        const myStreak = myItem.streak !== undefined ? myItem.streak : calculateStreak(localData.workouts, myUsername).currentStreak;

        if (myRankBadge) myRankBadge.innerText = badgeText;
        if (myRankSub) myRankSub.innerText = `${myItem.totalWorkouts || 0} buổi • 🔥 ${myStreak} ngày streak`;
        if (myRankReps) myRankReps.innerText = myItem.totalReps || 0;
    } else {
        if (myRankBadge) myRankBadge.innerText = "#--";
        if (myRankSub) myRankSub.innerText = "Hãy bắt đầu buổi tập đầu tiên!";
        if (myRankReps) myRankReps.innerText = "0";
    }

    const top10 = ranking.slice(0, 10);
    if (top10.length === 0) {
        top10Container.innerHTML = '<div class="loading-spinner">Chưa có dữ liệu bài tập nào!</div>';
        return;
    }

    top10Container.innerHTML = "";
    top10.forEach((u, idx) => {
        const isCurrent = myUsername && u.username.toLowerCase() === myUsername.toLowerCase();
        let badge = `${idx + 1}`;
        let badgeClass = "";
        if (idx === 0) { badge = "🥇"; badgeClass = "rank-1"; }
        else if (idx === 1) { badge = "🥈"; badgeClass = "rank-2"; }
        else if (idx === 2) { badge = "🥉"; badgeClass = "rank-3"; }

        const userStreak = u.streak !== undefined ? u.streak : calculateStreak(localData.workouts, u.username).currentStreak;

        const item = document.createElement("div");
        item.className = `rank-item ${isCurrent ? "is-current-user" : ""}`;
        item.innerHTML = `
            <div class="rank-badge ${badgeClass}">${badge}</div>
            <div class="rank-user-info">
                <div class="rank-name">${u.username} ${isCurrent ? "(Bạn)" : ""}</div>
                <div class="rank-sub">${u.totalWorkouts || 0} buổi • 🔥 ${userStreak}d streak</div>
            </div>
            <div class="rank-score">
                <div class="rank-reps">${u.totalReps || 0}</div>
                <div class="rank-sub">reps</div>
            </div>
        `;
        top10Container.appendChild(item);
    });
}

function isDateInPeriod(dateStr, period) {
    if (period === "all" || !period || !dateStr) return true;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return true;

    const now = new Date();
    if (period === "week") {
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return date >= startOfWeek;
    } else if (period === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return date >= startOfMonth;
    } else if (period === "year") {
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return date >= startOfYear;
    }
    return true;
}

async function loadLeaderboard() {
    const container = document.getElementById("leaderboard-container");
    container.innerHTML = '<div class="loading-spinner">Đang tải bảng xếp hạng... 🔄</div>';

    const period = state.leaderboardPeriod || "all";
    let ranking = [];
    const res = await callApi({ action: "getLeaderboard", period });

    const localData = getLocalData();

    if (res.success && res.leaderboard) {
        ranking = res.leaderboard;
    } else {
        const userStats = {};
        localData.workouts.forEach(w => {
            if (isDateInPeriod(w.date, period)) {
                if (!userStats[w.username]) {
                    userStats[w.username] = { username: w.username, totalReps: 0, totalWorkouts: 0 };
                }
                userStats[w.username].totalReps += (w.reps || 0);
                userStats[w.username].totalWorkouts += 1;
            }
        });

        Object.values(userStats).forEach(u => {
            const st = calculateStreak(localData.workouts, u.username);
            u.streak = st.currentStreak;
            u.score = u.totalReps + (u.streak * 20);
        });

        ranking = Object.values(userStats).sort((a, b) => (b.score || b.totalReps) - (a.score || a.totalReps));
    }

    if (ranking.length === 0) {
        container.innerHTML = '<div class="loading-spinner">Chưa có dữ liệu bài tập nào!</div>';
        return;
    }

    container.innerHTML = "";
    ranking.forEach((u, idx) => {
        const isCurrent = state.currentUser && u.username.toLowerCase() === state.currentUser.username.toLowerCase();
        let badge = `${idx + 1}`;
        let badgeClass = "";
        if (idx === 0) { badge = "🥇"; badgeClass = "rank-1"; }
        else if (idx === 1) { badge = "🥈"; badgeClass = "rank-2"; }
        else if (idx === 2) { badge = "🥉"; badgeClass = "rank-3"; }

        const userStreak = u.streak !== undefined ? u.streak : calculateStreak(localData.workouts, u.username).currentStreak;

        const item = document.createElement("div");
        item.className = `rank-item ${isCurrent ? "is-current-user" : ""}`;
        item.innerHTML = `
            <div class="rank-badge ${badgeClass}">${badge}</div>
            <div class="rank-user-info">
                <div class="rank-name">${u.username} ${isCurrent ? "(Bạn)" : ""}</div>
                <div class="rank-sub">${u.totalWorkouts || 0} buổi • 🔥 ${userStreak}d streak</div>
            </div>
            <div class="rank-score">
                <div class="rank-reps">${u.totalReps || 0}</div>
                <div class="rank-sub">reps</div>
            </div>
            ${!isCurrent ? `<button class="btn-compare-action" data-username="${u.username}">⚔️ So sánh</button>` : ""}
        `;
        container.appendChild(item);
    });

    document.querySelectorAll(".btn-compare-action").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const targetUser = btn.getAttribute("data-username");
            openCompareModal(targetUser);
        });
    });
}

function closeCompareModal() {
    document.getElementById("compare-modal").style.display = "none";
}

function openCompareModal(otherUsername) {
    const myUsername = state.currentUser ? state.currentUser.username : "Bạn";
    document.getElementById("compare-user-me").innerText = myUsername;
    document.getElementById("compare-user-other").innerText = otherUsername;

    const localData = getLocalData();
    const myWorkouts = localData.workouts.filter(w => w.username && w.username.toLowerCase() === myUsername.toLowerCase());
    const otherWorkouts = localData.workouts.filter(w => w.username && w.username.toLowerCase() === otherUsername.toLowerCase());

    const dailyMe = {};
    const dailyOther = {};

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dailyMe[dateStr] = 0;
        dailyOther[dateStr] = 0;
    }

    let sumMe = 0;
    let sumOther = 0;

    myWorkouts.forEach(w => {
        const dateStr = (w.date || "").split("T")[0];
        if (dailyMe[dateStr] !== undefined) dailyMe[dateStr] += (w.reps || 0);
        sumMe += (w.reps || 0);
    });

    otherWorkouts.forEach(w => {
        const dateStr = (w.date || "").split("T")[0];
        if (dailyOther[dateStr] !== undefined) dailyOther[dateStr] += (w.reps || 0);
        sumOther += (w.reps || 0);
    });

    document.getElementById("compare-reps-me").innerText = sumMe;
    document.getElementById("compare-reps-other").innerText = sumOther;

    const sortedDates = Object.keys(dailyMe).sort();
    const formattedLabels = sortedDates.map(d => {
        const dt = new Date(d);
        return dt.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });
    });

    const dataMe = sortedDates.map(d => dailyMe[d]);
    const dataOther = sortedDates.map(d => dailyOther[d]);

    const ctx = document.getElementById("compareChart").getContext("2d");
    if (state.compareChartInstance) state.compareChartInstance.destroy();

    state.compareChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: formattedLabels,
            datasets: [
                {
                    label: myUsername,
                    data: dataMe,
                    backgroundColor: "rgba(6, 182, 212, 0.8)",
                    borderColor: "rgba(6, 182, 212, 1)",
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: otherUsername,
                    data: dataOther,
                    backgroundColor: "rgba(139, 92, 246, 0.8)",
                    borderColor: "rgba(139, 92, 246, 1)",
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: "#94a3b8", font: { size: 10 } },
                    grid: { color: "rgba(255, 255, 255, 0.05)" }
                },
                x: {
                    ticks: { color: "#94a3b8", font: { size: 10 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    labels: { color: "#f8fafc", font: { size: 11 } }
                }
            }
        }
    });

    document.getElementById("compare-modal").style.display = "flex";
}

function calculateNextReps() {
    let next = state.currentReps + (state.step * state.direction);
    if (state.direction === 1 && next > state.maxReps) {
        state.direction = -1;
        next = state.currentReps - state.step;
    }
    return next;
}

function startWorkoutSession() {
    const planRes = computeWorkoutPlan();
    state.workoutPlan = planRes.plan;
    state.workoutMode = planRes.mode;
    state.currentSetIndex = 0;

    state.currentVariation = document.getElementById("setup-variation") ? document.getElementById("setup-variation").value : "standard";
    state.currentReps = state.workoutPlan[0];
    state.setCount = 1;
    state.totalReps = 0;
    state.totalTimeSeconds = 0;
    state.isPaused = false;

    if (audioCtx.state === "suspended") audioCtx.resume();
    requestWakeLock();

    startWorkoutState();
}

function startWorkoutState() {
    showScreen("workout");
    document.getElementById("set-number").innerText = state.setCount;
    document.getElementById("target-reps").innerText = state.currentReps;
    
    const vInfo = VARIATIONS_INFO[state.currentVariation] || VARIATIONS_INFO.standard;
    const varBadgeEl = document.getElementById("workout-var-name");
    if (varBadgeEl) varBadgeEl.innerText = `${vInfo.icon} ${vInfo.name}`;

    state.isPaused = false;
    state.workoutSecondsElapsed = 0;
    updateWorkoutPauseUI();

    speakText(`Set ${state.setCount}. ${state.currentReps} reps ${vInfo.name}. Bắt đầu!`);

    const stopwatch = document.getElementById("stopwatch");
    stopwatch.innerText = formatTime(state.workoutSecondsElapsed);

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (!state.isPaused) {
            state.workoutSecondsElapsed++;
            state.totalTimeSeconds++;
            stopwatch.innerText = formatTime(state.workoutSecondsElapsed);
        }
    }, 1000);
}

function togglePauseWorkout() {
    state.isPaused = !state.isPaused;
    updateWorkoutPauseUI();
}

function updateWorkoutPauseUI() {
    const badge = document.getElementById("workout-pause-badge");
    const btn = document.getElementById("btn-pause-workout");
    if (state.isPaused) {
        badge.style.display = "block";
        btn.innerText = "Tiếp Tục ▶️";
        btn.classList.add("resumed");
    } else {
        badge.style.display = "none";
        btn.innerText = "Tạm Dừng ⏸️";
        btn.classList.remove("resumed");
    }
}

function finishWorkoutSet() {
    clearInterval(state.timerInterval);
    state.totalReps += state.currentReps;

    state.currentSetIndex++;
    if (state.currentSetIndex >= state.workoutPlan.length) {
        showFinishedState();
    } else {
        state.setCount = state.currentSetIndex + 1;
        const nextReps = state.workoutPlan[state.currentSetIndex];
        startRestState(nextReps, state.workoutSecondsElapsed);
    }
}

function startRestState(nextReps, duration) {
    showScreen("rest");
    screens.rest.classList.remove("warning");
    document.getElementById("next-reps").innerText = nextReps;

    state.isPaused = false;
    state.restSecondsLeft = duration <= 0 ? 1 : duration;
    updateRestPauseUI();

    speakText(`Nghỉ ngơi ${state.restSecondsLeft} giây.`);

    const countdown = document.getElementById("countdown");
    countdown.innerText = formatTime(state.restSecondsLeft);

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (!state.isPaused) {
            state.restSecondsLeft--;
            countdown.innerText = formatTime(state.restSecondsLeft);

            if (state.restSecondsLeft <= 3 && state.restSecondsLeft > 0) {
                speakText(state.restSecondsLeft.toString());
            }

            if (state.restSecondsLeft <= 5 && state.restSecondsLeft > 0) {
                screens.rest.classList.add("warning");
                const stepIndex = 6 - state.restSecondsLeft; // 1 for 5s, 5 for 1s
                const freq = 600 + (stepIndex * 80); // 680Hz to 1000Hz
                const vol = 0.3 + (stepIndex * 0.12); // 0.42 to 0.90
                playBeep(freq, 0.12, vol);
            }

            if (state.restSecondsLeft <= 0) {
                clearInterval(state.timerInterval);
                playBeep(1200, 0.4, 1.0);
                screens.rest.classList.remove("warning");

                state.currentReps = nextReps;
                startWorkoutState();
            }
        }
    }, 1000);
}

function togglePauseRest() {
    state.isPaused = !state.isPaused;
    updateRestPauseUI();
}

function updateRestPauseUI() {
    const badge = document.getElementById("rest-pause-badge");
    const btn = document.getElementById("btn-pause-rest");
    if (state.isPaused) {
        badge.style.display = "block";
        btn.innerText = "Tiếp Tục ▶️";
        btn.classList.add("resumed");
    } else {
        badge.style.display = "none";
        btn.innerText = "Tạm Dừng ⏸️";
        btn.classList.remove("resumed");
    }
}

function skipRest() {
    clearInterval(state.timerInterval);
    screens.rest.classList.remove("warning");

    state.setCount = state.currentSetIndex + 1;
    state.currentReps = state.workoutPlan[state.currentSetIndex];
    startWorkoutState();
}

function cancelWorkoutSession() {
    if (confirm("Bạn có chắc chắn muốn hủy buổi tập này không? Dữ liệu buổi tập hiện tại sẽ không được lưu.")) {
        clearInterval(state.timerInterval);
        releaseWakeLock();
        screens.rest.classList.remove("warning");
        state.isPaused = false;
        openMainScreen();
    }
}

function getTempoRating(totalTimeSeconds, totalReps) {
    const secPerRep = totalReps > 0 ? (totalTimeSeconds / totalReps) : 0;
    const repsPerSec = totalTimeSeconds > 0 ? (totalReps / totalTimeSeconds) : 0;

    if (secPerRep < 1.3) {
        return {
            badge: "🚀 FLY",
            badgeClass: "badge-fly",
            title: "Tốc Độ Quá Nhanh (Fly)",
            secPerRep,
            repsPerSec,
            advice: "⚠️ Bạn đang chống đẩy quá nhanh (< 1.3s/rep). Dễ ăn bớt biên độ và dùng đà nảy cùi chỏ! Lời khuyên: Hãy hạ người xuống chậm hơn (1.5s - 2s) để ép căng cơ ngực và bảo vệ khớp vai & cùi chỏ.",
            speakAdvice: "Lưu ý: Tốc độ tập của bạn rất nhanh. Hãy chú ý hạ người xuống chậm hơn để giữ đúng form và ép ngực tối đa."
        };
    } else if (secPerRep < 1.7) {
        return {
            badge: "⚡ HYPER",
            badgeClass: "badge-hyper",
            title: "Tốc Độ Nhanh (Hyper)",
            secPerRep,
            repsPerSec,
            advice: "⚡ Tốc độ tập khá dồn dập (1.3s - 1.7s/rep). Nếu muốn tăng khối lượng và làm dày cơ ngực, hãy nhịp nhàng hạ người chậm rãi hơn một chút nhé!",
            speakAdvice: "Nhịp tập khá dồn dập. Hãy chú ý kiểm soát pha hạ người xuống chậm rãi hơn một chút."
        };
    } else if (secPerRep <= 2.8) {
        return {
            badge: "💪 STANDARD",
            badgeClass: "badge-standard",
            title: "Nhịp Độ Chuẩn Vàng (Optimal)",
            secPerRep,
            repsPerSec,
            advice: "🌟 Nhịp độ tuyệt vời (1.7s - 2.8s/rep)! Bạn đang kiểm soát pha hạ người và đẩy lên đúng kỹ thuật chuẩn Fitness. Cơ ngực & vai được kích hoạt hoàn hảo!",
            speakAdvice: "Nhịp độ tập luyện chuẩn mực! Cơ ngực của bạn được gồng siết và kích hoạt hoàn hảo."
        };
    } else {
        return {
            badge: "🔥 HARD-CORE",
            badgeClass: "badge-hardcore",
            title: "Kiểm Soát Cơ Bắp Đỉnh Cao",
            secPerRep,
            repsPerSec,
            advice: "🧱 Đỉnh cao kiểm soát cơ bắp (> 2.8s/rep)! Thời gian cơ chịu áp lực (Time Under Tension) cực lớn, giúp siết cơ nét căng và tăng sức mạnh tối đa.",
            speakAdvice: "Phong cách Hard-Core đỉnh cao! Bạn có khả năng gồng siết cơ bắp cực kỳ trâu bò."
        };
    }
}

function showFinishedState() {
    releaseWakeLock();
    showScreen("finished");

    state.sessionCalories = calculateCalories(state.totalReps, state.weight);

    document.getElementById("total-reps").innerText = state.totalReps;
    document.getElementById("total-time").innerText = formatTime(state.totalTimeSeconds);
    document.getElementById("total-calories").innerText = state.sessionCalories;

    const localData = getLocalData();
    const tempWorkouts = [...localData.workouts, { username: state.currentUser ? state.currentUser.username : "User", date: new Date().toISOString() }];
    const streakData = calculateStreak(tempWorkouts, state.currentUser ? state.currentUser.username : "User");
    document.getElementById("finish-streak").innerText = streakData.currentStreak;

    // EVALUATE TEMPO & FORM
    const tempoInfo = getTempoRating(state.totalTimeSeconds, state.totalReps);
    const badgeEl = document.getElementById("finish-tempo-badge");
    const speedEl = document.getElementById("finish-tempo-speed");
    const adviceEl = document.getElementById("finish-tempo-advice");

    if (badgeEl) {
        badgeEl.innerText = tempoInfo.badge;
        badgeEl.className = `tempo-badge ${tempoInfo.badgeClass}`;
    }
    if (speedEl) {
        speedEl.innerText = `${tempoInfo.secPerRep.toFixed(1)}s / rep (${tempoInfo.repsPerSec.toFixed(1)} rep/s)`;
    }
    if (adviceEl) {
        adviceEl.innerText = tempoInfo.advice;
    }

    speakText(`Xuất sắc! Bạn đã hoàn thành ${state.totalReps} rep push up và đốt cháy ${Math.round(state.sessionCalories)} calo! ${tempoInfo.speakAdvice}`);
}

async function saveAndReturnToLeaderboard() {
    const tempoInfo = getTempoRating(state.totalTimeSeconds, state.totalReps);
    const workoutRecord = {
        username: state.currentUser.username,
        reps: state.totalReps,
        timeSeconds: state.totalTimeSeconds,
        setsCount: state.setCount,
        calories: state.sessionCalories,
        tempoBadge: tempoInfo.badge,
        secPerRep: tempoInfo.secPerRep,
        variation: state.currentVariation || "standard",
        date: new Date().toISOString()
    };

    const localData = getLocalData();
    localData.workouts.push(workoutRecord);
    saveLocalData(localData);

    callApi({
        action: "saveWorkout",
        ...workoutRecord
    });

    openMainScreen();
    document.querySelector('.nav-item[data-tab="tab-leaderboard"]').click();
}
