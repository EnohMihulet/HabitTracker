const { calcStreak, daysBetween } = require("../api/streak");

function daysFromToday(offsets) {
    const today = new Date();
    const toISO = d => new Date(d).toISOString().slice(0,10);
    return offsets.map(off => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        d.setUTCDate(d.getUTCDate() - off);
        return toISO(d);
    })
}

describe("daysBetween", () => {
    test("same day is 0", () => {
        const [a] = daysFromToday([0]);
        expect(daysBetween(a, a)).toBe(0);
    });

    test("yesterday vs today is 1", () => {
        const [today, yesterday] = daysFromToday([0, 1]);
        expect(daysBetween(today, yesterday)).toBe(1);
    });

    test("Week gap is 7", () => {
        const [today, nextWeek] = daysFromToday([0,7]);
        expect(daysBetween(today, nextWeek)).toBe(7);
    });
});

describe("calcStreak (daily)", () => {
    test("4 days in a row", () => {
        const dates = daysFromToday([0,1,2,3]);
        expect(calcStreak("daily", 7, dates)).toBe(4);
    });

    test("gap breaks streak", () => {
        const dates = daysFromToday([0,2,3]);
        expect(calcStreak("daily", 7, dates)).toBe(1);
    });
});

describe("calcStreak (weekly)", () => {

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2025-01-15T00:00:00Z")); // Tue
    });

    test("3 week streak (1 each week)", () => {
        const dates = daysFromToday([0,7,14]);
        expect(calcStreak("weekly", 1, dates)).toBe(3);
    });

    test("9 day gap breaks streak", () => {
        const dates = daysFromToday([0,10,14]);
        expect(calcStreak("weekly", 1, dates)).toBe(1);
    });

    test("multiple logs each week does not change streak", () => {
        const dates = daysFromToday([0,1,2,7,14]);
        expect(calcStreak("weekly", 1, dates)).toBe(3);
    });

    test("new week, less than 7 days between but still should have streak", () => {
        const dates = daysFromToday([0,2,5]);
        expect(calcStreak("weekly", 1, dates)).toBe(2);
    });

    afterAll(() => jest.useRealTimers());
});

describe("calcStreak (custom) - 3 week streaks", () => {

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2025-01-11T12:00:00Z")); // Sat
    });

    for (let i = 1; i <= 7; i++) {
        test(`${i} per week for 3 weeks`, () => {
            const baseOffsets = [0, 7, 14];
            const realOffsets = [...baseOffsets];
      
            for (let j = 1; j < i; j++) {
                realOffsets.push(baseOffsets[0] + j, baseOffsets[1] + j, baseOffsets[2] + j);
            }
      
            const dates = daysFromToday(realOffsets.sort((a, b) => a - b));
            expect(calcStreak("custom", i, dates)).toBe(3);
        });
    }

    afterAll(() => jest.useRealTimers());
});

describe("calcStreak (custom) - potential to continue streak", () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2025-01-15T00:00:00Z")); // Wed
    });

    test("week has potential, 1 days a week", () => {
        const dates = daysFromToday([7]);
        expect(calcStreak("custom", 1, dates)).toBe(1);
    }); 

    test("week has potential, 2 days a week", () => {
        const dates = daysFromToday([6,7]);
        expect(calcStreak("custom", 2, dates)).toBe(1);
    });

    test("week has potential, 3 days a week", () => {
        const dates = daysFromToday([0,7,8,9]);
        expect(calcStreak("custom", 3, dates)).toBe(1);
    });

    test("week has potential, 4 days a week", () => {
        const dates = daysFromToday([0,7,8,9,10]);
        expect(calcStreak("custom", 4, dates)).toBe(1);
    });

    test("week has potential, 5 day a week", () => {
        const dates = daysFromToday([0,1,6,7,8,9,10]);
        expect(calcStreak("custom", 5, dates)).toBe(1);
    });

    test("week has potential, 6 days a week", () => {
        const dates = daysFromToday([0,1,2,4,5,6,7,8,9]);
        expect(calcStreak("custom", 6, dates)).toBe(1);
    });

    test("week has potential, 7 days a week", () => {
        const dates = daysFromToday([0,1,2,3,4,5,6,7,8,9,10]);
        expect(calcStreak("custom", 7, dates)).toBe(1);
    });
    
    afterAll(() => jest.useRealTimers());
});