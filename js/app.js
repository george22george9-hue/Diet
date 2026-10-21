/**
 * تطبيق تتبّع العادات الصحية والرجيم اليومي
 * Daily Healthy Habits & Diet Tracker
 * Vanilla JavaScript (ES6+), LocalStorage Persistence, Offline-First
 */

(function () {
    'use strict';

    // ==========================================
    // 1. CONSTANTS & CONFIGURATION
    // ==========================================
    const STORAGE_KEY = 'diet_habits_tracker_v1';
    
    // The 9 Required Daily Habits with metadata & icons
    const DAILY_HABITS = [
        {
            id: 0,
            title: 'كوباية ماية الصبح',
            tag: 'ترطيب ونشاط مبكر',
            icon: '💧',
            category: 'water'
        },
        {
            id: 1,
            title: 'تمارين الصبح',
            tag: 'نشاط وحرق سعرات',
            icon: '🏃‍♂️',
            category: 'fitness'
        },
        {
            id: 2,
            title: 'كوباية ماية قبل الفطار',
            tag: 'تحفيز الهضم والامتصاص',
            icon: '🥛',
            category: 'water'
        },
        {
            id: 3,
            title: 'فطار صحي',
            tag: 'بروتين وألياف متوازنة',
            icon: '🥗',
            category: 'nutrition'
        },
        {
            id: 4,
            title: 'كوباية ماية قبل الغدا',
            tag: 'تعزيز الشبع والترطيب',
            icon: '💧',
            category: 'water'
        },
        {
            id: 5,
            title: 'غدا صحي',
            tag: 'سعرات محسوبة ونظيف',
            icon: '🍲',
            category: 'nutrition'
        },
        {
            id: 6,
            title: 'عشا خفيف',
            tag: 'راحة للمعدة ونوم هادئ',
            icon: '🥣',
            category: 'nutrition'
        },
        {
            id: 7,
            title: 'اليوم بدون معجنات أو زيت',
            tag: 'تحدي النقاء والدهون الصحية',
            icon: '🚫🥐',
            category: 'challenge'
        },
        {
            id: 8,
            title: 'اليوم قليل سكر',
            tag: 'ضبط الأنسولين وصحة الجسم',
            icon: '🍯❌',
            category: 'challenge'
        }
    ];

    const TOTAL_TASKS = DAILY_HABITS.length; // 9
    const TASK_WEIGHT = 100 / TOTAL_TASKS; // ~11.1111%
    const CIRCLE_RADIUS = 56;
    const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~351.858

    // ==========================================
    // 2. STATE MANAGEMENT
    // ==========================================
    const state = {
        currentViewingDate: getTodayString(), // YYYY-MM-DD
        currentViewingMonth: getTodayMonthString(), // YYYY-MM
        activeTab: 'view-today',
        soundEnabled: true,
        data: {
            history: {}, // { 'YYYY-MM-DD': { completed: [0, 2], percentage: 22.2, updatedAt: ... } }
            settings: {
                theme: 'light',
                sound: true
            }
        }
    };

    // ==========================================
    // 3. UTILITY FUNCTIONS (DATES, STORAGE)
    // ==========================================
    function getTodayString() {
        const now = new Date();
        return formatDateToISO(now);
    }

    function getTodayMonthString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    function formatDateToISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function parseISODate(isoStr) {
        const [year, month, day] = isoStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    function formatArabicDate(isoStr) {
        const date = parseISODate(isoStr);
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        try {
            return date.toLocaleDateString('ar-EG', options);
        } catch (e) {
            return isoStr;
        }
    }

    function formatArabicMonth(yearMonthStr) {
        const [year, month] = yearMonthStr.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        try {
            return date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        } catch (e) {
            return yearMonthStr;
        }
    }

    // Storage persistence
    function loadDataFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    state.data.history = parsed.history || {};
                    state.data.settings = Object.assign({ theme: 'light', sound: true }, parsed.settings);
                }
            }
        } catch (err) {
            console.error('Failed to load storage data:', err);
        }
    }

    function saveDataToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
            triggerSaveIndicator();
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
        }
    }

    function triggerSaveIndicator() {
        const indicator = document.getElementById('save-indicator');
        if (!indicator) return;
        indicator.style.opacity = '1';
        clearTimeout(indicator._timer);
        indicator._timer = setTimeout(() => {
            indicator.style.opacity = '0.7';
        }, 1500);
    }

    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        const msgEl = document.getElementById('toast-message');
        if (!toast || !msgEl) return;
        msgEl.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // ==========================================
    // 4. SOUND EFFECTS (Web Audio API Synthesizer)
    // ==========================================
    let audioCtx = null;

    function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
        if (!state.soundEnabled) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            if (!audioCtx) audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Audio context not allowed or supported
        }
    }

    function playCheckSound() {
        playTone(587.33, 'triangle', 0.12, 0.08); // D5
        setTimeout(() => playTone(880.00, 'sine', 0.18, 0.09), 60); // A5
    }

    function playUncheckSound() {
        playTone(440.00, 'sine', 0.12, 0.06);
    }

    function playCelebrationSound() {
        if (!state.soundEnabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => playTone(freq, 'triangle', 0.25, 0.12), idx * 110);
        });
    }

    // ==========================================
    // 5. CONFETTI CELEBRATION EFFECT (Canvas)
    // ==========================================
    let confettiAnimationId = null;
    function fireConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const particles = [];
        const colors = ['#10b981', '#34d399', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

        for (let i = 0; i < 90; i++) {
            particles.push({
                x: width / 2 + (Math.random() - 0.5) * 200,
                y: height * 0.45,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 1.2) * 16,
                size: Math.random() * 8 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
                decay: Math.random() * 0.015 + 0.01
            });
        }

        if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

        function update() {
            ctx.clearRect(0, 0, width, height);
            let alive = 0;

            for (const p of particles) {
                if (p.opacity > 0) {
                    alive++;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.4; // gravity
                    p.vx *= 0.98; // drag
                    p.rotation += p.rotSpeed;
                    p.opacity -= p.decay;

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.globalAlpha = Math.max(0, p.opacity);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.3);
                    ctx.restore();
                }
            }

            if (alive > 0) {
                confettiAnimationId = requestAnimationFrame(update);
            } else {
                ctx.clearRect(0, 0, width, height);
            }
        }

        confettiAnimationId = requestAnimationFrame(update);
    }

    // ==========================================
    // 6. TODAY'S HABITS & PROGRESS CALCULATION
    // ==========================================
    function getDayRecord(dateStr) {
        if (!state.data.history[dateStr]) {
            return {
                completed: [],
                percentage: 0
            };
        }
        return state.data.history[dateStr];
    }

    function calculateDayPercentage(completedTasksCount) {
        if (completedTasksCount <= 0) return 0;
        if (completedTasksCount >= TOTAL_TASKS) return 100;
        // Each task represents ~11.1%
        const raw = (completedTasksCount / TOTAL_TASKS) * 100;
        return Math.round(raw * 10) / 10; // Round to 1 decimal place (e.g. 11.1, 22.2)
    }

    function toggleHabit(habitId) {
        const dateStr = state.currentViewingDate;
        let dayRecord = state.data.history[dateStr];

        if (!dayRecord) {
            dayRecord = {
                completed: [],
                percentage: 0
            };
            state.data.history[dateStr] = dayRecord;
        }

        const taskIndex = dayRecord.completed.indexOf(habitId);
        const wasCompleted = taskIndex !== -1;

        if (wasCompleted) {
            dayRecord.completed.splice(taskIndex, 1);
            playUncheckSound();
        } else {
            dayRecord.completed.push(habitId);
            playCheckSound();
        }

        const prevPercentage = dayRecord.percentage || 0;
        dayRecord.percentage = calculateDayPercentage(dayRecord.completed.length);
        dayRecord.updatedAt = new Date().toISOString();

        saveDataToStorage();
        renderTodayView();

        // Trigger 100% celebration if just completed all
        if (dayRecord.percentage === 100 && prevPercentage < 100) {
            playCelebrationSound();
            fireConfetti();
            showToast('🎉 مبروك! أنجزت كل عادات اليوم 100%!');
        }

        // Also refresh month stats in background
        renderMonthSummary();
    }

    function selectAllTasksForCurrentDay() {
        const dateStr = state.currentViewingDate;
        const allIds = DAILY_HABITS.map(h => h.id);
        
        state.data.history[dateStr] = {
            completed: allIds,
            percentage: 100,
            updatedAt: new Date().toISOString()
        };

        saveDataToStorage();
        renderTodayView();
        renderMonthSummary();
        playCelebrationSound();
        fireConfetti();
        showToast('تم تحديد جميع مهام اليوم بنجاح ✨');
    }

    function resetCurrentDayTasks() {
        const dateStr = state.currentViewingDate;
        if (!state.data.history[dateStr] || state.data.history[dateStr].completed.length === 0) {
            showToast('المهام غير مكتملة بالفعل لهذا اليوم.');
            return;
        }

        if (confirm('هل أنت متأكد من إعادة تعيين مهام هذا اليوم؟')) {
            state.data.history[dateStr] = {
                completed: [],
                percentage: 0,
                updatedAt: new Date().toISOString()
            };
            saveDataToStorage();
            renderTodayView();
            renderMonthSummary();
            showToast('تمت إعادة تعيين اليوم.');
        }
    }

    // ==========================================
    // 7. RENDERING: TODAY'S VIEW
    // ==========================================
    function renderTodayView() {
        const dateStr = state.currentViewingDate;
        const todayStr = getTodayString();
        const isToday = (dateStr === todayStr);

        // 1. Date Header Info
        const dateTitleEl = document.getElementById('display-date-title');
        const dateSubEl = document.getElementById('display-date-sub');
        const todayShortcut = document.getElementById('today-shortcut-container');

        if (isToday) {
            dateTitleEl.textContent = 'مهام اليوم';
            todayShortcut.style.display = 'none';
        } else {
            const isPast = dateStr < todayStr;
            dateTitleEl.textContent = isPast ? 'سجل يوم سابق' : 'تاريخ قادم';
            todayShortcut.style.display = 'block';
        }
        dateSubEl.textContent = formatArabicDate(dateStr);

        // 2. Day Record & Percentages
        const dayRecord = getDayRecord(dateStr);
        const completedIds = dayRecord.completed || [];
        const completedCount = completedIds.length;
        const percentage = calculateDayPercentage(completedCount);

        // 3. Update Circular Progress & Linear Progress
        const percentValEl = document.getElementById('progress-percent-val');
        const circleBarEl = document.getElementById('progress-circle-bar');
        const linearFillEl = document.getElementById('linear-progress-fill');
        const tasksCountBadge = document.getElementById('tasks-count-badge');
        const streakBadge = document.getElementById('streak-badge');

        percentValEl.textContent = `${percentage}%`;
        tasksCountBadge.textContent = `${completedCount} / ${TOTAL_TASKS} مهام`;

        // Circumference calculation
        circleBarEl.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
        const offset = CIRCLE_CIRCUMFERENCE - (percentage / 100) * CIRCLE_CIRCUMFERENCE;
        circleBarEl.style.strokeDashoffset = offset;

        linearFillEl.style.width = `${percentage}%`;

        // Calculate Streak
        const streak = calculateCurrentStreak();
        streakBadge.textContent = `🔥 سلسلة ${streak} ${streak === 1 ? 'يوم' : 'أيام'}`;

        // 4. Motivational Text
        updateMotivationalMessage(completedCount, percentage);

        // 5. Render Habits Checkbox List
        const container = document.getElementById('tasks-container');
        container.innerHTML = '';

        DAILY_HABITS.forEach((habit) => {
            const isCompleted = completedIds.includes(habit.id);

            const itemEl = document.createElement('div');
            itemEl.className = `task-item ${isCompleted ? 'completed' : ''}`;
            itemEl.setAttribute('role', 'checkbox');
            itemEl.setAttribute('aria-checked', isCompleted ? 'true' : 'false');
            itemEl.tabIndex = 0;

            itemEl.innerHTML = `
                <div class="task-content-left">
                    <div class="task-icon-box" aria-hidden="true">${habit.icon}</div>
                    <div class="task-texts">
                        <span class="task-name">${habit.title}</span>
                        <span class="task-tag">${habit.tag}</span>
                    </div>
                </div>
                <div class="custom-checkbox" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            `;

            // Click handler
            itemEl.addEventListener('click', () => {
                toggleHabit(habit.id);
            });

            // Keyboard accessibility (Space/Enter)
            itemEl.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleHabit(habit.id);
                }
            });

            container.appendChild(itemEl);
        });
    }

    function updateMotivationalMessage(completedCount, percentage) {
        const titleEl = document.getElementById('motivation-title');
        const descEl = document.getElementById('motivation-desc');

        if (completedCount === 0) {
            titleEl.textContent = 'ابدأ يومك بنشاط! ✨';
            descEl.textContent = 'كل عادة تنجزها تمنحك ~11.1% وتقربك من هدفك وصحتك المثالية.';
        } else if (completedCount <= 3) {
            titleEl.textContent = 'بداية مشجعة جداً! 💧';
            descEl.textContent = `أنجزت ${completedCount} من 9 مهام (${percentage}%). واصل شرب الماء والحفاظ على وجباتك!`;
        } else if (completedCount <= 6) {
            titleEl.textContent = 'أنت في منتصف الطريق! 💪';
            descEl.textContent = `وصلت إلى ${percentage}%! خطوة بخطوة نحو يوم صحي ونظيف 100%.`;
        } else if (completedCount < 9) {
            titleEl.textContent = 'أوشكت على إنهاء اليوم بامتياز! 🔥';
            descEl.textContent = `باقي ${TOTAL_TASKS - completedCount} فقط لتصل إلى النسبة الكاملة اليوم. أنت رائع!`;
        } else {
            titleEl.textContent = 'بطل اليوم! إنجاز 100% كامل 🎉';
            descEl.textContent = 'التزامك اليوم مثالي ومصدر فخر. استمر على هذا المنوال دائماً!';
        }
    }

    function calculateCurrentStreak() {
        const history = state.data.history;
        let streak = 0;
        let checkDate = new Date();

        while (true) {
            const dateStr = formatDateToISO(checkDate);
            const record = history[dateStr];
            if (record && record.completed && record.completed.length >= 5) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (dateStr === getTodayString() && (!record || record.completed.length < 5)) {
                // If today is not completed yet, check yesterday to keep yesterday's streak
                checkDate.setDate(checkDate.getDate() - 1);
                const yesterdayStr = formatDateToISO(checkDate);
                const yestRecord = history[yesterdayStr];
                if (yestRecord && yestRecord.completed && yestRecord.completed.length >= 5) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return streak;
    }

    // ==========================================
    // 8. MONTHLY SUMMARY & ANALYTICS (VIEW 2)
    // ==========================================
    function renderMonthSummary() {
        const monthStr = state.currentViewingMonth; // YYYY-MM
        const [year, monthNum] = monthStr.split('-').map(Number);

        // Header Title
        const monthTitleEl = document.getElementById('current-month-display');
        monthTitleEl.textContent = formatArabicMonth(monthStr);

        // Find all history days in this month
        const history = state.data.history;
        const daysInMonthKeys = Object.keys(history).filter(d => d.startsWith(monthStr));

        let totalPercentageSum = 0;
        let loggedDaysCount = 0;
        let perfectDaysCount = 0;
        let totalTasksDone = 0;

        // Habit frequency counter
        const habitDoneCounts = Array(TOTAL_TASKS).fill(0);

        daysInMonthKeys.forEach(dateKey => {
            const rec = history[dateKey];
            if (rec && rec.completed && rec.completed.length > 0) {
                loggedDaysCount++;
                const pct = rec.percentage || calculateDayPercentage(rec.completed.length);
                totalPercentageSum += pct;
                totalTasksDone += rec.completed.length;

                if (pct === 100) perfectDaysCount++;

                rec.completed.forEach(taskId => {
                    if (habitDoneCounts[taskId] !== undefined) {
                        habitDoneCounts[taskId]++;
                    }
                });
            }
        });

        // 1. Calculate Average Percentage
        const averagePercent = loggedDaysCount > 0 
            ? Math.round((totalPercentageSum / loggedDaysCount) * 10) / 10 
            : 0;

        // Total calendar days in this month
        const daysInCurrentMonth = new Date(year, monthNum, 0).getDate();

        // 2. Update Stats DOM
        document.getElementById('month-avg-percent').textContent = `${averagePercent}%`;
        document.getElementById('month-logged-days').textContent = `${loggedDaysCount} يوم`;
        document.getElementById('month-days-ratio').textContent = `من إجمالي ${daysInCurrentMonth} يوم في الشهر`;
        document.getElementById('month-perfect-days').textContent = `${perfectDaysCount} أيام`;
        document.getElementById('month-total-tasks-done').textContent = `${totalTasksDone} مهمة`;

        // Monthly commitment rating text
        const ratingTextEl = document.getElementById('month-rating-text');
        if (loggedDaysCount === 0) {
            ratingTextEl.textContent = 'لا توجد أيام مسجلة في هذا الشهر حتى الآن';
        } else if (averagePercent >= 85) {
            ratingTextEl.textContent = '🌟 أداء أسطوري! التزام تام ونمط حياة صحي مبهر';
        } else if (averagePercent >= 70) {
            ratingTextEl.textContent = '🔥 ممتاز جداً! متوسط التزام قوي ومستمر';
        } else if (averagePercent >= 50) {
            ratingTextEl.textContent = '💪 بداية جيدة، واصل التقدم لرفع المتوسط';
        } else {
            ratingTextEl.textContent = '🌱 خطوة بخطوة، اجعل الأيام القادمة أفضل';
        }

        // 3. Render Calendar Grid
        renderMonthCalendarGrid(year, monthNum, history);

        // 4. Render Habits Breakdown
        renderHabitsBreakdown(habitDoneCounts, loggedDaysCount);
    }

    function renderMonthCalendarGrid(year, monthNum, history) {
        const grid = document.getElementById('month-calendar-grid');
        grid.innerHTML = '';

        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const todayStr = getTodayString();

        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const rec = history[dayStr];
            const hasData = rec && rec.completed && rec.completed.length > 0;
            const pct = hasData ? (rec.percentage || calculateDayPercentage(rec.completed.length)) : 0;
            const isToday = (dayStr === todayStr);

            const cell = document.createElement('div');
            cell.className = 'cal-day-cell';
            if (isToday) cell.classList.add('is-today');

            if (hasData) {
                if (pct === 100) cell.classList.add('level-perfect');
                else if (pct >= 70) cell.classList.add('level-high');
                else if (pct >= 40) cell.classList.add('level-medium');
                else cell.classList.add('level-low');
            }

            cell.innerHTML = `
                <span>${day}</span>
                <span class="cal-day-percent">${hasData ? `${pct}%` : '-'}</span>
            `;

            // Clicking any day opens it directly in today view!
            cell.title = `${dayStr} (${pct}%)`;
            cell.addEventListener('click', () => {
                state.currentViewingDate = dayStr;
                switchTab('view-today');
                renderTodayView();
            });

            grid.appendChild(cell);
        }
    }

    function renderHabitsBreakdown(habitDoneCounts, totalDaysCount) {
        const container = document.getElementById('habits-breakdown-list');
        container.innerHTML = '';

        DAILY_HABITS.forEach(habit => {
            const count = habitDoneCounts[habit.id] || 0;
            const percent = totalDaysCount > 0 ? Math.round((count / totalDaysCount) * 100) : 0;

            const row = document.createElement('div');
            row.className = 'habit-breakdown-row';
            row.innerHTML = `
                <div class="habit-row-header">
                    <span class="habit-row-name">
                        <span>${habit.icon}</span>
                        <span>${habit.title}</span>
                    </span>
                    <span class="habit-row-percent">${percent}% (${count}/${totalDaysCount})</span>
                </div>
                <div class="habit-row-track">
                    <div class="habit-row-fill" style="width: ${percent}%;"></div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    // ==========================================
    // 9. HISTORY VIEW (VIEW 3)
    // ==========================================
    function renderHistoryView() {
        const container = document.getElementById('history-list-container');
        const countBadge = document.getElementById('history-total-count');
        container.innerHTML = '';

        const history = state.data.history;
        const dateKeys = Object.keys(history).sort((a, b) => b.localeCompare(a)); // Newest first

        const validDays = dateKeys.filter(k => history[k] && history[k].completed && history[k].completed.length > 0);
        countBadge.textContent = `${validDays.length} يوم مسجل`;

        if (validDays.length === 0) {
            container.innerHTML = `
                <div class="history-empty-state">
                    <p style="font-size: 2rem; margin-bottom: 8px;">🌱</p>
                    <p>لم يتم تسجيل أي أيام بعد.</p>
                    <p style="font-size: 0.8rem; margin-top: 4px;">ابدأ بتحديد مهام اليوم وسيظهر سجلك هنا تلقائياً!</p>
                </div>
            `;
            return;
        }

        validDays.forEach(dateKey => {
            const rec = history[dateKey];
            const pct = rec.percentage || calculateDayPercentage(rec.completed.length);
            const isToday = (dateKey === getTodayString());

            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-item-left">
                    <span class="history-item-date">${formatArabicDate(dateKey)} ${isToday ? '⭐ (اليوم)' : ''}</span>
                    <span class="history-item-sub">${rec.completed.length} من 9 مهام منجزة</span>
                </div>
                <div class="history-item-right">
                    <span class="history-item-badge">${pct}%</span>
                </div>
            `;

            item.addEventListener('click', () => {
                state.currentViewingDate = dateKey;
                switchTab('view-today');
                renderTodayView();
            });

            container.appendChild(item);
        });
    }

    // ==========================================
    // 10. NAVIGATION, TABS & DATE SWITCHING
    // ==========================================
    function switchTab(targetId) {
        state.activeTab = targetId;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isSelected = btn.getAttribute('data-target') === targetId;
            btn.classList.toggle('active', isSelected);
            btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });

        // Update view sections
        document.querySelectorAll('.view-section').forEach(sec => {
            if (sec.id === targetId) {
                sec.style.display = 'block';
                sec.classList.add('active');
            } else {
                sec.style.display = 'none';
                sec.classList.remove('active');
            }
        });

        // Trigger view renders
        if (targetId === 'view-today') renderTodayView();
        else if (targetId === 'view-month') renderMonthSummary();
        else if (targetId === 'view-calendar') renderHistoryView();
    }

    function changeViewingDateByOffset(offsetDays) {
        const current = parseISODate(state.currentViewingDate);
        current.setDate(current.getDate() + offsetDays);
        state.currentViewingDate = formatDateToISO(current);
        renderTodayView();
    }

    function changeViewingMonthByOffset(offsetMonths) {
        const [year, month] = state.currentViewingMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + offsetMonths, 1);
        const nextYear = date.getFullYear();
        const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
        state.currentViewingMonth = `${nextYear}-${nextMonth}`;
        renderMonthSummary();
    }

    // ==========================================
    // 11. BACKUP, RESTORE & DATA EXPORT/IMPORT
    // ==========================================
    function exportDataAsJSON() {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.data, null, 2));
            const downloadAnchor = document.createElement('a');
            const dateStr = getTodayString();
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `diet_tracker_backup_${dateStr}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('تم تصدير ملف النسخة الاحتياطية بنجاح 📥');
        } catch (e) {
            alert('حدث خطأ أثناء تصدير البيانات');
        }
    }

    function handleImportJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported && imported.history) {
                    state.data.history = Object.assign(state.data.history, imported.history);
                    if (imported.settings) {
                        state.data.settings = Object.assign(state.data.settings, imported.settings);
                    }
                    saveDataToStorage();
                    renderTodayView();
                    renderMonthSummary();
                    closeModal();
                    showToast('تم استيراد البيانات بنجاح 📤');
                } else {
                    alert('الملف غير صالح أو لا يحتوي على بنية البيانات المطلوبة.');
                }
            } catch (err) {
                alert('فشل في قراءة ملف JSON. تأكد من سلامة الملف.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }

    function clearAllData() {
        if (confirm('تحذير: هل أنت متأكد تماماً من رغبتك في حذف كافة البيانات والسجلات؟ لا يمكن التراجع عن هذه الخطوة!')) {
            state.data.history = {};
            saveDataToStorage();
            renderTodayView();
            renderMonthSummary();
            closeModal();
            showToast('تم مسح جميع البيانات بنجاح.');
        }
    }

    function openModal() {
        const modal = document.getElementById('backup-modal');
        if (modal) modal.classList.add('active');
    }

    function closeModal() {
        const modal = document.getElementById('backup-modal');
        if (modal) modal.classList.remove('active');
    }

    // ==========================================
    // 12. THEME & SOUND TOGGLES
    // ==========================================
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        state.data.settings.theme = theme;
        saveDataToStorage();
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    function toggleSound() {
        state.soundEnabled = !state.soundEnabled;
        state.data.settings.sound = state.soundEnabled;
        saveDataToStorage();

        const iconEl = document.getElementById('sound-icon');
        if (iconEl) iconEl.textContent = state.soundEnabled ? '🔔' : '🔕';
        showToast(state.soundEnabled ? 'تم تفعيل الأصوات 🔔' : 'تم كتم الأصوات 🔕');
    }

    // ==========================================
    // 13. EVENT LISTENERS INITIALIZATION
    // ==========================================
    function initEventListeners() {
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                switchTab(target);
            });
        });

        // Day navigation
        document.getElementById('prev-day-btn').addEventListener('click', () => changeViewingDateByOffset(-1));
        document.getElementById('next-day-btn').addEventListener('click', () => changeViewingDateByOffset(1));
        document.getElementById('jump-today-btn').addEventListener('click', () => {
            state.currentViewingDate = getTodayString();
            renderTodayView();
        });

        // Quick Day Actions
        document.getElementById('select-all-btn').addEventListener('click', selectAllTasksForCurrentDay);
        document.getElementById('reset-day-btn').addEventListener('click', resetCurrentDayTasks);

        // Month Navigation
        document.getElementById('prev-month-btn').addEventListener('click', () => changeViewingMonthByOffset(-1));
        document.getElementById('next-month-btn').addEventListener('click', () => changeViewingMonthByOffset(1));

        // Header Actions
        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('sound-toggle-btn').addEventListener('click', toggleSound);
        document.getElementById('backup-btn').addEventListener('click', openModal);

        // Modal Handlers
        document.getElementById('close-modal-btn').addEventListener('click', closeModal);
        document.getElementById('close-modal-footer-btn').addEventListener('click', closeModal);
        document.getElementById('export-data-btn').addEventListener('click', exportDataAsJSON);
        document.getElementById('import-data-file').addEventListener('change', handleImportJSON);
        document.getElementById('clear-all-data-btn').addEventListener('click', clearAllData);

        // Close modal on click outside
        document.getElementById('backup-modal').addEventListener('click', (e) => {
            if (e.target.id === 'backup-modal') closeModal();
        });

        // Escape key to close modal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // ==========================================
    // 14. APP BOOTSTRAP
    // ==========================================
    function initApp() {
        loadDataFromStorage();

        // Restore settings
        const savedTheme = state.data.settings.theme || 'light';
        applyTheme(savedTheme);

        state.soundEnabled = state.data.settings.sound !== false;
        const soundIcon = document.getElementById('sound-icon');
        if (soundIcon) soundIcon.textContent = state.soundEnabled ? '🔔' : '🔕';

        initEventListeners();

        // Initial Render
        renderTodayView();
        renderMonthSummary();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
