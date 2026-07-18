// --- Audio Context Setup for Beep Sound ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(frequency = 440, duration = 0.1) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

// --- Wake Lock API ---
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');
        }
    } catch (err) {
        console.log(`${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
                console.log('Wake Lock released');
            });
    }
}

// Re-request wake lock if tab becomes visible
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});


// --- App State ---
const state = {
    currentUser: null,
    minReps: 12,
    step: 3,
    maxReps: 25,
    currentReps: 12,
    direction: 1, // 1 for UP, -1 for DOWN
    setCount: 1,
    totalReps: 0,
    totalTimeSeconds: 0,
    lastWorkoutDuration: 0,
    timerInterval: null,
    chartInstance: null
};

// --- DOM Elements ---
const screens = {
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    setup: document.getElementById('setup-screen'),
    workout: document.getElementById('workout-screen'),
    rest: document.getElementById('rest-screen'),
    finished: document.getElementById('finished-screen')
};

// Buttons
document.getElementById('btn-login').addEventListener('click', handleLogin);
document.getElementById('btn-logout').addEventListener('click', handleLogout);
document.getElementById('btn-new-workout').addEventListener('click', () => showScreen('setup'));
document.getElementById('btn-back-dash').addEventListener('click', showDashboard);
document.getElementById('btn-start').addEventListener('click', startWorkoutSession);
document.getElementById('btn-done').addEventListener('click', finishWorkoutSet);
document.getElementById('btn-skip-rest').addEventListener('click', skipRest);
document.getElementById('btn-save-finish').addEventListener('click', saveAndReturnToDashboard);

// Inputs
const inputUsername = document.getElementById('username-input');
const inputMin = document.getElementById('min-reps');
const inputStep = document.getElementById('step');
const inputMax = document.getElementById('max-reps');

// --- Helpers ---
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// --- Data Persistence ---
function loadData() {
    const data = localStorage.getItem('pushup_users');
    return data ? JSON.parse(data) : {};
}

function saveData(data) {
    localStorage.setItem('pushup_users', JSON.stringify(data));
}

// --- Login & Dashboard Logic ---

// Check if user already logged in previously
const savedUser = localStorage.getItem('pushup_last_user');
if (savedUser) {
    inputUsername.value = savedUser;
    handleLogin();
}

function handleLogin() {
    const username = inputUsername.value.trim();
    if (!username) return alert("Please enter your name");

    state.currentUser = username;
    localStorage.setItem('pushup_last_user', username);
    
    // Create user if not exists
    const data = loadData();
    if (!data[username]) {
        data[username] = { workouts: [] };
        saveData(data);
    }
    
    showDashboard();
}

function handleLogout() {
    state.currentUser = null;
    localStorage.removeItem('pushup_last_user');
    inputUsername.value = '';
    showScreen('login');
}

function showDashboard() {
    showScreen('dashboard');
    document.getElementById('display-username').innerText = state.currentUser;
    
    const data = loadData();
    const userWorkouts = data[state.currentUser].workouts;
    
    let totalReps = 0;
    userWorkouts.forEach(w => totalReps += w.reps);
    
    document.getElementById('dash-total-reps').innerText = totalReps;
    document.getElementById('dash-total-workouts').innerText = userWorkouts.length;
    
    renderChart(userWorkouts);
}

function renderChart(workouts) {
    const ctx = document.getElementById('consistencyChart').getContext('2d');
    
    // Aggregate by date
    const dailyData = {};
    // Get last 7 days keys
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dailyData[dateStr] = 0;
    }
    
    workouts.forEach(w => {
        const dateStr = w.date.split('T')[0];
        if (dailyData[dateStr] !== undefined) {
            dailyData[dateStr] += w.reps;
        } else {
            // Include older dates if they exist (or just keep them in dictionary)
            dailyData[dateStr] = (dailyData[dateStr] || 0) + w.reps;
        }
    });

    // Sort dates
    const sortedDates = Object.keys(dailyData).sort();
    
    // Create simple labels like "Mon", "Tue" or just MM/DD
    const labels = sortedDates.map(d => {
        const dt = new Date(d);
        return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    const values = sortedDates.map(d => dailyData[d]);

    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    state.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Push-ups',
                data: values,
                backgroundColor: 'rgba(6, 182, 212, 0.7)', // var(--primary)
                borderColor: 'rgba(6, 182, 212, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// --- Workout Logic ---

function calculateNextReps() {
    let next = state.currentReps + (state.step * state.direction);
    if (state.direction === 1 && next > state.maxReps) {
        state.direction = -1;
        next = state.currentReps - state.step;
    }
    return next;
}

function startWorkoutSession() {
    state.minReps = parseInt(inputMin.value, 10);
    state.step = parseInt(inputStep.value, 10);
    state.maxReps = parseInt(inputMax.value, 10);
    
    state.currentReps = state.minReps;
    state.direction = 1;
    state.setCount = 1;
    state.totalReps = 0;
    state.totalTimeSeconds = 0;

    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    requestWakeLock(); // Keep screen awake
    
    startWorkoutState();
}

function startWorkoutState() {
    showScreen('workout');
    document.getElementById('set-number').innerText = state.setCount;
    document.getElementById('target-reps').innerText = state.currentReps;
    
    let secondsElapsed = 0;
    const stopwatchDisplay = document.getElementById('stopwatch');
    stopwatchDisplay.innerText = formatTime(secondsElapsed);
    
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        secondsElapsed++;
        state.totalTimeSeconds++;
        stopwatchDisplay.innerText = formatTime(secondsElapsed);
    }, 1000);
}

function finishWorkoutSet() {
    clearInterval(state.timerInterval);
    
    const timeParts = document.getElementById('stopwatch').innerText.split(':');
    const elapsed = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
    
    state.lastWorkoutDuration = elapsed;
    state.totalReps += state.currentReps;
    
    const nextReps = calculateNextReps();
    
    if (state.direction === -1 && nextReps < state.minReps) {
        showFinishedState();
    } else {
        startRestState(nextReps);
    }
}

function startRestState(nextReps) {
    showScreen('rest');
    screens.rest.classList.remove('warning');
    document.getElementById('next-reps').innerText = nextReps;
    
    let timeLeft = state.lastWorkoutDuration;
    if (timeLeft <= 0) timeLeft = 1; 
    
    const countdownDisplay = document.getElementById('countdown');
    countdownDisplay.innerText = formatTime(timeLeft);
    
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        timeLeft--;
        countdownDisplay.innerText = formatTime(timeLeft);
        
        if (timeLeft <= 5 && timeLeft > 0) {
            screens.rest.classList.add('warning');
            playBeep(880, 0.1); 
        }
        
        if (timeLeft <= 0) {
            clearInterval(state.timerInterval);
            playBeep(1200, 0.5); 
            screens.rest.classList.remove('warning');
            
            state.currentReps = nextReps;
            state.setCount++;
            startWorkoutState();
        }
    }, 1000);
}

function skipRest() {
    clearInterval(state.timerInterval);
    screens.rest.classList.remove('warning');
    
    const nextReps = calculateNextReps();
    state.currentReps = nextReps;
    state.setCount++;
    startWorkoutState();
}

function showFinishedState() {
    releaseWakeLock(); // Release screen lock
    showScreen('finished');
    document.getElementById('total-reps').innerText = state.totalReps;
    document.getElementById('total-time').innerText = formatTime(state.totalTimeSeconds);
}

function saveAndReturnToDashboard() {
    const data = loadData();
    const userWorkouts = data[state.currentUser].workouts;
    
    // Save workout record
    if (state.totalReps > 0) {
        userWorkouts.push({
            date: new Date().toISOString(),
            reps: state.totalReps,
            timeSeconds: state.totalTimeSeconds
        });
        saveData(data);
    }
    
    showDashboard();
}
