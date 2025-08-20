function toUTC(d) { return  new Date(d + "T00:00:00Z"); }

function daysBetween(a, b) { return Math.trunc((toUTC(a) - toUTC(b)) / 86400000); }

function startOfWeek(dStr) {
    const d = toUTC(dStr);
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - dow);
    return d.getTime();
}

function sameWeek(aStr, bStr) { return startOfWeek(aStr) === startOfWeek(bStr); }

function calcStreak(freqType, timesPerWeek, dateStringsDesc) {
    if (!dateStringsDesc || dateStringsDesc.length === 0) return 0;
    const len = dateStringsDesc.length;

    if (freqType === "daily") {
        let streak = 1;
        for (let i = 1; i < len; i++) {
            const prev = dateStringsDesc[i - 1];
            const curr = dateStringsDesc[i];
            if (daysBetween(prev, curr) === 1) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    } 
    else if (freqType === "weekly") {
        let streak = 1;
        const today = toUTC(new Date().toISOString().split("T")[0]);
        let dayOfWeek = today.getDay();

        const lastLog = dateStringsDesc[0];

        if (daysBetween(today, lastLog) > 7 + dayOfWeek) return 0;

        for (let i = 1; i < len; i++) {
            const curr = dateStringsDesc[i - 1];
            const currDayOfWeek = toUTC(curr).getDay();

            const next = dateStringsDesc[i];
            const nextDayOfWeek = toUTC(next).getDay()

            if (sameWeek(curr, next)) continue;
            if (daysBetween(curr, next) > 7 + dayOfWeek) return streak;
            streak++;
        }
        return streak;
    } 
    else if (freqType === "custom") {
        let daysThisWeek = 0;
        const today = new Date().toISOString().split("T")[0];
        const dayOfWeek = toUTC(today).getDay();
        let i = 0;
        
        while (i < len) {
            if (!sameWeek(today, dateStringsDesc[i])) break;
            daysThisWeek++;
            i++;
        }
        
        if (len === 1 && timesPerWeek === 1) {
            if (daysBetween(today, dateStringsDesc[0]) <= dayOfWeek + 7) return 1;
            else return 0;
        }
        if (daysBetween(today, dateStringsDesc[0]) > dayOfWeek + 7) return 0;

        const todayLogged = daysBetween(dateStringsDesc[0], today) === 0;
        
        let streak = daysThisWeek >= timesPerWeek ? 1 : 0;
        if (timesPerWeek - daysThisWeek < 6 - dayOfWeek || (timesPerWeek - daysThisWeek < 7 - dayOfWeek && todayLogged)) {
            let daysPassed = 0;
            for (; i < len; i++) {
                const prev = dateStringsDesc[i];
                const curr = dateStringsDesc[i + 1];
                daysThisWeek++;
                daysPassed += daysBetween(prev, curr);
    
                if (daysPassed < 7) continue;
    
                if (daysThisWeek >= timesPerWeek) {
                    streak++;
                } else {
                    return streak;
                }
    
                daysThisWeek = 1;
                daysPassed = 0;
            }
            return streak;
        }
        return 0;
    }
    return 0;
}

module.exports = { calcStreak, daysBetween, toUTC };